// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LidoAdapterTestnet
 * @dev Simplified Lido adapter for testnet deployment
 * This version doesn't interact with actual Lido contracts but simulates the behavior
 */
contract LidoAdapterTestnet is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    
    IERC20 public immutable kusd;
    
    uint256 public totalStaked;
    uint256 public totalRewards;
    uint256 public currentAPR = 400; // 4% APR
    uint256 public lastHarvestTime;
    
    mapping(address => uint256) public userStakes;
    
    event Deposit(uint256 kusdAmount, uint256 stETHReceived);
    event Withdraw(uint256 stETHAmount, uint256 kusdReceived);
    event Harvest(uint256 rewards);
    event APRUpdated(uint256 newAPR);

    error InsufficientBalance();
    error InvalidAmount();

    constructor(
        address _kusd,
        address admin
    ) {
        kusd = IERC20(_kusd);
        lastHarvestTime = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VAULT_ROLE, admin);
    }

    /**
     * @dev Simulates depositing KUSD and getting stETH exposure
     */
    function deposit(uint256 kusdAmount) external onlyRole(VAULT_ROLE) nonReentrant {
        if (kusdAmount == 0) revert InvalidAmount();
        
        kusd.safeTransferFrom(msg.sender, address(this), kusdAmount);
        
        // Simulate staking rewards accumulation
        _updateRewards();
        
        totalStaked += kusdAmount;
        userStakes[msg.sender] += kusdAmount;
        
        // In testnet, we simulate getting stETH 1:1 with deposited KUSD value
        emit Deposit(kusdAmount, kusdAmount);
    }

    /**
     * @dev Simulates withdrawing from stETH position
     */
    function withdraw(uint256 kusdAmount) external onlyRole(VAULT_ROLE) nonReentrant {
        if (kusdAmount == 0) revert InvalidAmount();
        if (userStakes[msg.sender] < kusdAmount) revert InsufficientBalance();
        
        _updateRewards();
        
        uint256 totalBalance = getBalance();
        uint256 userShare = (kusdAmount * totalBalance) / totalStaked;
        
        userStakes[msg.sender] -= kusdAmount;
        totalStaked -= kusdAmount;
        
        kusd.safeTransfer(msg.sender, userShare);
        
        emit Withdraw(kusdAmount, userShare);
    }

    /**
     * @dev Simulates harvesting staking rewards
     */
    function harvest() external onlyRole(VAULT_ROLE) returns (uint256) {
        _updateRewards();
        
        uint256 rewards = 0;
        uint256 currentTime = block.timestamp;
        
        if (currentTime > lastHarvestTime && totalStaked > 0) {
            uint256 timeDelta = currentTime - lastHarvestTime;
            rewards = (totalStaked * currentAPR * timeDelta) / (10000 * 365 days);
            
            if (rewards > 0) {
                totalRewards += rewards;
                // In a real implementation, rewards would be reinvested or distributed
                // For testnet, we just track them
            }
        }
        
        lastHarvestTime = currentTime;
        
        emit Harvest(rewards);
        return rewards;
    }

    /**
     * @dev Get current balance including simulated rewards
     */
    function getBalance() public view returns (uint256) {
        if (totalStaked == 0) return 0;
        
        uint256 timeDelta = block.timestamp - lastHarvestTime;
        uint256 pendingRewards = (totalStaked * currentAPR * timeDelta) / (10000 * 365 days);
        
        return kusd.balanceOf(address(this)) + totalRewards + pendingRewards;
    }

    function _updateRewards() private {
        uint256 currentTime = block.timestamp;
        
        if (currentTime > lastHarvestTime && totalStaked > 0) {
            uint256 timeDelta = currentTime - lastHarvestTime;
            uint256 rewards = (totalStaked * currentAPR * timeDelta) / (10000 * 365 days);
            
            if (rewards > 0) {
                totalRewards += rewards;
            }
        }
        
        lastHarvestTime = currentTime;
    }

    /**
     * @dev Emergency withdraw all funds
     */
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = kusd.balanceOf(address(this));
        if (balance > 0) {
            kusd.safeTransfer(msg.sender, balance);
        }
    }

    /**
     * @dev Set APR for testing
     */
    function setAPR(uint256 newAPR) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAPR <= 2000, "APR too high"); // Max 20%
        currentAPR = newAPR;
        emit APRUpdated(newAPR);
    }

    /**
     * @dev Get staking APR
     */
    function getAPR() external view returns (uint256) {
        return currentAPR;
    }

    /**
     * @dev Get total value locked
     */
    function getTVL() external view returns (uint256) {
        return getBalance();
    }

    /**
     * @dev Get user's staked amount
     */
    function getUserStake(address user) external view returns (uint256) {
        return userStakes[user];
    }
}