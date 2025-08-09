// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IThriftModel
 * @dev Shared interface for thrift model enums
 */
interface IThriftModel {
    enum ThriftModel {
        ROTATIONAL,    // Ajo/Esusu style
        FIXED_SAVINGS, // Fixed term savings
        EMERGENCY      // Emergency liquidity pool
    }
}