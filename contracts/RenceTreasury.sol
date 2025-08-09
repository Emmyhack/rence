// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";

contract RenceTreasury {
    address public admin;
    IERC20 public usdt;
    uint256 public totalFeesCollected;
    mapping(address => bool) public authorizedGroups;
    mapping(address => uint256) public groupFeesCollected;
    mapping(address => bool) public groupBonusClaimed;

    event FeeReceived(address indexed from, uint256 amount);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event GroupAuthorized(address indexed group, bool authorized);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyAuthorizedGroup() {
        require(authorizedGroups[msg.sender], "Not authorized group");
        _;
    }

    constructor(address _usdt) {
        admin = msg.sender;
        usdt = IERC20(_usdt);
    }

    function authorizeGroup(address group, bool authorized) external onlyAdmin {
        authorizedGroups[group] = authorized;
        emit GroupAuthorized(group, authorized);
    }

    function receiveFee(uint256 amount) external onlyAuthorizedGroup {
        require(usdt.transferFrom(msg.sender, address(this), amount), "USDT transfer failed");
        totalFeesCollected += amount;
        groupFeesCollected[msg.sender] += amount;
        emit FeeReceived(msg.sender, amount);
    }

    function withdrawFees(address to, uint256 amount) external onlyAdmin {
        require(usdt.balanceOf(address(this)) >= amount, "Insufficient balance");
        require(usdt.transfer(to, amount), "USDT transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    // Group creator claims 5% of fees after group is dissolved
    function claimGroupBonus(address group, address creator) external {
        require(authorizedGroups[group], "Not an authorized group");
        require(!groupBonusClaimed[group], "Bonus already claimed");
        uint256 bonus = (groupFeesCollected[group] * 5) / 100;
        require(bonus > 0, "No bonus available");
        groupBonusClaimed[group] = true;
        require(usdt.transfer(creator, bonus), "USDT transfer failed");
    }

    // Additional logic for distributing fees to group creators, etc., can be added here
} 