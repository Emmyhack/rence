// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDeFiAdapter.sol";

/**
 * @title MockDeFiAdapter
 * @dev Mock DeFi adapter for testing and demonstration purposes
 * Simulates yield generation at a fixed APY
 */
contract MockDeFiAdapter is IDeFiAdapter, Ownable {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable usdtToken;
    
    uint256 public constant FIXED_APY_BPS = 800; // 8% APY
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    uint256 public totalDeposited;
    uint256 public lastHarvestTime;
    uint256 public accumulatedYield;
    
    bool public isStrategyHealthy = true;
    
    event MockYieldGenerated(uint256 amount, uint256 timestamp);
    event StrategyHealthChanged(bool healthy);
    
    constructor(address _usdtToken) {
        require(_usdtToken != address(0), "MockDeFiAdapter: invalid USDT token");
        usdtToken = IERC20(_usdtToken);
        lastHarvestTime = block.timestamp;
    }
    
    /**
     * @dev Deposit USDT to yield strategy
     * @param amount Amount of USDT to deposit
     * @return success Whether deposit was successful
     */
    function deposit(uint256 amount) external override returns (bool success) {
        require(amount > 0, "MockDeFiAdapter: invalid amount");
        require(isStrategyHealthy, "MockDeFiAdapter: strategy unhealthy");
        
        usdtToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Generate any pending yield before updating balance
        _generateYield();
        
        totalDeposited += amount;
        
        emit Deposited(amount);
        return true;
    }
    
    /**
     * @dev Withdraw USDT from yield strategy
     * @param amount Amount of USDT to withdraw
     * @return success Whether withdrawal was successful
     */
    function withdraw(uint256 amount) external override returns (bool success) {
        require(amount > 0, "MockDeFiAdapter: invalid amount");
        require(totalDeposited >= amount, "MockDeFiAdapter: insufficient balance");
        
        // Generate any pending yield before withdrawal
        _generateYield();
        
        totalDeposited -= amount;
        usdtToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(amount);
        return true;
    }
    
    /**
     * @dev Harvest accumulated yield
     * @return harvestedAmount Amount of yield harvested
     */
    function harvest() external override returns (uint256 harvestedAmount) {
        _generateYield();
        
        harvestedAmount = accumulatedYield;
        if (harvestedAmount > 0) {
            accumulatedYield = 0;
            usdtToken.safeTransfer(msg.sender, harvestedAmount);
            
            emit YieldHarvested(harvestedAmount);
        }
        
        return harvestedAmount;
    }
    
    /**
     * @dev Get current balance in strategy
     * @return balance Current balance including principal and yield
     */
    function strategyBalance() external view override returns (uint256 balance) {
        uint256 currentPendingYield = _calculatePendingYield();
        return totalDeposited + accumulatedYield + currentPendingYield;
    }
    
    /**
     * @dev Get pending yield amount
     * @return pendingYield Amount of yield that can be harvested
     */
    function pendingYield() external view override returns (uint256) {
        return _calculatePendingYield() + accumulatedYield;
    }
    
    /**
     * @dev Get strategy APY (in basis points)
     * @return apy Current annual percentage yield
     */
    function getAPY() external pure override returns (uint256 apy) {
        return FIXED_APY_BPS;
    }
    
    /**
     * @dev Emergency withdraw all funds
     * @return withdrawnAmount Total amount withdrawn
     */
    function emergencyWithdraw() external override onlyOwner returns (uint256 withdrawnAmount) {
        _generateYield();
        
        withdrawnAmount = totalDeposited + accumulatedYield;
        
        if (withdrawnAmount > 0) {
            totalDeposited = 0;
            accumulatedYield = 0;
            
            usdtToken.safeTransfer(msg.sender, withdrawnAmount);
            emit EmergencyWithdrawal(withdrawnAmount);
        }
        
        return withdrawnAmount;
    }
    
    /**
     * @dev Check if strategy is healthy
     * @return isHealthy Whether strategy is operating normally
     */
    function isHealthy() external view override returns (bool) {
        return isStrategyHealthy;
    }
    
    /**
     * @dev Generate yield based on time elapsed
     */
    function _generateYield() internal {
        if (totalDeposited == 0) {
            lastHarvestTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - lastHarvestTime;
        if (timeElapsed == 0) return;
        
        // Calculate yield: principal * APY * timeElapsed / secondsPerYear
        uint256 newYield = (totalDeposited * FIXED_APY_BPS * timeElapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
        
        if (newYield > 0) {
            accumulatedYield += newYield;
            emit MockYieldGenerated(newYield, block.timestamp);
        }
        
        lastHarvestTime = block.timestamp;
    }
    
    /**
     * @dev Calculate pending yield without updating state
     */
    function _calculatePendingYield() internal view returns (uint256) {
        if (totalDeposited == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - lastHarvestTime;
        return (totalDeposited * FIXED_APY_BPS * timeElapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
    }
    
    // Admin functions for testing
    function setStrategyHealth(bool _healthy) external onlyOwner {
        isStrategyHealthy = _healthy;
        emit StrategyHealthChanged(_healthy);
    }
    
    function simulateYieldBoost(uint256 extraYield) external onlyOwner {
        require(extraYield > 0, "MockDeFiAdapter: invalid yield amount");
        
        // Mint the extra yield (in a real adapter, this would come from the underlying protocol)
        accumulatedYield += extraYield;
        emit MockYieldGenerated(extraYield, block.timestamp);
    }
    
    // Emergency function to recover tokens (only for testing)
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}