// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IVault.sol";

contract RWAVault is IVault, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    IERC20 public immutable asset; // KUSD token
    
    uint256 public totalShares;
    uint256 public totalAssetValue; // Total value of RWA holdings in USD
    uint256 public lastUpdateTime;
    uint256 public currentAPY; // Annual Percentage Yield in basis points
    
    mapping(address => uint256) private shares;
    
    // RWA asset tracking
    mapping(string => RWAAsset) public rwaAssets;
    string[] public assetIds;
    
    struct RWAAsset {
        uint256 value;          // Current USD value
        uint256 purchasePrice;  // Original purchase price
        uint256 yield;          // Accumulated yield
        bool isActive;
        string assetType;       // "real_estate", "commodities", "bonds", etc.
    }

    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 shares, uint256 amount);
    event RWAAssetAdded(string indexed assetId, uint256 value, string assetType);
    event RWAAssetUpdated(string indexed assetId, uint256 oldValue, uint256 newValue);
    event YieldGenerated(uint256 totalYield);
    event APYUpdated(uint256 newAPY);

    error InsufficientShares();
    error InvalidAmount();
    error AssetNotFound();
    error AssetAlreadyExists();

    constructor(
        address _asset,
        address admin,
        string memory _name
    ) {
        asset = IERC20(_asset);
        lastUpdateTime = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VAULT_MANAGER_ROLE, admin);
        _grantRole(ASSET_MANAGER_ROLE, admin);
    }

    function deposit(address user, uint256 amount) 
        external 
        override 
        onlyRole(VAULT_MANAGER_ROLE)
        nonReentrant 
        whenNotPaused 
    {
        if (amount == 0) revert InvalidAmount();
        
        _updateYield();
        
        uint256 sharesToMint;
        if (totalShares == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalShares) / totalAssets();
        }
        
        shares[user] += sharesToMint;
        totalShares += sharesToMint;
        
        asset.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposit(user, amount, sharesToMint);
    }

    function withdraw(address user, uint256 sharesToBurn) 
        external 
        override 
        onlyRole(VAULT_MANAGER_ROLE)
        nonReentrant 
        whenNotPaused 
        returns (uint256 amount)
    {
        if (sharesToBurn == 0) revert InvalidAmount();
        if (shares[user] < sharesToBurn) revert InsufficientShares();
        
        _updateYield();
        
        amount = (sharesToBurn * totalAssets()) / totalShares;
        
        shares[user] -= sharesToBurn;
        totalShares -= sharesToBurn;
        
        // For RWA vault, we might need to liquidate some RWA positions
        // This is simplified - in practice would need more complex logic
        uint256 availableKusd = asset.balanceOf(address(this));
        if (availableKusd < amount) {
            // Would trigger RWA liquidation process here
            amount = availableKusd;
        }
        
        asset.safeTransfer(msg.sender, amount);
        
        emit Withdraw(user, sharesToBurn, amount);
    }

    function totalAssets() public view override returns (uint256) {
        return asset.balanceOf(address(this)) + totalAssetValue;
    }

    function balanceOf(address user) external view override returns (uint256) {
        return shares[user];
    }

    function harvest() external override onlyRole(ASSET_MANAGER_ROLE) {
        _updateYield();
    }

    function sharePrice() external view override returns (uint256) {
        if (totalShares == 0) return 1e18;
        return (totalAssets() * 1e18) / totalShares;
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
            "RWA Vault",
            "Real World Assets yield vault with diversified RWA exposure",
            address(asset),
            totalShares,
            totalAssets(),
            currentAPY
        );
    }

    // RWA specific functions
    function addRWAAsset(
        string calldata assetId,
        uint256 value,
        string calldata assetType
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        if (rwaAssets[assetId].isActive) revert AssetAlreadyExists();
        
        rwaAssets[assetId] = RWAAsset({
            value: value,
            purchasePrice: value,
            yield: 0,
            isActive: true,
            assetType: assetType
        });
        
        assetIds.push(assetId);
        totalAssetValue += value;
        
        emit RWAAssetAdded(assetId, value, assetType);
    }

    function updateRWAAssetValue(
        string calldata assetId,
        uint256 newValue
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        RWAAsset storage rwaAsset = rwaAssets[assetId];
        if (!rwaAsset.isActive) revert AssetNotFound();
        
        uint256 oldValue = rwaAsset.value;
        
        // Update yield if value increased
        if (newValue > rwaAsset.value) {
            rwaAsset.yield += (newValue - rwaAsset.value);
        }
        
        totalAssetValue = totalAssetValue - oldValue + newValue;
        rwaAsset.value = newValue;
        
        emit RWAAssetUpdated(assetId, oldValue, newValue);
    }

    function _updateYield() private {
        uint256 timeDelta = block.timestamp - lastUpdateTime;
        if (timeDelta == 0 || totalAssetValue == 0) {
            lastUpdateTime = block.timestamp;
            return;
        }
        
        // Generate yield based on APY (simplified calculation)
        uint256 yieldGenerated = (totalAssetValue * currentAPY * timeDelta) / 
                                (10000 * 365 days);
        
        if (yieldGenerated > 0) {
            totalAssetValue += yieldGenerated;
            emit YieldGenerated(yieldGenerated);
        }
        
        lastUpdateTime = block.timestamp;
    }

    function setAPY(uint256 newAPY) external onlyRole(ASSET_MANAGER_ROLE) {
        require(newAPY <= 5000, "APY too high"); // Max 50%
        currentAPY = newAPY;
        emit APYUpdated(newAPY);
    }

    function getRWAAsset(string calldata assetId) 
        external 
        view 
        returns (RWAAsset memory) 
    {
        return rwaAssets[assetId];
    }

    function getAssetCount() external view returns (uint256) {
        return assetIds.length;
    }

    function emergencyWithdraw(address user) 
        external 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        uint256 userShares = shares[user];
        if (userShares == 0) return;
        
        uint256 amount = (userShares * asset.balanceOf(address(this))) / totalShares;
        
        shares[user] = 0;
        totalShares -= userShares;
        
        if (amount > 0) {
            asset.safeTransfer(user, amount);
        }
    }

    function pause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}