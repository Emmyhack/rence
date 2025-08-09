// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDeFiAdapter
 * @dev Interface for DeFi yield strategies integration
 */
interface IDeFiAdapter {
    /**
     * @dev Deposit USDT to yield strategy
     * @param amount Amount of USDT to deposit
     * @return success Whether deposit was successful
     */
    function deposit(uint256 amount) external returns (bool success);
    
    /**
     * @dev Withdraw USDT from yield strategy
     * @param amount Amount of USDT to withdraw
     * @return success Whether withdrawal was successful
     */
    function withdraw(uint256 amount) external returns (bool success);
    
    /**
     * @dev Harvest accumulated yield
     * @return harvestedAmount Amount of yield harvested
     */
    function harvest() external returns (uint256 harvestedAmount);
    
    /**
     * @dev Get current balance in strategy
     * @return balance Current balance including principal and yield
     */
    function strategyBalance() external view returns (uint256 balance);
    
    /**
     * @dev Get pending yield amount
     * @return pendingYield Amount of yield that can be harvested
     */
    function pendingYield() external view returns (uint256 pendingYield);
    
    /**
     * @dev Get strategy APY (in basis points)
     * @return apy Current annual percentage yield
     */
    function getAPY() external view returns (uint256 apy);
    
    /**
     * @dev Emergency withdraw all funds
     * @return withdrawnAmount Total amount withdrawn
     */
    function emergencyWithdraw() external returns (uint256 withdrawnAmount);
    
    /**
     * @dev Check if strategy is healthy
     * @return isHealthy Whether strategy is operating normally
     */
    function isHealthy() external view returns (bool isHealthy);
    
    // Events
    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event YieldHarvested(uint256 amount);
    event EmergencyWithdrawal(uint256 amount);
}