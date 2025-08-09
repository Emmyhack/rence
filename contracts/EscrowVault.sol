// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IHematTypes.sol";
import "./interfaces/IDeFiAdapter.sol";

/**
 * @title EscrowVault
 * @dev Manages USDT deposits, withdrawals, and yield generation for Hemat groups
 */
contract EscrowVault is ReentrancyGuard, Pausable, AccessControl, IHematTypes {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GROUP_ROLE = keccak256("GROUP_ROLE");
    bytes32 public constant HARVESTER_ROLE = keccak256("HARVESTER_ROLE");
    
    IERC20 public immutable usdtToken;
    IDeFiAdapter public defiAdapter;
    
    // Platform configuration
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint256 public constant LIQUIDITY_BUFFER_RATIO = 1000; // 10%
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Group balances and accounting
    mapping(uint256 => uint256) public groupBalance;
    mapping(uint256 => uint256) public pendingPayouts;
    mapping(uint256 => YieldInfo) public groupYieldInfo;
    mapping(uint256 => uint256) public yieldReserve;
    
    // Platform treasury
    uint256 public platformTreasury;
    uint256 public totalDeployedYield;
    address public treasuryAddress;
    
    // Events
    event Deposited(uint256 indexed groupId, address indexed member, uint256 amount);
    event PayoutExecuted(uint256 indexed groupId, address indexed recipient, uint256 amount);
    event YieldDeployed(uint256 indexed groupId, uint256 amount);
    event YieldWithdrawn(uint256 indexed groupId, uint256 amount);
    event PlatformFeeCollected(uint256 indexed groupId, uint256 amount);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event DeFiAdapterUpdated(address oldAdapter, address newAdapter);
    
    modifier onlyGroup() {
        require(hasRole(GROUP_ROLE, msg.sender), "EscrowVault: caller is not a group");
        _;
    }
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "EscrowVault: caller is not admin");
        _;
    }
    
    constructor(
        address _usdtToken,
        address _treasuryAddress,
        address _admin
    ) {
        require(_usdtToken != address(0), "EscrowVault: invalid USDT token");
        require(_treasuryAddress != address(0), "EscrowVault: invalid treasury");
        require(_admin != address(0), "EscrowVault: invalid admin");
        
        usdtToken = IERC20(_usdtToken);
        treasuryAddress = _treasuryAddress;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(HARVESTER_ROLE, _admin);
    }
    
    /**
     * @dev Deposit USDT for a group
     * @param groupId Group identifier
     * @param member Member making the deposit
     * @param amount Amount of USDT to deposit
     */
    function deposit(
        uint256 groupId,
        address member,
        uint256 amount
    ) external onlyGroup nonReentrant whenNotPaused {
        require(amount > 0, "EscrowVault: invalid amount");
        
        usdtToken.safeTransferFrom(member, address(this), amount);
        groupBalance[groupId] += amount;
        
        emit Deposited(groupId, member, amount);
        
        // Auto-deploy idle funds to yield strategy
        _deployIdleFunds(groupId);
    }
    
    /**
     * @dev Execute payout to group member
     * @param groupId Group identifier
     * @param recipient Recipient address
     * @param amount Gross payout amount (before fees)
     */
    function executePayout(
        uint256 groupId,
        address recipient,
        uint256 amount
    ) external onlyGroup nonReentrant whenNotPaused {
        require(recipient != address(0), "EscrowVault: invalid recipient");
        require(amount > 0, "EscrowVault: invalid amount");
        
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = amount - platformFee;
        
        require(groupBalance[groupId] >= amount, "EscrowVault: insufficient group balance");
        
        // Withdraw from yield strategy if needed
        uint256 liquidBalance = usdtToken.balanceOf(address(this)) - platformTreasury;
        if (liquidBalance < amount) {
            _withdrawFromYield(groupId, amount - liquidBalance);
        }
        
        groupBalance[groupId] -= amount;
        platformTreasury += platformFee;
        
        usdtToken.safeTransfer(recipient, netAmount);
        
        emit PayoutExecuted(groupId, recipient, netAmount);
        emit PlatformFeeCollected(groupId, platformFee);
    }
    
    /**
     * @dev Harvest yield from DeFi strategy
     * @param groupId Group identifier
     */
    function harvestYield(uint256 groupId) external nonReentrant whenNotPaused {
        require(
            hasRole(HARVESTER_ROLE, msg.sender) || hasRole(GROUP_ROLE, msg.sender),
            "EscrowVault: not authorized to harvest"
        );
        
        if (address(defiAdapter) == address(0)) return;
        
        uint256 harvestedAmount = defiAdapter.harvest();
        if (harvestedAmount > 0) {
            YieldInfo storage yieldInfo = groupYieldInfo[groupId];
            yieldInfo.totalHarvested += harvestedAmount;
            yieldInfo.lastHarvestAt = block.timestamp;
            
            // Distribute yield: 90% to group, 10% to platform
            uint256 platformShare = (harvestedAmount * 1000) / BPS_DENOMINATOR; // 10%
            uint256 groupShare = harvestedAmount - platformShare;
            
            yieldReserve[groupId] += groupShare;
            platformTreasury += platformShare;
            
            emit YieldHarvested(groupId, harvestedAmount);
        }
    }
    
    /**
     * @dev Distribute yield to group members
     * @param groupId Group identifier
     * @param recipients Array of recipient addresses
     * @param amounts Array of distribution amounts
     */
    function distributeYield(
        uint256 groupId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyGroup nonReentrant whenNotPaused {
        require(recipients.length == amounts.length, "EscrowVault: length mismatch");
        
        uint256 totalDistribution = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalDistribution += amounts[i];
        }
        
        require(yieldReserve[groupId] >= totalDistribution, "EscrowVault: insufficient yield reserve");
        
        yieldReserve[groupId] -= totalDistribution;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] > 0) {
                usdtToken.safeTransfer(recipients[i], amounts[i]);
            }
        }
    }
    
    /**
     * @dev Emergency withdraw from yield strategy
     * @param groupId Group identifier
     */
    function emergencyWithdrawYield(uint256 groupId) external onlyAdmin {
        if (address(defiAdapter) != address(0)) {
            uint256 withdrawn = defiAdapter.emergencyWithdraw();
            YieldInfo storage yieldInfo = groupYieldInfo[groupId];
            yieldInfo.totalDeposited = 0;
            totalDeployedYield -= yieldInfo.totalDeposited;
            
            emit YieldWithdrawn(groupId, withdrawn);
        }
    }
    
    /**
     * @dev Collect platform fees to treasury
     */
    function collectPlatformFees() external onlyAdmin {
        uint256 amount = platformTreasury;
        require(amount > 0, "EscrowVault: no fees to collect");
        
        platformTreasury = 0;
        usdtToken.safeTransfer(treasuryAddress, amount);
    }
    
    /**
     * @dev Deploy idle funds to yield strategy
     * @param groupId Group identifier
     */
    function _deployIdleFunds(uint256 groupId) internal {
        if (address(defiAdapter) == address(0)) return;
        
        uint256 totalBalance = groupBalance[groupId];
        uint256 reservedForPayouts = pendingPayouts[groupId];
        uint256 liquidityBuffer = (totalBalance * LIQUIDITY_BUFFER_RATIO) / BPS_DENOMINATOR;
        
        if (totalBalance > reservedForPayouts + liquidityBuffer) {
            uint256 deployableAmount = totalBalance - reservedForPayouts - liquidityBuffer;
            uint256 currentLiquidity = usdtToken.balanceOf(address(this)) - platformTreasury;
            
            if (currentLiquidity >= deployableAmount) {
                usdtToken.safeTransfer(address(defiAdapter), deployableAmount);
                
                if (defiAdapter.deposit(deployableAmount)) {
                    YieldInfo storage yieldInfo = groupYieldInfo[groupId];
                    yieldInfo.totalDeposited += deployableAmount;
                    totalDeployedYield += deployableAmount;
                    
                    emit YieldDeployed(groupId, deployableAmount);
                }
            }
        }
    }
    
    /**
     * @dev Withdraw from yield strategy
     * @param groupId Group identifier
     * @param amount Amount to withdraw
     */
    function _withdrawFromYield(uint256 groupId, uint256 amount) internal {
        if (address(defiAdapter) == address(0)) return;
        
        YieldInfo storage yieldInfo = groupYieldInfo[groupId];
        if (yieldInfo.totalDeposited >= amount) {
            if (defiAdapter.withdraw(amount)) {
                yieldInfo.totalDeposited -= amount;
                totalDeployedYield -= amount;
                
                emit YieldWithdrawn(groupId, amount);
            }
        }
    }
    
    // Admin functions
    function setDeFiAdapter(address _adapter) external onlyAdmin {
        address oldAdapter = address(defiAdapter);
        defiAdapter = IDeFiAdapter(_adapter);
        emit DeFiAdapterUpdated(oldAdapter, _adapter);
    }
    
    function setTreasuryAddress(address _treasury) external onlyAdmin {
        require(_treasury != address(0), "EscrowVault: invalid treasury");
        address oldTreasury = treasuryAddress;
        treasuryAddress = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
    
    function setPendingPayouts(uint256 groupId, uint256 amount) external onlyGroup {
        pendingPayouts[groupId] = amount;
    }
    
    function pause() external onlyAdmin {
        _pause();
    }
    
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    // View functions
    function getGroupBalance(uint256 groupId) external view returns (uint256) {
        return groupBalance[groupId];
    }
    
    function getYieldInfo(uint256 groupId) external view returns (YieldInfo memory) {
        return groupYieldInfo[groupId];
    }
    
    function getAvailableLiquidity() external view returns (uint256) {
        return usdtToken.balanceOf(address(this)) - platformTreasury;
    }
}