// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockUniswapV3Router {
    using SafeERC20 for IERC20;
    
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
    
    // Mock exchange rates (for testing)
    mapping(address => mapping(address => uint256)) public exchangeRates;
    
    constructor() {
        // Set some default exchange rates for testing
        // These would be dynamic in a real implementation
    }
    
    function setExchangeRate(
        address tokenIn, 
        address tokenOut, 
        uint256 rate
    ) external {
        exchangeRates[tokenIn][tokenOut] = rate;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        require(block.timestamp <= params.deadline, "Transaction too old");
        
        if (params.tokenIn == address(0)) {
            // ETH input
            require(msg.value == params.amountIn, "Incorrect ETH amount");
            amountOut = (msg.value * exchangeRates[params.tokenIn][params.tokenOut]) / 1e18;
        } else {
            // ERC20 input
            IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
            
            uint256 rate = exchangeRates[params.tokenIn][params.tokenOut];
            if (rate == 0) {
                // Default to 1:1 if no rate set
                rate = 1e18;
            }
            
            amountOut = (params.amountIn * rate) / 1e18;
        }
        
        require(amountOut >= params.amountOutMinimum, "Insufficient output amount");
        
        if (params.tokenOut == address(0)) {
            // ETH output
            payable(params.recipient).transfer(amountOut);
        } else {
            // ERC20 output - for testing, mint tokens if we don't have enough
            IERC20 tokenOut = IERC20(params.tokenOut);
            uint256 balance = tokenOut.balanceOf(address(this));
            
            if (balance < amountOut) {
                // In a real router, this would fail
                // For testing, we'll assume we can get the tokens
                revert("Insufficient liquidity");
            }
            
            tokenOut.safeTransfer(params.recipient, amountOut);
        }
        
        return amountOut;
    }
    
    receive() external payable {}
}