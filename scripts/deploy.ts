import { ethers, upgrades } from "hardhat";
import { writeFileSync } from "fs";
import path from "path";

interface DeploymentAddresses {
  stablecoin: string;
  oracleAdapter: string;
  riskManager: string;
  collateralManager: string;
  rwaVault: string;
  lstVault: string;
  masterVault: string;
  lidoAdapter: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const deploymentAddresses: Partial<DeploymentAddresses> = {};

  // 1. Deploy Stablecoin (KUSD) with upgrades
  console.log("\n1. Deploying Stablecoin...");
  const StablecoinFactory = await ethers.getContractFactory("Stablecoin");
  const stablecoin = await upgrades.deployProxy(
    StablecoinFactory,
    ["KUSD Stablecoin", "KUSD", deployer.address],
    { initializer: "initialize" }
  );
  await stablecoin.waitForDeployment();
  deploymentAddresses.stablecoin = await stablecoin.getAddress();
  console.log("Stablecoin deployed to:", deploymentAddresses.stablecoin);

  // 2. Deploy Oracle Adapter
  console.log("\n2. Deploying Oracle Adapter...");
  const OracleAdapterFactory = await ethers.getContractFactory("OracleAdapter");
  const oracleAdapter = await OracleAdapterFactory.deploy(deployer.address);
  await oracleAdapter.waitForDeployment();
  deploymentAddresses.oracleAdapter = await oracleAdapter.getAddress();
  console.log("Oracle Adapter deployed to:", deploymentAddresses.oracleAdapter);

  // 3. Deploy Risk Manager
  console.log("\n3. Deploying Risk Manager...");
  const RiskManagerFactory = await ethers.getContractFactory("RiskManager");
  const riskManager = await RiskManagerFactory.deploy(deployer.address);
  await riskManager.waitForDeployment();
  deploymentAddresses.riskManager = await riskManager.getAddress();
  console.log("Risk Manager deployed to:", deploymentAddresses.riskManager);

  // 4. Deploy Collateral Manager
  console.log("\n4. Deploying Collateral Manager...");
  const CollateralManagerFactory = await ethers.getContractFactory("CollateralManager");
  const collateralManager = await CollateralManagerFactory.deploy(
    deploymentAddresses.oracleAdapter,
    deploymentAddresses.stablecoin,
    deploymentAddresses.riskManager,
    deployer.address, // treasury
    deployer.address  // admin
  );
  await collateralManager.waitForDeployment();
  deploymentAddresses.collateralManager = await collateralManager.getAddress();
  console.log("Collateral Manager deployed to:", deploymentAddresses.collateralManager);

  // 5. Deploy Lido Adapter
  console.log("\n5. Deploying Lido Adapter...");
  const lidoAddresses = getProtocolAddresses(await ethers.provider.getNetwork());
  const LidoAdapterFactory = await ethers.getContractFactory("LidoAdapter");
  const lidoAdapter = await LidoAdapterFactory.deploy(
    deploymentAddresses.stablecoin,
    lidoAddresses.stETH,
    lidoAddresses.wstETH,
    lidoAddresses.weth,
    lidoAddresses.uniswapRouter,
    deployer.address
  );
  await lidoAdapter.waitForDeployment();
  deploymentAddresses.lidoAdapter = await lidoAdapter.getAddress();
  console.log("Lido Adapter deployed to:", deploymentAddresses.lidoAdapter);

  // 6. Deploy RWA Vault
  console.log("\n6. Deploying RWA Vault...");
  const RWAVaultFactory = await ethers.getContractFactory("RWAVault");
  const rwaVault = await RWAVaultFactory.deploy(
    deploymentAddresses.stablecoin,
    deployer.address,
    "RWA Vault"
  );
  await rwaVault.waitForDeployment();
  deploymentAddresses.rwaVault = await rwaVault.getAddress();
  console.log("RWA Vault deployed to:", deploymentAddresses.rwaVault);

  // 7. Deploy LST Vault
  console.log("\n7. Deploying LST Vault...");
  const LSTVaultFactory = await ethers.getContractFactory("LSTVault");
  const lstVault = await LSTVaultFactory.deploy(
    deploymentAddresses.stablecoin,
    deploymentAddresses.lidoAdapter,
    deployer.address
  );
  await lstVault.waitForDeployment();
  deploymentAddresses.lstVault = await lstVault.getAddress();
  console.log("LST Vault deployed to:", deploymentAddresses.lstVault);

  // 8. Deploy Master Vault
  console.log("\n8. Deploying Master Vault...");
  const MasterVaultFactory = await ethers.getContractFactory("MasterVault");
  const masterVault = await MasterVaultFactory.deploy(
    deploymentAddresses.stablecoin,
    deploymentAddresses.riskManager,
    deployer.address, // AI signer (use deployer for testing)
    deployer.address  // admin
  );
  await masterVault.waitForDeployment();
  deploymentAddresses.masterVault = await masterVault.getAddress();
  console.log("Master Vault deployed to:", deploymentAddresses.masterVault);

  // 9. Setup roles and permissions
  console.log("\n9. Setting up roles and permissions...");
  
  // Grant MINTER_ROLE and BURNER_ROLE to CollateralManager
  const MINTER_ROLE = await stablecoin.MINTER_ROLE();
  const BURNER_ROLE = await stablecoin.BURNER_ROLE();
  
  await stablecoin.grantRole(MINTER_ROLE, deploymentAddresses.collateralManager);
  await stablecoin.grantRole(BURNER_ROLE, deploymentAddresses.collateralManager);
  console.log("Granted minter and burner roles to CollateralManager");

  // Grant VAULT_MANAGER_ROLE to MasterVault for vaults
  const VAULT_MANAGER_ROLE = ethers.id("VAULT_MANAGER_ROLE");
  await rwaVault.grantRole(VAULT_MANAGER_ROLE, deploymentAddresses.masterVault);
  await lstVault.grantRole(VAULT_MANAGER_ROLE, deploymentAddresses.masterVault);
  console.log("Granted vault manager roles to MasterVault");

  // Grant VAULT_ROLE to LST Vault for Lido Adapter
  const VAULT_ROLE = ethers.id("VAULT_ROLE");
  await lidoAdapter.grantRole(VAULT_ROLE, deploymentAddresses.lstVault);
  console.log("Granted vault role to LST Vault for Lido Adapter");

  // 10. Set up vaults in Master Vault
  await masterVault.setVaults(
    deploymentAddresses.rwaVault,
    deploymentAddresses.lstVault,
    ethers.ZeroAddress, // defiVault - not deployed yet
    ethers.ZeroAddress  // optionsVault - not deployed yet
  );
  console.log("Set vaults in Master Vault");

  // 11. Configure oracle feeds (example for mainnet fork)
  if (await ethers.provider.getNetwork().then(n => n.chainId === 1n)) {
    console.log("\n11. Configuring oracle feeds for mainnet...");
    await setupOracleFeeds(oracleAdapter);
  }

  // 12. Configure supported collateral tokens
  console.log("\n12. Configuring collateral tokens...");
  await setupCollateralTokens(collateralManager, riskManager);

  // Save deployment addresses
  const deploymentData = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deploymentAddresses
  };

  const deploymentPath = path.join(__dirname, "..", "deployments.json");
  writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`\nDeployment addresses saved to ${deploymentPath}`);

  console.log("\n✅ Deployment completed successfully!");
  console.log("\nDeployed contracts:");
  Object.entries(deploymentAddresses).forEach(([name, address]) => {
    console.log(`${name}: ${address}`);
  });
}

function getProtocolAddresses(network: any) {
  // Mainnet addresses
  if (network.chainId === 1n) {
    return {
      stETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
      weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      usdc: "0xA0b86991c431C90744B78b1ea8DbfEF6FBD5B255B",
      chainlinkETHUSD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      chainlinkUSDCUSD: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6"
    };
  }
  
  // Sepolia testnet addresses (these would need to be updated with actual testnet addresses)
  return {
    stETH: ethers.ZeroAddress,
    wstETH: ethers.ZeroAddress,
    weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // Sepolia WETH
    uniswapRouter: ethers.ZeroAddress,
    usdc: ethers.ZeroAddress,
    chainlinkETHUSD: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Sepolia ETH/USD
    chainlinkUSDCUSD: ethers.ZeroAddress
  };
}

async function setupOracleFeeds(oracleAdapter: any) {
  const addresses = getProtocolAddresses(await ethers.provider.getNetwork());
  
  // Set up ETH/USD feed
  if (addresses.chainlinkETHUSD !== ethers.ZeroAddress) {
    await oracleAdapter.setPriceFeed(
      addresses.weth,
      addresses.chainlinkETHUSD,
      18, // WETH decimals
      3600 // 1 hour max staleness
    );
    console.log("Set ETH/USD oracle feed");
  }

  // Set up USDC/USD feed
  if (addresses.chainlinkUSDCUSD !== ethers.ZeroAddress) {
    await oracleAdapter.setPriceFeed(
      addresses.usdc,
      addresses.chainlinkUSDCUSD,
      6, // USDC decimals
      3600 // 1 hour max staleness
    );
    console.log("Set USDC/USD oracle feed");
  }
}

async function setupCollateralTokens(collateralManager: any, riskManager: any) {
  const addresses = getProtocolAddresses(await ethers.provider.getNetwork());
  
  // Configure WETH as collateral
  if (addresses.weth !== ethers.ZeroAddress) {
    await riskManager.setTokenRisk(
      addresses.weth,
      7500, // 75% max LTV
      8500, // 85% liquidation threshold
      1000, // 10% liquidation bonus
      ethers.parseEther("10000") // 10,000 ETH max supply
    );
    
    await collateralManager.addCollateralToken(
      addresses.weth,
      ethers.parseEther("10000")
    );
    console.log("Configured WETH as collateral");
  }

  // Configure USDC as collateral
  if (addresses.usdc !== ethers.ZeroAddress) {
    await riskManager.setTokenRisk(
      addresses.usdc,
      9000, // 90% max LTV
      9500, // 95% liquidation threshold
      500,  // 5% liquidation bonus
      ethers.parseUnits("50000000", 6) // 50M USDC max supply
    );
    
    await collateralManager.addCollateralToken(
      addresses.usdc,
      ethers.parseUnits("50000000", 6)
    );
    console.log("Configured USDC as collateral");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });