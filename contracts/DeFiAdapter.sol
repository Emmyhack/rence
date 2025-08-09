// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeFiAdapter
 * @dev Abstract interface for DeFi yield protocol integration
 */
interface DeFiAdapter {
    
    /**
     * @dev Deposit USDT into the yield protocol
     * @param amount Amount of USDT to deposit
     */
    function deposit(uint256 amount) external;
    
    /**
     * @dev Withdraw USDT from the yield protocol
     * @param amount Amount of USDT to withdraw
     */
    function withdraw(uint256 amount) external;
    
    /**
     * @dev Harvest accumulated yield
     * @return harvestedAmount Amount of USDT harvested
     */
    function harvest() external returns (uint256 harvestedAmount);
    
    /**
     * @dev Get current strategy balance
     * @return balance Current USDT balance in the strategy
     */
    function strategyBalance() external view returns (uint256 balance);
    
    /**
     * @dev Get current APY of the strategy
     * @return apy Current APY in basis points
     */
    function getAPY() external view returns (uint256 apy);
    
    /**
     * @dev Get total value locked in the strategy
     * @return tvl Total value locked in USDT
     */
    function getTVL() external view returns (uint256 tvl);
    
    /**
     * @dev Emergency withdraw all funds
     */
    function emergencyWithdraw() external;
}