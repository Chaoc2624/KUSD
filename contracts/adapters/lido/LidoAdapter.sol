// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILido {
    function submit(address _referral) external payable returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IWstETH {
    function wrap(uint256 _stETHAmount) external returns (uint256);
    function unwrap(uint256 _wstETHAmount) external returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function getStETHByWstETH(uint256 _wstETHAmount) external view returns (uint256);
    function getWstETHByStETH(uint256 _stETHAmount) external view returns (uint256);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

contract LidoAdapter is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    
    IERC20 public immutable kusd;
    ILido public immutable stETH;
    IWstETH public immutable wstETH;
    IWETH public immutable weth;
    IUniswapV3Router public immutable uniswapRouter;
    
    address public constant USDC = 0xA0b86991c431C90744B78b1ea8DbfEF6FBD5B25A; // USDC mainnet
    
    uint256 public totalStaked;
    uint256 public totalRewards;
    uint256 private constant MAX_SLIPPAGE = 300; // 3%
    
    event Deposit(uint256 kusdAmount, uint256 stETHReceived);
    event Withdraw(uint256 stETHAmount, uint256 kusdReceived);
    event Harvest(uint256 rewards);
    event Rebase(uint256 newBalance);

    error InsufficientBalance();
    error SwapFailed();
    error InvalidAmount();

    constructor(
        address _kusd,
        address _stETH,
        address _wstETH,
        address _weth,
        address _uniswapRouter,
        address admin
    ) {
        kusd = IERC20(_kusd);
        stETH = ILido(_stETH);
        wstETH = IWstETH(_wstETH);
        weth = IWETH(_weth);
        uniswapRouter = IUniswapV3Router(_uniswapRouter);
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VAULT_ROLE, admin);
    }

    /**
     * @dev Deposits KUSD and converts to stETH via USDC -> ETH -> stETH
     */
    function deposit(uint256 kusdAmount) external onlyRole(VAULT_ROLE) nonReentrant {
        if (kusdAmount == 0) revert InvalidAmount();
        
        kusd.safeTransferFrom(msg.sender, address(this), kusdAmount);
        
        // Step 1: Swap KUSD to USDC (assuming 1:1 for stablecoin)
        uint256 usdcAmount = kusdAmount / 1e12; // Convert 18 decimals to 6 decimals
        
        // Step 2: Swap USDC to ETH
        uint256 ethAmount = _swapUSDCToETH(usdcAmount);
        
        // Step 3: Stake ETH to get stETH
        uint256 stETHReceived = _stakeETH(ethAmount);
        
        // Step 4: Wrap stETH to wstETH for better composability
        _wrapToWstETH(stETHReceived);
        
        totalStaked += kusdAmount;
        
        emit Deposit(kusdAmount, stETHReceived);
    }

    /**
     * @dev Withdraws stETH and converts back to KUSD
     */
    function withdraw(uint256 kusdAmount) external onlyRole(VAULT_ROLE) nonReentrant {
        if (kusdAmount == 0) revert InvalidAmount();
        
        uint256 wstETHBalance = wstETH.balanceOf(address(this));
        if (wstETHBalance == 0) revert InsufficientBalance();
        
        // Calculate how much wstETH to unwrap
        uint256 wstETHToUnwrap = (wstETHBalance * kusdAmount) / totalStaked;
        
        // Step 1: Unwrap wstETH to stETH
        uint256 stETHAmount = wstETH.unwrap(wstETHToUnwrap);
        
        // Step 2: For simplicity, we'll transfer stETH directly
        // In production, would swap stETH -> ETH -> USDC -> KUSD
        uint256 ethValue = _getETHValue(stETHAmount);
        uint256 kusdValue = _swapETHToKUSD(ethValue);
        
        kusd.safeTransfer(msg.sender, kusdValue);
        
        totalStaked = totalStaked > kusdAmount ? totalStaked - kusdAmount : 0;
        
        emit Withdraw(stETHAmount, kusdValue);
    }

    /**
     * @dev Harvest staking rewards
     */
    function harvest() external onlyRole(VAULT_ROLE) returns (uint256) {
        uint256 currentWstETHBalance = wstETH.balanceOf(address(this));
        uint256 currentStETHValue = wstETH.getStETHByWstETH(currentWstETHBalance);
        
        // Calculate rewards as the difference between current value and total staked
        uint256 ethValue = _getETHValue(currentStETHValue);
        uint256 currentValueInKUSD = _estimateKUSDValue(ethValue);
        
        uint256 rewards = 0;
        if (currentValueInKUSD > totalStaked) {
            rewards = currentValueInKUSD - totalStaked;
            totalRewards += rewards;
        }
        
        emit Harvest(rewards);
        return rewards;
    }

    /**
     * @dev Get current balance in KUSD terms
     */
    function getBalance() external view returns (uint256) {
        uint256 wstETHBalance = wstETH.balanceOf(address(this));
        if (wstETHBalance == 0) return 0;
        
        uint256 stETHValue = wstETH.getStETHByWstETH(wstETHBalance);
        uint256 ethValue = _getETHValue(stETHValue);
        
        return _estimateKUSDValue(ethValue);
    }

    function _swapUSDCToETH(uint256 usdcAmount) private returns (uint256) {
        // Simplified swap logic - in production would use actual DEX
        // This assumes we have USDC and need to swap to ETH
        
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router
            .ExactInputSingleParams({
                tokenIn: USDC,
                tokenOut: address(weth),
                fee: 3000, // 0.3%
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: usdcAmount,
                amountOutMinimum: 0, // In production, calculate proper slippage
                sqrtPriceLimitX96: 0
            });

        uint256 ethAmount = uniswapRouter.exactInputSingle(params);
        weth.withdraw(ethAmount);
        
        return ethAmount;
    }

    function _stakeETH(uint256 ethAmount) private returns (uint256) {
        return stETH.submit{value: ethAmount}(address(0));
    }

    function _wrapToWstETH(uint256 stETHAmount) private {
        stETH.approve(address(wstETH), stETHAmount);
        wstETH.wrap(stETHAmount);
    }

    function _getETHValue(uint256 stETHAmount) private pure returns (uint256) {
        // stETH should be roughly 1:1 with ETH
        // In production, would get actual exchange rate
        return stETHAmount;
    }

    function _estimateKUSDValue(uint256 ethAmount) private pure returns (uint256) {
        // Simplified conversion - in production would use oracle
        // Assuming 1 ETH = 3000 KUSD for estimation
        return ethAmount * 3000;
    }

    function _swapETHToKUSD(uint256 ethAmount) private returns (uint256) {
        // Simplified - would implement actual swap logic
        return ethAmount * 3000; // Placeholder conversion
    }

    /**
     * @dev Emergency withdraw all stETH
     */
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 wstETHBalance = wstETH.balanceOf(address(this));
        if (wstETHBalance > 0) {
            uint256 stETHAmount = wstETH.unwrap(wstETHBalance);
            stETH.transfer(msg.sender, stETHAmount);
        }
        
        uint256 stETHBalance = stETH.balanceOf(address(this));
        if (stETHBalance > 0) {
            stETH.transfer(msg.sender, stETHBalance);
        }
    }

    /**
     * @dev Get staking APR from Lido (mock implementation)
     */
    function getAPR() external pure returns (uint256) {
        return 400; // 4% APR in basis points
    }

    /**
     * @dev Get total value locked in USD terms
     */
    function getTVL() external view returns (uint256) {
        return getBalance();
    }

    receive() external payable {}
}