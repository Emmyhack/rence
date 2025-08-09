   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.20;

   import "./IERC20.sol";

   contract MockUSDT is IERC20 {
       string public name = "Mock USDT";
       string public symbol = "USDT";
       uint8 public decimals = 6;
       uint256 public override totalSupply;
       mapping(address => uint256) public override balanceOf;
       mapping(address => mapping(address => uint256)) public override allowance;

       function transfer(address recipient, uint256 amount) public override returns (bool) {
           require(balanceOf[msg.sender] >= amount, "Insufficient");
           balanceOf[msg.sender] -= amount;
           balanceOf[recipient] += amount;
           emit Transfer(msg.sender, recipient, amount);
           return true;
       }

       function approve(address spender, uint256 amount) public override returns (bool) {
           allowance[msg.sender][spender] = amount;
           emit Approval(msg.sender, spender, amount);
           return true;
       }

       function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
           require(balanceOf[sender] >= amount, "Insufficient");
           require(allowance[sender][msg.sender] >= amount, "Not allowed");
           balanceOf[sender] -= amount;
           balanceOf[recipient] += amount;
           allowance[sender][msg.sender] -= amount;
           emit Transfer(sender, recipient, amount);
           return true;
       }

       function mint(address to, uint256 amount) public {
           balanceOf[to] += amount;
           totalSupply += amount;
           emit Transfer(address(0), to, amount);
       }
   }