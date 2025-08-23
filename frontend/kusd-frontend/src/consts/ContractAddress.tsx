  // Contract addresses for different networks
const contractAddress: { [chainId: number]: any } = {
      11155111: { // Sepolia Testnet
          kusd: "0xAeE3625b0E6a4FfAc196d4DCB51dCe7568dD6353",
          // Supported deposit tokens
          usdt: "0xd435015a9f72db79a3cbe8d13e8820111c1b162225592bfcaf50ab2b12cfb6f3", // Sepolia USDT
          usdc: "0x1c7D4B196Cb0C7B01d743FbcD6D5B4b2c7C0b8E7", // Sepolia USDC
          wbtc: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // Sepolia WBTC
          aave: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", // Sepolia AAVE
          // KUSD deposit contract
          depositContract: "0xAeE3625b0E6a4FfAc196d4DCB51dCe7568dD6353"
      },
          1: { // Ethereum Mainnet
          kusd: "0x0000000000000000000000000000000000000000",
          steth: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
          wsteth: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
          reth: "0xae78736Cd615f374D3085123A210448E74Fc6393",
          // Supported deposit tokens
          usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          usdc: "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8",
          wbtc: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
          aave: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
          // KUSD deposit contract
          depositContract: "0x1234567890123456789012345678901234567890"
      },
      42161: { // Arbitrum One
          kusd: "0x0000000000000000000000000000000000000000",
          // Supported deposit tokens
          usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
          usdc: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
          wbtc: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
          aave: "0x0000000000000000000000000000000000000000",
          // KUSD deposit contract
          depositContract: "0x1234567890123456789012345678901234567890"
      },
      10: { // Optimism
          kusd: "0x0000000000000000000000000000000000000000",
          // Supported deposit tokens
          usdt: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
          usdc: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
          wbtc: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
          aave: "0x0000000000000000000000000000000000000000",
          // KUSD deposit contract
          depositContract: "0x1234567890123456789012345678901234567890"
      }
}

// Mock ABIs for deposit functionality
export const depositABI = [
    // Deposit function for ERC20 tokens
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "deposit",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // Deposit function for native ETH
    {
        "inputs": [],
        "name": "depositETH",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "payable",
        "type": "function"
    },
    // Get deposit address for a specific token
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            }
        ],
        "name": "getDepositAddress",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

// ERC20 ABI for token interactions
export const erc20ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {"name": "_owner", "type": "address"},
            {"name": "_spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
]

// Helper function to get network name from chain ID
export const getNetworkName = (chainId: number): string => {
  const networkNames: { [key: number]: string } = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    42161: 'Arbitrum One',
    10: 'Optimism'
  }
  return networkNames[chainId] || 'Unknown Network'
}

// Helper function to get contract addresses for a specific chain
export const getContractAddresses = (chainId: number) => {
  return contractAddress[chainId] || contractAddress[1] // fallback to mainnet
}

export default contractAddress;