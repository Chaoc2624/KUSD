// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockLido is ERC20 {
    uint256 public constant STAKING_APR = 400; // 4%
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    
    mapping(address => uint256) public lastRebaseTime;
    
    event Submitted(address indexed sender, uint256 amount, address referral);
    
    constructor() ERC20("Liquid staked Ether 2.0", "stETH") {
        // Mint initial supply for testing
        _mint(msg.sender, 1000000 ether);
    }
    
    function submit(address _referral) external payable returns (uint256) {
        require(msg.value > 0, "Invalid ETH amount");
        
        uint256 shares = msg.value; // 1:1 for simplicity
        _mint(msg.sender, shares);
        lastRebaseTime[msg.sender] = block.timestamp;
        
        emit Submitted(msg.sender, msg.value, _referral);
        return shares;
    }
    
    function getPooledEthByShares(uint256 _sharesAmount) external pure returns (uint256) {
        return _sharesAmount; // 1:1 for simplicity
    }
    
    function getSharesByPooledEth(uint256 _pooledEthAmount) external pure returns (uint256) {
        return _pooledEthAmount; // 1:1 for simplicity
    }
    
    // Simulate rebase rewards
    function rebase(address user) external {
        if (lastRebaseTime[user] == 0) return;
        
        uint256 timeDelta = block.timestamp - lastRebaseTime[user];
        uint256 userBalance = balanceOf(user);
        
        if (timeDelta > 0 && userBalance > 0) {
            uint256 reward = (userBalance * STAKING_APR * timeDelta) / 
                           (10000 * SECONDS_PER_YEAR);
            
            if (reward > 0) {
                _mint(user, reward);
            }
            
            lastRebaseTime[user] = block.timestamp;
        }
    }
}

contract MockWstETH is ERC20 {
    MockLido public immutable stETH;
    
    constructor(address _stETH) ERC20("Wrapped liquid staked Ether 2.0", "wstETH") {
        stETH = MockLido(_stETH);
    }
    
    function wrap(uint256 _stETHAmount) external returns (uint256) {
        require(_stETHAmount > 0, "wstETH: can't wrap zero stETH");
        
        stETH.transferFrom(msg.sender, address(this), _stETHAmount);
        uint256 wstETHAmount = _stETHAmount; // 1:1 for simplicity
        _mint(msg.sender, wstETHAmount);
        
        return wstETHAmount;
    }
    
    function unwrap(uint256 _wstETHAmount) external returns (uint256) {
        require(_wstETHAmount > 0, "wstETH: zero amount unwrap not allowed");
        require(balanceOf(msg.sender) >= _wstETHAmount, "wstETH: not enough wstETH");
        
        _burn(msg.sender, _wstETHAmount);
        uint256 stETHAmount = _wstETHAmount; // 1:1 for simplicity
        stETH.transfer(msg.sender, stETHAmount);
        
        return stETHAmount;
    }
    
    function getStETHByWstETH(uint256 _wstETHAmount) external pure returns (uint256) {
        return _wstETHAmount; // 1:1 for simplicity
    }
    
    function getWstETHByStETH(uint256 _stETHAmount) external pure returns (uint256) {
        return _stETHAmount; // 1:1 for simplicity
    }
    
    function stEthPerToken() external pure returns (uint256) {
        return 1 ether; // 1:1 ratio
    }
    
    function tokensPerStEth() external pure returns (uint256) {
        return 1 ether; // 1:1 ratio
    }
}