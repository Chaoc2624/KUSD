// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./OracleAdapter.sol";
import "./Stablecoin.sol";
import "./RiskManager.sol";

contract CollateralManager is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");

    struct Position {
        uint256 collateralValue;    // Total collateral value in USD (18 decimals)
        uint256 debt;              // Total debt in KUSD (18 decimals)
        uint256 lastUpdateTime;    // Last interest accrual time
        mapping(address => uint256) tokenBalances; // token => amount
    }

    struct CollateralToken {
        bool isActive;
        uint256 totalDeposited;
        uint256 maxSupply;
    }

    mapping(address => Position) public positions;
    mapping(address => CollateralToken) public collateralTokens;
    
    OracleAdapter public immutable oracle;
    Stablecoin public immutable kusd;
    RiskManager public immutable riskManager;
    address public treasury;

    uint256 public mintFeeRate = 50;      // 0.5% (50/10000)
    uint256 public repayFeeRate = 0;      // 0% initially
    uint256 public baseInterestRate = 200; // 2% annual (200/10000)
    
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant BASIS_POINTS = 10000;

    event Deposit(address indexed user, address indexed token, uint256 amount, uint256 usdValue);
    event Withdraw(address indexed user, address indexed token, uint256 amount, uint256 usdValue);
    event Borrow(address indexed user, uint256 amount, uint256 fee);
    event Repay(address indexed user, uint256 amount, uint256 fee);
    event Liquidation(
        address indexed user,
        address indexed liquidator,
        address indexed token,
        uint256 repaidDebt,
        uint256 collateralSeized
    );
    event InterestAccrued(address indexed user, uint256 interest);

    error InsufficientCollateral();
    error InvalidAmount();
    error PositionNotLiquidatable();
    error TokenNotSupported();
    error ExceedsSupplyCap();

    constructor(
        address _oracle,
        address _kusd,
        address _riskManager,
        address _treasury,
        address admin
    ) {
        oracle = OracleAdapter(_oracle);
        kusd = Stablecoin(_kusd);
        riskManager = RiskManager(_riskManager);
        treasury = _treasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LIQUIDATOR_ROLE, admin);
        _grantRole(RISK_ADMIN_ROLE, admin);
    }

    modifier onlyActiveToken(address token) {
        if (!collateralTokens[token].isActive) revert TokenNotSupported();
        _;
    }

    function addCollateralToken(
        address token,
        uint256 maxSupply
    ) external onlyRole(RISK_ADMIN_ROLE) {
        collateralTokens[token] = CollateralToken({
            isActive: true,
            totalDeposited: 0,
            maxSupply: maxSupply
        });
    }

    function deposit(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyActiveToken(token)
    {
        if (amount == 0) revert InvalidAmount();
        
        CollateralToken storage tokenInfo = collateralTokens[token];
        if (tokenInfo.totalDeposited + amount > tokenInfo.maxSupply) {
            revert ExceedsSupplyCap();
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 usdValue = oracle.tokenToUsd(token, amount);
        
        Position storage position = positions[msg.sender];
        _accrueInterest(msg.sender);
        
        position.collateralValue += usdValue;
        position.tokenBalances[token] += amount;
        tokenInfo.totalDeposited += amount;

        emit Deposit(msg.sender, token, amount, usdValue);
    }

    function withdraw(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyActiveToken(token)
    {
        if (amount == 0) revert InvalidAmount();
        
        Position storage position = positions[msg.sender];
        if (position.tokenBalances[token] < amount) revert InvalidAmount();
        
        _accrueInterest(msg.sender);
        
        uint256 usdValue = oracle.tokenToUsd(token, amount);
        
        // Check if withdrawal would make position undercollateralized
        if (position.debt > 0) {
            uint256 newCollateralValue = position.collateralValue - usdValue;
            (uint256 maxLTV, , ) = riskManager.getTokenRiskParams(token);
            
            if (newCollateralValue * BASIS_POINTS < position.debt * maxLTV) {
                revert InsufficientCollateral();
            }
        }
        
        position.collateralValue -= usdValue;
        position.tokenBalances[token] -= amount;
        collateralTokens[token].totalDeposited -= amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, token, amount, usdValue);
    }

    function borrow(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (amount == 0) revert InvalidAmount();
        
        Position storage position = positions[msg.sender];
        _accrueInterest(msg.sender);
        
        uint256 fee = (amount * mintFeeRate) / BASIS_POINTS;
        uint256 totalDebt = position.debt + amount + fee;
        
        // Check collateral ratio - use weighted average of all token LTVs
        uint256 maxBorrow = _calculateMaxBorrow(msg.sender);
        if (totalDebt > maxBorrow) revert InsufficientCollateral();
        
        position.debt = totalDebt;
        
        // Mint KUSD to user
        kusd.mint(msg.sender, amount);
        
        // Send fee to treasury
        if (fee > 0) {
            kusd.mint(treasury, fee);
        }
        
        emit Borrow(msg.sender, amount, fee);
    }

    function repay(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (amount == 0) revert InvalidAmount();
        
        Position storage position = positions[msg.sender];
        _accrueInterest(msg.sender);
        
        uint256 fee = (amount * repayFeeRate) / BASIS_POINTS;
        uint256 totalAmount = amount + fee;
        
        kusd.transferFrom(msg.sender, address(this), totalAmount);
        kusd.burn(address(this), amount);
        
        if (fee > 0) {
            kusd.transfer(treasury, fee);
        }
        
        position.debt = position.debt > amount ? position.debt - amount : 0;
        
        emit Repay(msg.sender, amount, fee);
    }

    function liquidate(
        address user,
        address token,
        uint256 repayAmount
    ) external nonReentrant onlyRole(LIQUIDATOR_ROLE) {
        Position storage position = positions[user];
        _accrueInterest(user);
        
        if (!_isLiquidatable(user)) revert PositionNotLiquidatable();
        
        uint256 maxRepay = position.debt / 2; // Max 50% liquidation
        if (repayAmount > maxRepay) repayAmount = maxRepay;
        
        (, , uint256 liquidationBonus) = riskManager.getTokenRiskParams(token);
        
        uint256 collateralToSeize = oracle.usdToToken(
            token, 
            (repayAmount * (BASIS_POINTS + liquidationBonus)) / BASIS_POINTS
        );
        
        if (position.tokenBalances[token] < collateralToSeize) {
            collateralToSeize = position.tokenBalances[token];
        }
        
        // Transfer repayment from liquidator
        kusd.transferFrom(msg.sender, address(this), repayAmount);
        kusd.burn(address(this), repayAmount);
        
        // Transfer collateral to liquidator
        IERC20(token).safeTransfer(msg.sender, collateralToSeize);
        
        // Update position
        uint256 collateralValueSeized = oracle.tokenToUsd(token, collateralToSeize);
        position.debt -= repayAmount;
        position.collateralValue -= collateralValueSeized;
        position.tokenBalances[token] -= collateralToSeize;
        collateralTokens[token].totalDeposited -= collateralToSeize;
        
        emit Liquidation(user, msg.sender, token, repayAmount, collateralToSeized);
    }

    function _accrueInterest(address user) private {
        Position storage position = positions[user];
        if (position.debt == 0 || position.lastUpdateTime == 0) {
            position.lastUpdateTime = block.timestamp;
            return;
        }
        
        uint256 timeDelta = block.timestamp - position.lastUpdateTime;
        if (timeDelta == 0) return;
        
        uint256 interest = (position.debt * baseInterestRate * timeDelta) / 
                          (BASIS_POINTS * SECONDS_PER_YEAR);
        
        position.debt += interest;
        position.lastUpdateTime = block.timestamp;
        
        if (interest > 0) {
            emit InterestAccrued(user, interest);
        }
    }

    function _calculateMaxBorrow(address user) private view returns (uint256) {
        Position storage position = positions[user];
        return (position.collateralValue * 7500) / BASIS_POINTS; // 75% LTV for simplicity
    }

    function _isLiquidatable(address user) private view returns (bool) {
        Position storage position = positions[user];
        if (position.debt == 0) return false;
        
        // Liquidation threshold at 85% of collateral value
        uint256 liquidationThreshold = (position.collateralValue * 8500) / BASIS_POINTS;
        return position.debt > liquidationThreshold;
    }

    function getHealthFactor(address user) external view returns (uint256) {
        Position storage position = positions[user];
        if (position.debt == 0) return type(uint256).max;
        
        return (position.collateralValue * 1e18) / position.debt;
    }

    function getUserTokenBalance(address user, address token) 
        external 
        view 
        returns (uint256) 
    {
        return positions[user].tokenBalances[token];
    }

    function setFeeRates(uint256 _mintFeeRate, uint256 _repayFeeRate) 
        external 
        onlyRole(RISK_ADMIN_ROLE) 
    {
        require(_mintFeeRate <= 500 && _repayFeeRate <= 500, "Fee too high"); // Max 5%
        mintFeeRate = _mintFeeRate;
        repayFeeRate = _repayFeeRate;
    }

    function setInterestRate(uint256 _baseInterestRate) 
        external 
        onlyRole(RISK_ADMIN_ROLE) 
    {
        require(_baseInterestRate <= 2000, "Interest rate too high"); // Max 20%
        baseInterestRate = _baseInterestRate;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}