// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockAggregatorV3 {
    uint8 public decimals;
    int256 private _price;
    uint256 private _updatedAt;
    uint80 private _roundId;

    constructor(uint8 _decimals, int256 initialPrice) {
        decimals = _decimals;
        _price = initialPrice;
        _updatedAt = block.timestamp;
        _roundId = 1;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _roundId);
    }

    function setPrice(int256 newPrice) external {
        _price = newPrice;
        _updatedAt = block.timestamp;
        _roundId++;
    }

    function setUpdatedAt(uint256 timestamp) external {
        _updatedAt = timestamp;
    }
}