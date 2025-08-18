// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DeFiAdapter.sol";

/**
 * @title EscrowVault
 * @dev Manages USDT deposits, withdrawals, and yield distribution for thrift groups
 */
contract EscrowVault is Ownable, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GROUP_ROLE = keccak256("GROUP_ROLE");
    bytes32 public constant HARVESTER_ROLE = keccak256("HARVESTER_ROLE");
    
    // Events
    event Deposit(uint256 indexed groupId, address indexed member, uint256 amount);
    event Withdrawal(uint256 indexed groupId, address indexed member, uint256 amount);
    event YieldHarvested(uint256 indexed groupId, uint256 amount);
    event YieldDistributed(uint256 indexed groupId, uint256 totalAmount, uint256 memberCount);
    event StrategyChanged(address indexed oldStrategy, address indexed newStrategy);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    
    // State variables
    IERC20 public immutable usdtToken;
    DeFiAdapter public defiAdapter;
    address public treasuryAddress;
    
    // Group balances
    mapping(uint256 => uint256) public groupDeposits; // groupId => total deposits
    mapping(uint256 => uint256) public groupWithdrawals; // groupId => total withdrawals
    mapping(uint256 => uint256) public pendingPayouts; // groupId => pending payout amount
    mapping(uint256 => mapping(address => uint256)) public memberDeposits; // groupId => member => deposits
    
    // Yield tracking
    mapping(uint256 => uint256) public groupYieldEarned; // groupId => yield earned
    mapping(uint256 => uint256) public groupYieldDistributed; // groupId => yield distributed
    
    // Platform metrics
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;
    uint256 public totalYield;
    uint256 public totalPendingPayouts;
    uint256 public platformTreasury;
    
    // DeFi strategy
    uint256 public yieldStrategyBalance;
    uint256 public lastHarvestTime;
    
    constructor(
        address _usdtToken,
        address _treasuryAddress,
        address _defiAdapter,
        address _admin
    ) Ownable(msg.sender) {
        usdtToken = IERC20(_usdtToken);
        treasuryAddress = _treasuryAddress;
        defiAdapter = DeFiAdapter(_defiAdapter);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(HARVESTER_ROLE, _admin);
    }
    
    modifier onlyGroup() {
        require(hasRole(GROUP_ROLE, msg.sender), "EscrowVault: caller is not a group");
        _;
    }
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "EscrowVault: caller is not admin");
        _;
    }
    
    modifier onlyHarvester() {
        require(hasRole(HARVESTER_ROLE, msg.sender), "EscrowVault: caller is not harvester");
        _;
    }
    
    /**
     * @dev Add a group contract
     */
    function addGroup(address group) external onlyAdmin {
        _grantRole(GROUP_ROLE, group);
    }
    
    /**
     * @dev Set DeFi adapter
     */
    function setDeFiAdapter(address _defiAdapter) external onlyAdmin {
        address oldStrategy = address(defiAdapter);
        defiAdapter = DeFiAdapter(_defiAdapter);
        emit StrategyChanged(oldStrategy, _defiAdapter);
    }
    
    /**
     * @dev Set treasury address
     */
    function setTreasuryAddress(address _treasuryAddress) external onlyAdmin {
        address oldTreasury = treasuryAddress;
        treasuryAddress = _treasuryAddress;
        emit TreasuryUpdated(oldTreasury, _treasuryAddress);
    }
    
    /**
     * @dev Deposit USDT for a group
     * @param groupId Group identifier
     * @param member Member making the deposit
     * @param amount Amount to deposit
     */
    function deposit(uint256 groupId, address member, uint256 amount) external onlyGroup nonReentrant whenNotPaused {
        require(amount > 0, "EscrowVault: amount must be greater than 0");
        
        usdtToken.safeTransferFrom(member, address(this), amount);
        
        groupDeposits[groupId] += amount;
        memberDeposits[groupId][member] += amount;
        totalDeposits += amount;
        
        // Deploy to yield strategy if available
        if (address(defiAdapter) != address(0)) {
            uint256 deployAmount = amount / 2; // Deploy 50% to strategy
            if (deployAmount > 0) {
                usdtToken.safeTransfer(address(defiAdapter), deployAmount);
                defiAdapter.deposit(deployAmount);
                yieldStrategyBalance += deployAmount;
            }
        }
        
        emit Deposit(groupId, member, amount);
    }
    
    /**
     * @dev Withdraw USDT from a group
     * @param groupId Group identifier
     * @param member Member making the withdrawal
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 groupId, address member, uint256 amount) external onlyGroup nonReentrant whenNotPaused {
        require(amount > 0, "EscrowVault: amount must be greater than 0");
        require(getAvailableBalance(groupId) >= amount, "EscrowVault: insufficient balance");
        
        groupWithdrawals[groupId] += amount;
        totalWithdrawals += amount;
        
        // Check if we need to withdraw from strategy
        uint256 contractBalance = usdtToken.balanceOf(address(this)) - platformTreasury;
        if (contractBalance < amount && address(defiAdapter) != address(0)) {
            uint256 strategyWithdraw = amount - contractBalance;
            defiAdapter.withdraw(strategyWithdraw);
            yieldStrategyBalance -= strategyWithdraw;
        }
        
        usdtToken.safeTransfer(member, amount);
        
        emit Withdrawal(groupId, member, amount);
    }
    
    /**
     * @dev Process payout to member
     * @param groupId Group identifier
     * @param member Member receiving payout
     * @param amount Payout amount
     */
    function processPayout(uint256 groupId, address member, uint256 amount) external onlyGroup nonReentrant whenNotPaused {
        require(amount > 0, "EscrowVault: amount must be greater than 0");
        require(pendingPayouts[groupId] >= amount, "EscrowVault: insufficient pending payouts");
        
        pendingPayouts[groupId] -= amount;
        totalPendingPayouts -= amount;
        
        // Check if we need to withdraw from strategy
        uint256 contractBalance = usdtToken.balanceOf(address(this)) - platformTreasury;
        if (contractBalance < amount && address(defiAdapter) != address(0)) {
            uint256 strategyWithdraw = amount - contractBalance;
            defiAdapter.withdraw(strategyWithdraw);
            yieldStrategyBalance -= strategyWithdraw;
        }
        
        usdtToken.safeTransfer(member, amount);
        
        emit Withdrawal(groupId, member, amount);
    }
    
    /**
     * @dev Add pending payout for a group
     * @param groupId Group identifier
     * @param amount Amount to add to pending payouts
     */
    function addPendingPayout(uint256 groupId, uint256 amount) external onlyGroup {
        pendingPayouts[groupId] += amount;
        totalPendingPayouts += amount;
    }
    
    /**
     * @dev Harvest yield from DeFi strategy
     * @param groupId Group identifier
     */
    function harvestYield(uint256 groupId) external onlyHarvester nonReentrant {
        if (address(defiAdapter) != address(0)) {
            uint256 harvestedAmount = defiAdapter.harvest();
            
            if (harvestedAmount > 0) {
                groupYieldEarned[groupId] += harvestedAmount;
                totalYield += harvestedAmount;
                lastHarvestTime = block.timestamp;
                
                emit YieldHarvested(groupId, harvestedAmount);
            }
        }
    }
    
    /**
     * @dev Distribute yield to group members
     * @param groupId Group identifier
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts for each recipient
     */
    function distributeYield(
        uint256 groupId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyGroup nonReentrant {
        require(recipients.length == amounts.length, "EscrowVault: arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(groupYieldEarned[groupId] >= totalAmount, "EscrowVault: insufficient yield");
        
        groupYieldEarned[groupId] -= totalAmount;
        groupYieldDistributed[groupId] += totalAmount;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] > 0) {
                usdtToken.safeTransfer(recipients[i], amounts[i]);
            }
        }
        
        emit YieldDistributed(groupId, totalAmount, recipients.length);
    }
    
    /**
     * @dev Get group's available balance (excluding pending payouts)
     * @param groupId Group identifier
     */
    function getAvailableBalance(uint256 groupId) public view returns (uint256) {
        uint256 deposits = groupDeposits[groupId];
        uint256 withdrawals = groupWithdrawals[groupId];
        uint256 pending = pendingPayouts[groupId];
        
        if (deposits > withdrawals + pending) {
            return deposits - withdrawals - pending;
        }
        return 0;
    }
    
    /**
     * @dev Get group's total balance including yield
     * @param groupId Group identifier
     */
    function getTotalBalance(uint256 groupId) external view returns (uint256) {
        return getAvailableBalance(groupId) + groupYieldEarned[groupId];
    }
    
    /**
     * @dev Get yield information
     */
    function getYieldInfo() external view returns (
        uint256 strategyBalance,
        uint256 totalYieldEarned,
        uint256 lastHarvest
    ) {
        return (yieldStrategyBalance, totalYield, lastHarvestTime);
    }
    
    /**
     * @dev Get vault statistics
     */
    function getVaultStats() external view returns (
        uint256 totalDep,
        uint256 totalWith,
        uint256 totalYieldEarned,
        uint256 totalPending
    ) {
        return (totalDeposits, totalWithdrawals, totalYield, totalPendingPayouts);
    }
    
    /**
     * @dev Get available liquidity
     */
    function getAvailableLiquidity() external view returns (uint256) {
        return usdtToken.balanceOf(address(this)) - platformTreasury;
    }
    
    /**
     * @dev Emergency withdraw from yield strategy
     * @param groupId Group identifier
     * @param amount Amount to withdraw
     */
    function emergencyWithdrawFromStrategy(uint256 groupId, uint256 amount) external onlyAdmin {
        if (address(defiAdapter) != address(0)) {
            defiAdapter.emergencyWithdraw(amount);
            yieldStrategyBalance -= amount;
        }
    }
    
    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdtToken.balanceOf(address(this));
        if (balance > 0) {
            usdtToken.safeTransfer(owner(), balance);
        }
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
}