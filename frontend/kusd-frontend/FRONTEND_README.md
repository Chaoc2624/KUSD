# KUSD Frontend - Current Status

## Overview
This is the frontend application for the KUSD DeFi protocol. Currently, the frontend is configured but the smart contracts are not deployed, which is why you're seeing the "missing revert data" error.

## Current Issue
The frontend is trying to interact with smart contracts that haven't been deployed yet. The error occurs because:

1. **Contract addresses are hardcoded** in `src/consts/ContractAddress.tsx`
2. **Contracts don't exist** on the network yet
3. **Frontend expects deployed contracts** to handle deposits

## What You Need to Do

### Option 1: Deploy the Smart Contracts (Recommended)
1. **Deploy contracts to Sepolia testnet:**
   ```bash
   cd /path/to/KUSD
   npm run deploy:sepolia
   ```

2. **Update contract addresses:**
   - Copy the deployed addresses from the deployment output
   - Update `src/consts/ContractAddress.tsx` with the real addresses
   - Replace the placeholder addresses with actual deployed contract addresses

3. **Restart the frontend:**
   ```bash
   cd frontend/kusd-frontend
   npm run dev
   ```

### Option 2: Use a Different Network
If you want to test on a different network:
1. Update the hardcoded addresses in `ContractAddress.tsx`
2. Make sure the contracts are deployed on that network
3. Update the network configuration

## Current Frontend Features
- ✅ Wallet connection (MetaMask, WalletConnect)
- ✅ Network detection and switching
- ✅ Token selection interface
- ✅ Amount input and validation
- ✅ Contract status checking
- ❌ Actual deposits (requires deployed contracts)

## Architecture Notes
The frontend is designed to work with:
- **MasterVault**: Main contract for user deposits
- **CollateralManager**: Manages collateral and lending
- **RiskManager**: Handles risk parameters
- **Various Vaults**: RWA, LST, DeFi, Options vaults

## Development Status
- **Frontend**: ✅ Complete and functional
- **Smart Contracts**: ✅ Written and tested
- **Deployment**: ❌ Not deployed yet
- **Integration**: ❌ Frontend-backend not connected

## Next Steps
1. Deploy the smart contracts
2. Update the frontend configuration
3. Test the complete deposit flow
4. Implement additional features (withdrawals, portfolio view, etc.)

## Troubleshooting
If you continue to see errors:
1. Check that contracts are deployed on the correct network
2. Verify contract addresses are correct
3. Ensure the network matches between frontend and contracts
4. Check browser console for detailed error messages

## Support
For issues related to:
- **Frontend**: Check this README and the component files
- **Smart Contracts**: Check the main project README and deployment scripts
- **Deployment**: Check `DEPLOYMENT.md` in the root directory