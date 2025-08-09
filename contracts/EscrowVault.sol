// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DeFiAdapter.sol";

/**
 * @title EscrowVault
 * @dev Manages USDT deposits, withdrawals, and yield distribution for thrift groups
 */
contract EscrowVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Events
    event Deposit(address indexed group, address indexed member, uint256 amount);
    event Withdrawal(address indexed group, address indexed member, uint256 amount);
    event YieldDistributed(address indexed group, uint256 amount);
    event YieldHarvested(uint256 amount);
    event DeFiAdapterUpdated(address indexed oldAdapter, address indexed newAdapter);
    
    // State variables
    IERC20 public immutable usdt;
    DeFiAdapter public defiAdapter;
    
    // Group accounting
    mapping(address => uint256) public groupBalances;
    mapping(address => uint256) public groupYieldReserves;
    mapping(address => uint256) public pendingPayouts;
    
    // Global accounting
    uint256 public totalDeposits;
    uint256 public totalYieldReserve;
    uint256 public totalPendingPayouts;
    
    // Configuration
    uint256 public constant LIQUIDITY_BUFFER_RATIO = 1000; // 10% in basis points
    uint256 public constant YIELD_TO_INSURANCE_RATIO = 200; // 2% to insurance pool
    uint256 public constant YIELD_TO_MEMBERS_RATIO = 800; // 80% to members (8% of 10%)
    
    // Contract addresses
    address public insurancePool;
    
    // Modifiers
    modifier onlyGroup() {
        require(isGroup(msg.sender), "Only groups can call this function");
        _;
    }
    
    modifier onlyGroupOrOwner() {
        require(isGroup(msg.sender) || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor(
        address _usdt,
        address _defiAdapter,
        address _insurancePool
    ) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
        defiAdapter = DeFiAdapter(_defiAdapter);
        insurancePool = _insurancePool;
    }
    
    /**
     * @dev Deposit USDT for a group
     */
    function deposit(address group, address member, uint256 amount) external onlyGroup nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        groupBalances[group] += amount;
        totalDeposits += amount;
        
        emit Deposit(group, member, amount);
        
        // Deploy idle funds to DeFi
        _deployIdleFunds();
    }
    
    /**
     * @dev Withdraw USDT for a group payout
     */
    function withdraw(address group, address member, uint256 amount) external onlyGroup nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(groupBalances[group] >= amount, "Insufficient group balance");
        
        groupBalances[group] -= amount;
        totalDeposits -= amount;
        
        // Withdraw from DeFi if needed
        _withdrawFromDeFi(amount);
        
        require(usdt.transfer(member, amount), "Transfer failed");
        
        emit Withdrawal(group, member, amount);
    }
    
    /**
     * @dev Add pending payout for a group
     */
    function addPendingPayout(address group, uint256 amount) external onlyGroup {
        pendingPayouts[group] += amount;
        totalPendingPayouts += amount;
    }
    
    /**
     * @dev Remove pending payout for a group
     */
    function removePendingPayout(address group, uint256 amount) external onlyGroup {
        require(pendingPayouts[group] >= amount, "Insufficient pending payout");
        pendingPayouts[group] -= amount;
        totalPendingPayouts -= amount;
    }
    
    /**
     * @dev Distribute yield to group members
     */
    function distributeYield(address group, uint256 amount) external onlyGroup {
        require(amount > 0, "Amount must be greater than 0");
        require(groupYieldReserves[group] >= amount, "Insufficient yield reserve");
        
        groupYieldReserves[group] -= amount;
        totalYieldReserve -= amount;
        
        emit YieldDistributed(group, amount);
    }
    
    /**
     * @dev Harvest yield from DeFi adapter
     */
    function harvestYield() external onlyGroupOrOwner {
        uint256 harvestedAmount = defiAdapter.harvest();
        if (harvestedAmount > 0) {
            totalYieldReserve += harvestedAmount;
            
            // Distribute yield: 80% to members, 20% to insurance
            uint256 toMembers = (harvestedAmount * YIELD_TO_MEMBERS_RATIO) / 1000;
            uint256 toInsurance = (harvestedAmount * YIELD_TO_INSURANCE_RATIO) / 1000;
            
            // Transfer to insurance pool
            if (toInsurance > 0) {
                require(usdt.transfer(insurancePool, toInsurance), "Insurance transfer failed");
            }
            
            // Add to yield reserve for member distribution
            totalYieldReserve += toMembers;
            
            emit YieldHarvested(harvestedAmount);
        }
    }
    
    /**
     * @dev Get group's available balance (excluding pending payouts)
     */
    function getGroupAvailableBalance(address group) external view returns (uint256) {
        uint256 balance = groupBalances[group];
        uint256 pending = pendingPayouts[group];
        return balance > pending ? balance - pending : 0;
    }
    
    /**
     * @dev Get group's total balance including yield
     */
    function getGroupTotalBalance(address group) external view returns (uint256) {
        return groupBalances[group] + groupYieldReserves[group];
    }
    
    /**
     * @dev Get idle funds available for DeFi deployment
     */
    function getIdleFunds() external view returns (uint256) {
        uint256 totalBalance = usdt.balanceOf(address(this));
        uint256 buffer = (totalBalance * LIQUIDITY_BUFFER_RATIO) / 10000;
        return totalBalance > buffer ? totalBalance - buffer : 0;
    }
    
    /**
     * @dev Update DeFi adapter (only owner)
     */
    function updateDeFiAdapter(address newAdapter) external onlyOwner {
        require(newAdapter != address(0), "Invalid adapter address");
        address oldAdapter = address(defiAdapter);
        defiAdapter = DeFiAdapter(newAdapter);
        emit DeFiAdapterUpdated(oldAdapter, newAdapter);
    }
    
    /**
     * @dev Emergency withdraw all funds (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdt.balanceOf(address(this));
        if (balance > 0) {
            require(usdt.transfer(owner(), balance), "Emergency transfer failed");
        }
    }
    
    /**
     * @dev Pause vault (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause vault (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Deploy idle funds to DeFi
     */
    function _deployIdleFunds() internal {
        uint256 idleFunds = _getIdleFunds();
        if (idleFunds > 0) {
            defiAdapter.deposit(idleFunds);
        }
    }
    
    /**
     * @dev Withdraw funds from DeFi if needed
     */
    function _withdrawFromDeFi(uint256 amount) internal {
        uint256 vaultBalance = usdt.balanceOf(address(this));
        if (vaultBalance < amount) {
            uint256 needed = amount - vaultBalance;
            defiAdapter.withdraw(needed);
        }
    }
    
    /**
     * @dev Get idle funds for DeFi deployment
     */
    function _getIdleFunds() internal view returns (uint256) {
        uint256 totalBalance = usdt.balanceOf(address(this));
        uint256 buffer = (totalBalance * LIQUIDITY_BUFFER_RATIO) / 10000;
        return totalBalance > buffer ? totalBalance - buffer : 0;
    }
    
    /**
     * @dev Check if address is a registered group
     */
    function isGroup(address group) internal view returns (bool) {
        // This would be implemented with a mapping from factory
        // For now, we'll use a simple check
        return group != address(0);
    }
}