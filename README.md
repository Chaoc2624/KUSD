# KUSD DeFi

Multi-asset stablecoin with AI-powered yield strategies

## Overview

KUSD is a decentralized stablecoin that enables users to mint stable tokens collateralized by multiple asset types including liquid staking tokens (LSTs) and real-world assets (RWAs). It features AI-powered yield optimization strategies to maximize returns on collateral.

## Features

- **Multi-Asset Collateral**: Support for LSTs, RWAs, and traditional crypto assets
- **AI-Powered Yield Strategies**: Automated yield optimization across DeFi platforms
- **Modular Architecture**: Pluggable adapters for different yield sources (Aave, Curve, Lido, Uniswap)
- **Risk Management**: Built-in risk assessment and collateralization monitoring
- **Upgradeable Contracts**: UUPS proxy pattern for seamless system upgrades
- **Multi-Chain Support**: Deploy on Ethereum, Arbitrum, and Optimism

## Architecture

### Core Contracts

- **Stablecoin.sol**: ERC20 upgradeable stablecoin with role-based access control
- **MasterVault.sol**: Central vault managing collateral deposits and withdrawals
- **CollateralManager.sol**: Handles collateral types and liquidation logic
- **RiskManager.sol**: Risk assessment and parameter management
- **OracleAdapter.sol**: Price feed integration for accurate asset valuation

### Vault Types

- **LSTVault.sol**: Liquid Staking Token vault for ETH derivatives
- **RWAVault.sol**: Real-World Asset vault for tokenized assets

### DeFi Adapters

- **Aave Adapter**: Lending platform integration
- **Curve Adapter**: Stablecoin liquidity provision
- **Lido Adapter**: ETH staking rewards
- **Uniswap Adapter**: DEX liquidity and trading

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/kusd-defi.git
cd kusd-defi

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## Environment Setup

Configure your `.env` file with the following variables:

```env
# RPC URLs
ALCHEMY_OR_INFURA=your_ethereum_rpc_url
SEPOLIA_RPC=your_sepolia_rpc_url
ARBITRUM_RPC=your_arbitrum_rpc_url
OPTIMISM_RPC=your_optimism_rpc_url

# Private Key (for deployments)
PRIVATE_KEY=your_private_key

# API Keys for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
OPTIMISM_API_KEY=your_optimism_api_key
```

## Development

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
# Run all tests
npm test

# Run with mainnet fork
npm run test:fork
```

### Code Quality

```bash
# Lint Solidity code
npm run lint

# Generate test coverage report
npm run coverage

# Generate TypeScript bindings
npm run typechain
```

## Deployment

### Local Deployment

```bash
# Start local Hardhat node
npm run node

# Deploy to local network (in another terminal)
npm run deploy:local
```

### Testnet Deployment

```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia
```

### Contract Verification

```bash
# Verify deployed contracts
npm run verify -- --network sepolia <contract_address> <constructor_args>
```

## Network Configuration

KUSD supports deployment on multiple networks:

- **Hardhat**: Local development with mainnet fork at block 20,100,000
- **Sepolia**: Ethereum testnet
- **Arbitrum**: Layer 2 scaling solution
- **Optimism**: Layer 2 optimistic rollup

## Smart Contract Security

- Built with OpenZeppelin upgradeable contracts
- Role-based access control (RBAC)
- Pausable functionality for emergency stops
- Comprehensive test coverage
- Gas-optimized with Solidity 0.8.24

## Testing

The system includes comprehensive test suites:

- **Unit Tests**: Individual contract functionality
- **Integration Tests**: Multi-contract interactions
- **Fork Tests**: Mainnet simulation testing

Test files:
- `test/CollateralManager.spec.ts`
- `test/MasterVault.spec.ts`

## Scripts

- `scripts/deploy.ts`: Deployment script for all networks
- `scripts/fork-test.ts`: Mainnet fork testing utilities

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This is experimental software. Use at your own risk. The system has not been audited and should not be used in production with real funds.