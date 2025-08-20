// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract RiskManager is AccessControl {
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");

    struct RiskProfile {
        uint256 rwaWeight;
        uint256 lstWeight;
        uint256 defiWeight;
        uint256 optionsWeight;
        uint256 maxAllocation; // Maximum total allocation percentage
        bool isActive;
    }

    // Risk profile ID => RiskProfile
    mapping(uint8 => RiskProfile) public riskProfiles;
    
    // Token => Risk parameters
    mapping(address => TokenRisk) public tokenRisk;

    struct TokenRisk {
        uint256 maxLTV;         // Maximum Loan-to-Value ratio (basis points)
        uint256 liquidationLTV; // Liquidation threshold (basis points)
        uint256 liquidationBonus; // Liquidation bonus (basis points)
        uint256 maxSupply;      // Maximum supply cap
        uint256 currentSupply;  // Current supply
        bool isActive;
    }

    event RiskProfileUpdated(
        uint8 indexed profileId,
        uint256 rwaWeight,
        uint256 lstWeight,
        uint256 defiWeight,
        uint256 optionsWeight
    );
    event TokenRiskUpdated(
        address indexed token,
        uint256 maxLTV,
        uint256 liquidationLTV,
        uint256 liquidationBonus,
        uint256 maxSupply
    );

    error InvalidRiskProfile(uint8 profileId);
    error InvalidWeights();
    error TokenNotSupported(address token);
    error SupplyCapExceeded(address token);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RISK_ADMIN_ROLE, admin);
        
        _initializeDefaultProfiles();
    }

    function _initializeDefaultProfiles() private {
        // Conservative (Profile 0)
        riskProfiles[0] = RiskProfile({
            rwaWeight: 10000,      // 100%
            lstWeight: 0,
            defiWeight: 0,
            optionsWeight: 0,
            maxAllocation: 10000,  // 100%
            isActive: true
        });

        // Balanced (Profile 1)
        riskProfiles[1] = RiskProfile({
            rwaWeight: 5000,       // 50%
            lstWeight: 4000,       // 40%
            defiWeight: 1000,      // 10%
            optionsWeight: 0,
            maxAllocation: 10000,
            isActive: true
        });

        // Aggressive (Profile 2)
        riskProfiles[2] = RiskProfile({
            rwaWeight: 2500,       // 25%
            lstWeight: 2500,       // 25%
            defiWeight: 4000,      // 40%
            optionsWeight: 1000,   // 10%
            maxAllocation: 10000,
            isActive: true
        });
    }

    function setRiskProfile(
        uint8 profileId,
        uint256 rwaWeight,
        uint256 lstWeight,
        uint256 defiWeight,
        uint256 optionsWeight,
        uint256 maxAllocation
    ) external onlyRole(RISK_ADMIN_ROLE) {
        uint256 totalWeight = rwaWeight + lstWeight + defiWeight + optionsWeight;
        if (totalWeight != 10000) revert InvalidWeights(); // Must sum to 100%
        if (maxAllocation > 10000) revert InvalidWeights();

        riskProfiles[profileId] = RiskProfile({
            rwaWeight: rwaWeight,
            lstWeight: lstWeight,
            defiWeight: defiWeight,
            optionsWeight: optionsWeight,
            maxAllocation: maxAllocation,
            isActive: true
        });

        emit RiskProfileUpdated(profileId, rwaWeight, lstWeight, defiWeight, optionsWeight);
    }

    function setTokenRisk(
        address token,
        uint256 maxLTV,
        uint256 liquidationLTV,
        uint256 liquidationBonus,
        uint256 maxSupply
    ) external onlyRole(RISK_ADMIN_ROLE) {
        require(maxLTV < liquidationLTV, "Invalid LTV parameters");
        require(liquidationLTV <= 10000, "LTV too high");
        require(liquidationBonus <= 2000, "Bonus too high"); // Max 20%

        tokenRisk[token] = TokenRisk({
            maxLTV: maxLTV,
            liquidationLTV: liquidationLTV,
            liquidationBonus: liquidationBonus,
            maxSupply: maxSupply,
            currentSupply: tokenRisk[token].currentSupply, // Preserve current supply
            isActive: true
        });

        emit TokenRiskUpdated(token, maxLTV, liquidationLTV, liquidationBonus, maxSupply);
    }

    function getWeights(uint8 profileId) 
        external 
        view 
        returns (uint256, uint256, uint256, uint256) 
    {
        RiskProfile memory profile = riskProfiles[profileId];
        if (!profile.isActive) revert InvalidRiskProfile(profileId);
        
        return (
            profile.rwaWeight,
            profile.lstWeight,
            profile.defiWeight,
            profile.optionsWeight
        );
    }

    function isValidRiskProfile(uint8 profileId) external view returns (bool) {
        return riskProfiles[profileId].isActive;
    }

    function checkCollateralSupply(address token, uint256 amount) external view {
        TokenRisk memory risk = tokenRisk[token];
        if (!risk.isActive) revert TokenNotSupported(token);
        if (risk.currentSupply + amount > risk.maxSupply) {
            revert SupplyCapExceeded(token);
        }
    }

    function updateSupply(address token, uint256 amount, bool increase) 
        external 
        onlyRole(RISK_ADMIN_ROLE) 
    {
        TokenRisk storage risk = tokenRisk[token];
        if (!risk.isActive) revert TokenNotSupported(token);
        
        if (increase) {
            risk.currentSupply += amount;
        } else {
            risk.currentSupply = risk.currentSupply > amount ? 
                risk.currentSupply - amount : 0;
        }
    }

    function getTokenRiskParams(address token) 
        external 
        view 
        returns (uint256 maxLTV, uint256 liquidationLTV, uint256 liquidationBonus) 
    {
        TokenRisk memory risk = tokenRisk[token];
        if (!risk.isActive) revert TokenNotSupported(token);
        
        return (risk.maxLTV, risk.liquidationLTV, risk.liquidationBonus);
    }
}