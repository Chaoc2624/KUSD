// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVault {
    /**
     * @dev Deposits assets into the vault for a specific user
     * @param user The user address
     * @param amount The amount to deposit
     */
    function deposit(address user, uint256 amount) external;

    /**
     * @dev Withdraws assets from the vault for a specific user
     * @param user The user address
     * @param shares The number of shares to withdraw
     * @return amount The amount of assets withdrawn
     */
    function withdraw(address user, uint256 shares) external returns (uint256 amount);

    /**
     * @dev Returns the total assets under management in the vault
     */
    function totalAssets() external view returns (uint256);

    /**
     * @dev Returns the share balance of a user
     * @param user The user address
     */
    function balanceOf(address user) external view returns (uint256);

    /**
     * @dev Harvests rewards and compounds them
     */
    function harvest() external;

    /**
     * @dev Returns the current share price in assets
     */
    function sharePrice() external view returns (uint256);

    /**
     * @dev Returns vault metadata
     */
    function getVaultInfo() external view returns (
        string memory name,
        string memory description,
        address asset,
        uint256 totalShares,
        uint256 totalAssets,
        uint256 apy
    );

    /**
     * @dev Emergency withdrawal function
     */
    function emergencyWithdraw(address user) external;

    /**
     * @dev Pauses the vault operations
     */
    function pause() external;

    /**
     * @dev Unpauses the vault operations
     */
    function unpause() external;
}