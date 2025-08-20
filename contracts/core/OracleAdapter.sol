// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IAggregatorV3 {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function decimals() external view returns (uint8);
}

contract OracleAdapter is AccessControl, Pausable {
    bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN_ROLE");

    struct PriceFeed {
        IAggregatorV3 feed;
        uint8 tokenDecimals;
        uint256 maxStaleness;
        bool isActive;
    }

    mapping(address => PriceFeed) public priceFeeds;
    uint256 public constant PRICE_DECIMALS = 18;

    event PriceFeedUpdated(
        address indexed token,
        address indexed feed,
        uint8 tokenDecimals,
        uint256 maxStaleness
    );
    event PriceFeedRemoved(address indexed token);
    event StalePrice(address indexed token, uint256 lastUpdate);

    error TokenNotSupported(address token);
    error InvalidPrice(address token, int256 price);
    error StalePrice(address token, uint256 lastUpdate, uint256 maxStaleness);
    error InvalidFeed(address feed);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ADMIN_ROLE, admin);
    }

    function setPriceFeed(
        address token,
        address feed,
        uint8 tokenDecimals,
        uint256 maxStaleness
    ) external onlyRole(ORACLE_ADMIN_ROLE) {
        if (feed == address(0)) revert InvalidFeed(feed);
        
        priceFeeds[token] = PriceFeed({
            feed: IAggregatorV3(feed),
            tokenDecimals: tokenDecimals,
            maxStaleness: maxStaleness,
            isActive: true
        });

        emit PriceFeedUpdated(token, feed, tokenDecimals, maxStaleness);
    }

    function removePriceFeed(address token) external onlyRole(ORACLE_ADMIN_ROLE) {
        delete priceFeeds[token];
        emit PriceFeedRemoved(token);
    }

    function getPrice(address token) public view returns (uint256) {
        PriceFeed memory feed = priceFeeds[token];
        if (!feed.isActive) revert TokenNotSupported(token);

        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.feed.latestRoundData();

        if (price <= 0) revert InvalidPrice(token, price);
        if (block.timestamp - updatedAt > feed.maxStaleness) {
            revert StalePrice(token, updatedAt, feed.maxStaleness);
        }

        uint8 feedDecimals = feed.feed.decimals();
        
        // Convert to 18 decimals
        if (feedDecimals < PRICE_DECIMALS) {
            return uint256(price) * (10 ** (PRICE_DECIMALS - feedDecimals));
        } else if (feedDecimals > PRICE_DECIMALS) {
            return uint256(price) / (10 ** (feedDecimals - PRICE_DECIMALS));
        }
        
        return uint256(price);
    }

    function tokenToUsd(address token, uint256 amount) external view returns (uint256) {
        PriceFeed memory feed = priceFeeds[token];
        uint256 price = getPrice(token);
        
        // Normalize token amount to 18 decimals
        uint256 normalizedAmount;
        if (feed.tokenDecimals < 18) {
            normalizedAmount = amount * (10 ** (18 - feed.tokenDecimals));
        } else if (feed.tokenDecimals > 18) {
            normalizedAmount = amount / (10 ** (feed.tokenDecimals - 18));
        } else {
            normalizedAmount = amount;
        }

        return (normalizedAmount * price) / (10 ** PRICE_DECIMALS);
    }

    function usdToToken(address token, uint256 usdAmount) external view returns (uint256) {
        PriceFeed memory feed = priceFeeds[token];
        uint256 price = getPrice(token);
        
        // Calculate token amount in 18 decimals
        uint256 tokenAmount18 = (usdAmount * (10 ** PRICE_DECIMALS)) / price;
        
        // Convert to actual token decimals
        if (feed.tokenDecimals < 18) {
            return tokenAmount18 / (10 ** (18 - feed.tokenDecimals));
        } else if (feed.tokenDecimals > 18) {
            return tokenAmount18 * (10 ** (feed.tokenDecimals - 18));
        }
        
        return tokenAmount18;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}