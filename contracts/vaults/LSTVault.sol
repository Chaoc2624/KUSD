// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IVault.sol";
import "../adapters/lido/LidoAdapter.sol";

contract LSTVault is IVault, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");

    IERC20 public immutable asset; // KUSD token
    LidoAdapter public immutable lidoAdapter;
    
    uint256 public totalShares;
    uint256 public lastRebaseTime;
    
    mapping(address => uint256) private shares;
    
    // Strategy allocation weights (basis points)
    uint256 public lidoWeight = 10000;  // 100% to Lido initially
    
    // Performance metrics
    uint256 public totalRewards;
    uint256 public totalDeposited;
    
    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 shares, uint256 amount);
    event Harvest(uint256 rewards);
    event Rebalance(uint256 lidoWeight);
    event RewardsCompounded(uint256 amount);

    error InsufficientShares();
    error InvalidAmount();
    error InvalidWeight();

    constructor(
        address _asset,
        address _lidoAdapter,
        address admin
    ) {
        asset = IERC20(_asset);
        lidoAdapter = LidoAdapter(_lidoAdapter);
        lastRebaseTime = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VAULT_MANAGER_ROLE, admin);
        _grantRole(REBALANCER_ROLE, admin);
    }

    function deposit(address user, uint256 amount) 
        external 
        override 
        onlyRole(VAULT_MANAGER_ROLE)
        nonReentrant 
        whenNotPaused 
    {
        if (amount == 0) revert InvalidAmount();
        
        uint256 sharesToMint;
        if (totalShares == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalShares) / totalAssets();
        }
        
        shares[user] += sharesToMint;
        totalShares += sharesToMint;
        totalDeposited += amount;
        
        asset.safeTransferFrom(msg.sender, address(this), amount);
        
        // Deploy to strategies immediately
        _deployFunds(amount);
        
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
        
        amount = (sharesToBurn * totalAssets()) / totalShares;
        
        shares[user] -= sharesToBurn;
        totalShares -= sharesToBurn;
        
        // Withdraw from strategies if needed
        uint256 availableKusd = asset.balanceOf(address(this));
        if (availableKusd < amount) {
            uint256 needed = amount - availableKusd;
            _withdrawFromStrategies(needed);
        }
        
        asset.safeTransfer(msg.sender, amount);
        
        emit Withdraw(user, sharesToBurn, amount);
    }

    function totalAssets() public view override returns (uint256) {
        return asset.balanceOf(address(this)) + _getStrategyAssets();
    }

    function balanceOf(address user) external view override returns (uint256) {
        return shares[user];
    }

    function harvest() external override nonReentrant {
        uint256 rewardsBefore = totalRewards;
        
        // Harvest from Lido
        uint256 lidoRewards = lidoAdapter.harvest();
        
        totalRewards += lidoRewards;
        
        emit Harvest(totalRewards - rewardsBefore);
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
        uint256 apy = _calculateAPY();
        return (
            "LST Vault",
            "Liquid Staking Token vault providing ETH staking yields",
            address(asset),
            totalShares,
            totalAssets(),
            apy
        );
    }

    function _deployFunds(uint256 amount) private {
        // Convert KUSD to ETH and deploy to Lido
        if (lidoWeight > 0) {
            uint256 lidoAmount = (amount * lidoWeight) / 10000;
            if (lidoAmount > 0) {
                asset.approve(address(lidoAdapter), lidoAmount);
                lidoAdapter.deposit(lidoAmount);
            }
        }
    }

    function _withdrawFromStrategies(uint256 amount) private {
        // Withdraw from Lido first
        uint256 lidoBalance = lidoAdapter.getBalance();
        if (lidoBalance > 0) {
            uint256 toWithdraw = amount > lidoBalance ? lidoBalance : amount;
            lidoAdapter.withdraw(toWithdraw);
        }
    }

    function _getStrategyAssets() private view returns (uint256) {
        return lidoAdapter.getBalance();
    }

    function _calculateAPY() private view returns (uint256) {
        if (totalDeposited == 0 || block.timestamp <= lastRebaseTime) {
            return 0;
        }
        
        uint256 timePassed = block.timestamp - lastRebaseTime;
        uint256 currentValue = totalAssets();
        
        if (currentValue <= totalDeposited) {
            return 0;
        }
        
        uint256 profit = currentValue - totalDeposited;
        uint256 annualizedReturn = (profit * 365 days * 10000) / (totalDeposited * timePassed);
        
        return annualizedReturn;
    }

    function rebalance(uint256 newLidoWeight) 
        external 
        onlyRole(REBALANCER_ROLE) 
    {
        if (newLidoWeight > 10000) revert InvalidWeight();
        
        uint256 totalBalance = totalAssets();
        uint256 currentLidoBalance = lidoAdapter.getBalance();
        uint256 targetLidoBalance = (totalBalance * newLidoWeight) / 10000;
        
        if (targetLidoBalance > currentLidoBalance) {
            // Need to deposit more to Lido
            uint256 toDeposit = targetLidoBalance - currentLidoBalance;
            uint256 availableKusd = asset.balanceOf(address(this));
            
            if (availableKusd >= toDeposit) {
                asset.approve(address(lidoAdapter), toDeposit);
                lidoAdapter.deposit(toDeposit);
            }
        } else if (targetLidoBalance < currentLidoBalance) {
            // Need to withdraw from Lido
            uint256 toWithdraw = currentLidoBalance - targetLidoBalance;
            lidoAdapter.withdraw(toWithdraw);
        }
        
        lidoWeight = newLidoWeight;
        emit Rebalance(newLidoWeight);
    }

    function compoundRewards() external onlyRole(REBALANCER_ROLE) {
        uint256 kusdBalance = asset.balanceOf(address(this));
        if (kusdBalance > 0) {
            _deployFunds(kusdBalance);
            emit RewardsCompounded(kusdBalance);
        }
    }

    function emergencyWithdraw(address user) 
        external 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        uint256 userShares = shares[user];
        if (userShares == 0) return;
        
        // Emergency withdraw from all strategies
        uint256 strategyBalance = _getStrategyAssets();
        if (strategyBalance > 0) {
            lidoAdapter.emergencyWithdraw();
        }
        
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

    // View functions
    function getUserShares(address user) external view returns (uint256) {
        return shares[user];
    }

    function getStrategyBalances() external view returns (uint256 lidoBalance) {
        return lidoAdapter.getBalance();
    }

    function getAPY() external view returns (uint256) {
        return _calculateAPY();
    }
}