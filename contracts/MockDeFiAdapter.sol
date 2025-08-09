// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DeFiAdapter.sol";

/**
 * @title MockDeFiAdapter
 * @dev Mock implementation of DeFiAdapter for testing
 */
contract MockDeFiAdapter is DeFiAdapter, Ownable {
    using SafeERC20 for IERC20;
    
    // Events
    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event YieldHarvested(uint256 amount);
    
    // State variables
    IERC20 public immutable usdt;
    uint256 public totalDeposited;
    uint256 public accumulatedYield;
    uint256 public constant MOCK_APY = 500; // 5% APY in basis points
    uint256 public lastHarvestTime;
    
    constructor(address _usdt) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
        lastHarvestTime = block.timestamp;
    }
    
    /**
     * @dev Deposit USDT into the mock strategy
     */
    function deposit(uint256 amount) external override {
        require(amount > 0, "Amount must be greater than 0");
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        totalDeposited += amount;
        emit Deposited(amount);
    }
    
    /**
     * @dev Withdraw USDT from the mock strategy
     */
    function withdraw(uint256 amount) external override {
        require(amount > 0, "Amount must be greater than 0");
        require(totalDeposited >= amount, "Insufficient balance");
        
        totalDeposited -= amount;
        require(usdt.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdrawn(amount);
    }
    
    /**
     * @dev Harvest accumulated yield
     */
    function harvest() external override returns (uint256 harvestedAmount) {
        if (totalDeposited == 0) {
            return 0;
        }
        
        // Calculate yield based on time elapsed and APY
        uint256 timeElapsed = block.timestamp - lastHarvestTime;
        uint256 annualYield = (totalDeposited * MOCK_APY) / 10000;
        harvestedAmount = (annualYield * timeElapsed) / 365 days;
        
        if (harvestedAmount > 0) {
            accumulatedYield += harvestedAmount;
            lastHarvestTime = block.timestamp;
            
            // Transfer harvested yield to caller
            require(usdt.transfer(msg.sender, harvestedAmount), "Yield transfer failed");
            emit YieldHarvested(harvestedAmount);
        }
        
        return harvestedAmount;
    }
    
    /**
     * @dev Get current strategy balance
     */
    function strategyBalance() external view override returns (uint256) {
        return totalDeposited;
    }
    
    /**
     * @dev Get current APY
     */
    function getAPY() external view override returns (uint256) {
        return MOCK_APY;
    }
    
    /**
     * @dev Get total value locked
     */
    function getTVL() external view override returns (uint256) {
        return totalDeposited;
    }
    
    /**
     * @dev Emergency withdraw all funds
     */
    function emergencyWithdraw() external override onlyOwner {
        uint256 balance = usdt.balanceOf(address(this));
        if (balance > 0) {
            require(usdt.transfer(owner(), balance), "Emergency transfer failed");
        }
        totalDeposited = 0;
        accumulatedYield = 0;
    }
    
    /**
     * @dev Set mock APY for testing (only owner)
     */
    function setMockAPY(uint256 newAPY) external onlyOwner {
        require(newAPY <= 2000, "APY cannot exceed 20%");
        // Update APY logic here if needed
    }
    
    /**
     * @dev Get accumulated yield
     */
    function getAccumulatedYield() external view returns (uint256) {
        return accumulatedYield;
    }
}