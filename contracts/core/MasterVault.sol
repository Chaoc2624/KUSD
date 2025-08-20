// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./RiskManager.sol";
import "../vaults/IVault.sol";

contract MasterVault is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");
    bytes32 public constant AI_SIGNER_ROLE = keccak256("AI_SIGNER_ROLE");

    IERC20 public immutable kusd;
    RiskManager public immutable riskManager;
    
    IVault public rwaVault;
    IVault public lstVault;
    IVault public defiVault;
    IVault public optionsVault;
    
    address public aiSigner;
    mapping(bytes32 => bool) public usedSignatures;
    
    // User positions
    mapping(address => UserPosition) public userPositions;
    
    struct UserPosition {
        uint256 totalDeposited;
        uint256 rwaShares;
        uint256 lstShares;
        uint256 defiShares;
        uint256 optionsShares;
        uint8 riskProfile;
        uint256 lastUpdateTime;
    }

    struct RebalanceParams {
        uint256 rwaWeight;
        uint256 lstWeight;
        uint256 defiWeight;
        uint256 optionsWeight;
        uint256 deadline;
        uint256 nonce;
    }

    uint256 public rebalanceNonce;
    uint256 public totalManagedAssets;
    
    event Deposit(address indexed user, uint256 amount, uint8 riskProfile);
    event Withdraw(address indexed user, uint256 amount);
    event Rebalanced(uint256 rwaWeight, uint256 lstWeight, uint256 defiWeight, uint256 optionsWeight);
    event AIRebalance(address indexed signer, uint256 nonce);
    event VaultUpdated(string vaultType, address newVault);

    error InvalidRiskProfile();
    error InvalidAmount();
    error InsufficientBalance();
    error InvalidSignature();
    error SignatureExpired();
    error SignatureAlreadyUsed();
    error InvalidWeights();
    error VaultNotSet();

    constructor(
        address _kusd,
        address _riskManager,
        address _aiSigner,
        address admin
    ) {
        kusd = IERC20(_kusd);
        riskManager = RiskManager(_riskManager);
        aiSigner = _aiSigner;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REBALANCER_ROLE, admin);
        _grantRole(AI_SIGNER_ROLE, _aiSigner);
    }

    function setVaults(
        address _rwaVault,
        address _lstVault,
        address _defiVault,
        address _optionsVault
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rwaVault = IVault(_rwaVault);
        lstVault = IVault(_lstVault);
        defiVault = IVault(_defiVault);
        optionsVault = IVault(_optionsVault);
        
        emit VaultUpdated("RWA", _rwaVault);
        emit VaultUpdated("LST", _lstVault);
        emit VaultUpdated("DeFi", _defiVault);
        emit VaultUpdated("Options", _optionsVault);
    }

    function deposit(uint256 amount, uint8 riskProfile) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (amount == 0) revert InvalidAmount();
        if (!riskManager.isValidRiskProfile(riskProfile)) revert InvalidRiskProfile();
        
        kusd.safeTransferFrom(msg.sender, address(this), amount);
        
        UserPosition storage position = userPositions[msg.sender];
        position.totalDeposited += amount;
        position.riskProfile = riskProfile;
        position.lastUpdateTime = block.timestamp;
        
        // Allocate to vaults based on risk profile
        _allocateToVaults(msg.sender, amount, riskProfile);
        
        totalManagedAssets += amount;
        
        emit Deposit(msg.sender, amount, riskProfile);
    }

    function withdraw(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (amount == 0) revert InvalidAmount();
        
        UserPosition storage position = userPositions[msg.sender];
        if (position.totalDeposited < amount) revert InsufficientBalance();
        
        // Withdraw proportionally from all vaults
        _withdrawFromVaults(msg.sender, amount);
        
        position.totalDeposited -= amount;
        totalManagedAssets -= amount;
        
        kusd.safeTransfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, amount);
    }

    function _allocateToVaults(address user, uint256 amount, uint8 riskProfile) private {
        (uint256 rwaWeight, uint256 lstWeight, uint256 defiWeight, uint256 optionsWeight) = 
            riskManager.getWeights(riskProfile);
        
        UserPosition storage position = userPositions[user];
        
        // Allocate to RWA Vault
        if (rwaWeight > 0 && address(rwaVault) != address(0)) {
            uint256 rwaAmount = (amount * rwaWeight) / 10000;
            kusd.approve(address(rwaVault), rwaAmount);
            rwaVault.deposit(user, rwaAmount);
            position.rwaShares += rwaAmount; // Simplified - should get actual shares
        }
        
        // Allocate to LST Vault
        if (lstWeight > 0 && address(lstVault) != address(0)) {
            uint256 lstAmount = (amount * lstWeight) / 10000;
            kusd.approve(address(lstVault), lstAmount);
            lstVault.deposit(user, lstAmount);
            position.lstShares += lstAmount;
        }
        
        // Allocate to DeFi Vault
        if (defiWeight > 0 && address(defiVault) != address(0)) {
            uint256 defiAmount = (amount * defiWeight) / 10000;
            kusd.approve(address(defiVault), defiAmount);
            defiVault.deposit(user, defiAmount);
            position.defiShares += defiAmount;
        }
        
        // Allocate to Options Vault
        if (optionsWeight > 0 && address(optionsVault) != address(0)) {
            uint256 optionsAmount = (amount * optionsWeight) / 10000;
            kusd.approve(address(optionsVault), optionsAmount);
            optionsVault.deposit(user, optionsAmount);
            position.optionsShares += optionsAmount;
        }
    }

    function _withdrawFromVaults(address user, uint256 amount) private {
        UserPosition storage position = userPositions[user];
        uint256 totalShares = position.rwaShares + position.lstShares + 
                             position.defiShares + position.optionsShares;
        
        if (totalShares == 0) return;
        
        // Withdraw proportionally from each vault
        if (position.rwaShares > 0 && address(rwaVault) != address(0)) {
            uint256 sharesToWithdraw = (position.rwaShares * amount) / position.totalDeposited;
            rwaVault.withdraw(user, sharesToWithdraw);
            position.rwaShares -= sharesToWithdraw;
        }
        
        if (position.lstShares > 0 && address(lstVault) != address(0)) {
            uint256 sharesToWithdraw = (position.lstShares * amount) / position.totalDeposited;
            lstVault.withdraw(user, sharesToWithdraw);
            position.lstShares -= sharesToWithdraw;
        }
        
        if (position.defiShares > 0 && address(defiVault) != address(0)) {
            uint256 sharesToWithdraw = (position.defiShares * amount) / position.totalDeposited;
            defiVault.withdraw(user, sharesToWithdraw);
            position.defiShares -= sharesToWithdraw;
        }
        
        if (position.optionsShares > 0 && address(optionsVault) != address(0)) {
            uint256 sharesToWithdraw = (position.optionsShares * amount) / position.totalDeposited;
            optionsVault.withdraw(user, sharesToWithdraw);
            position.optionsShares -= sharesToWithdraw;
        }
    }

    /**
     * @dev AI-powered rebalancing with signature verification
     */
    function aiRebalance(
        RebalanceParams calldata params,
        bytes calldata signature
    ) external {
        if (block.timestamp > params.deadline) revert SignatureExpired();
        if (params.nonce <= rebalanceNonce) revert SignatureAlreadyUsed();
        
        // Verify weights sum to 100%
        uint256 totalWeight = params.rwaWeight + params.lstWeight + 
                             params.defiWeight + params.optionsWeight;
        if (totalWeight != 10000) revert InvalidWeights();
        
        // Create message hash
        bytes32 messageHash = keccak256(abi.encode(
            params.rwaWeight,
            params.lstWeight,
            params.defiWeight,
            params.optionsWeight,
            params.deadline,
            params.nonce,
            address(this),
            block.chainid
        ));
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        // Verify signature
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        if (recoveredSigner != aiSigner || !hasRole(AI_SIGNER_ROLE, recoveredSigner)) {
            revert InvalidSignature();
        }
        
        if (usedSignatures[ethSignedMessageHash]) revert SignatureAlreadyUsed();
        usedSignatures[ethSignedMessageHash] = true;
        
        rebalanceNonce = params.nonce;
        
        // Execute rebalancing logic here
        _executeRebalance(params);
        
        emit AIRebalance(recoveredSigner, params.nonce);
        emit Rebalanced(params.rwaWeight, params.lstWeight, params.defiWeight, params.optionsWeight);
    }

    function _executeRebalance(RebalanceParams calldata params) private {
        // This would implement the complex rebalancing logic
        // Including withdrawing from over-allocated vaults and depositing to under-allocated ones
        // For now, just emit the event - full implementation would be quite complex
    }

    /**
     * @dev Manual rebalancing by admin
     */
    function manualRebalance(
        uint256 rwaWeight,
        uint256 lstWeight,
        uint256 defiWeight,
        uint256 optionsWeight
    ) external onlyRole(REBALANCER_ROLE) {
        uint256 totalWeight = rwaWeight + lstWeight + defiWeight + optionsWeight;
        if (totalWeight != 10000) revert InvalidWeights();
        
        RebalanceParams memory params = RebalanceParams({
            rwaWeight: rwaWeight,
            lstWeight: lstWeight,
            defiWeight: defiWeight,
            optionsWeight: optionsWeight,
            deadline: block.timestamp + 1 hours,
            nonce: ++rebalanceNonce
        });
        
        _executeRebalance(params);
        
        emit Rebalanced(rwaWeight, lstWeight, defiWeight, optionsWeight);
    }

    function harvestAll() external {
        if (address(rwaVault) != address(0)) rwaVault.harvest();
        if (address(lstVault) != address(0)) lstVault.harvest();
        if (address(defiVault) != address(0)) defiVault.harvest();
        if (address(optionsVault) != address(0)) optionsVault.harvest();
    }

    function getUserPosition(address user) 
        external 
        view 
        returns (UserPosition memory) 
    {
        return userPositions[user];
    }

    function getTotalValueLocked() external view returns (uint256) {
        uint256 total = 0;
        
        if (address(rwaVault) != address(0)) total += rwaVault.totalAssets();
        if (address(lstVault) != address(0)) total += lstVault.totalAssets();
        if (address(defiVault) != address(0)) total += defiVault.totalAssets();
        if (address(optionsVault) != address(0)) total += optionsVault.totalAssets();
        
        return total;
    }

    function setAISigner(address newSigner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(AI_SIGNER_ROLE, aiSigner);
        _grantRole(AI_SIGNER_ROLE, newSigner);
        aiSigner = newSigner;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}