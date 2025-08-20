// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../vaults/IVault.sol";

contract MockVault is IVault, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");

    IERC20 public asset;
    uint256 public totalShares;
    uint256 private _totalAssets;
    mapping(address => uint256) private shares;

    constructor(address _asset) {
        asset = IERC20(_asset);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function deposit(address user, uint256 amount) external override onlyRole(VAULT_MANAGER_ROLE) {
        asset.safeTransferFrom(msg.sender, address(this), amount);
        shares[user] += amount;
        totalShares += amount;
        _totalAssets += amount;
    }

    function withdraw(address user, uint256 sharesToBurn) external override onlyRole(VAULT_MANAGER_ROLE) returns (uint256) {
        require(shares[user] >= sharesToBurn, "Insufficient shares");
        
        shares[user] -= sharesToBurn;
        totalShares -= sharesToBurn;
        _totalAssets -= sharesToBurn;
        
        asset.safeTransfer(msg.sender, sharesToBurn);
        return sharesToBurn;
    }

    function totalAssets() external view override returns (uint256) {
        return _totalAssets;
    }

    function balanceOf(address user) external view override returns (uint256) {
        return shares[user];
    }

    function harvest() external override {
        // Mock harvest - no actual logic needed for testing
    }

    function sharePrice() external view override returns (uint256) {
        if (totalShares == 0) return 1e18;
        return (_totalAssets * 1e18) / totalShares;
    }

    function getVaultInfo() external view override returns (
        string memory name,
        string memory description,
        address assetAddr,
        uint256 totalSharesOut,
        uint256 totalAssetsValue,
        uint256 apy
    ) {
        return (
            "Mock Vault",
            "Mock vault for testing",
            address(asset),
            totalShares,
            _totalAssets,
            500 // 5% APY
        );
    }

    function emergencyWithdraw(address user) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 userShares = shares[user];
        if (userShares > 0) {
            shares[user] = 0;
            totalShares -= userShares;
            asset.safeTransfer(user, userShares);
        }
    }

    function pause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        // Mock pause
    }

    function unpause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        // Mock unpause
    }

    // Test helper functions
    function setTotalAssets(uint256 amount) external {
        _totalAssets = amount;
    }
}