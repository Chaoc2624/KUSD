import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Signer } from "ethers";
import { 
  Stablecoin, 
  CollateralManager, 
  OracleAdapter, 
  RiskManager 
} from "../typechain-types";

describe("CollateralManager", function () {
  let stablecoin: Stablecoin;
  let collateralManager: CollateralManager;
  let oracleAdapter: OracleAdapter;
  let riskManager: RiskManager;
  let owner: Signer;
  let user: Signer;
  let treasury: Signer;
  let mockWETH: any;
  let mockOracle: any;

  beforeEach(async function () {
    [owner, user, treasury] = await ethers.getSigners();

    // Deploy mock WETH
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockWETH = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    await mockWETH.waitForDeployment();

    // Deploy mock oracle
    const MockOracle = await ethers.getContractFactory("MockAggregatorV3");
    mockOracle = await MockOracle.deploy(8, ethers.parseUnits("3000", 8)); // $3000
    await mockOracle.waitForDeployment();

    // Deploy Stablecoin
    const StablecoinFactory = await ethers.getContractFactory("Stablecoin");
    stablecoin = await upgrades.deployProxy(
      StablecoinFactory,
      ["KUSD Stablecoin", "KUSD", await owner.getAddress()],
      { initializer: "initialize" }
    ) as unknown as Stablecoin;

    // Deploy Oracle Adapter
    const OracleAdapterFactory = await ethers.getContractFactory("OracleAdapter");
    oracleAdapter = await OracleAdapterFactory.deploy(await owner.getAddress());

    // Deploy Risk Manager
    const RiskManagerFactory = await ethers.getContractFactory("RiskManager");
    riskManager = await RiskManagerFactory.deploy(await owner.getAddress());

    // Deploy Collateral Manager
    const CollateralManagerFactory = await ethers.getContractFactory("CollateralManager");
    collateralManager = await CollateralManagerFactory.deploy(
      await oracleAdapter.getAddress(),
      await stablecoin.getAddress(),
      await riskManager.getAddress(),
      await treasury.getAddress(),
      await owner.getAddress()
    );

    // Setup roles
    const MINTER_ROLE = await stablecoin.MINTER_ROLE();
    const BURNER_ROLE = await stablecoin.BURNER_ROLE();
    await stablecoin.grantRole(MINTER_ROLE, await collateralManager.getAddress());
    await stablecoin.grantRole(BURNER_ROLE, await collateralManager.getAddress());

    // Setup oracle feed
    await oracleAdapter.setPriceFeed(
      await mockWETH.getAddress(),
      await mockOracle.getAddress(),
      18,
      3600
    );

    // Setup risk parameters
    await riskManager.setTokenRisk(
      await mockWETH.getAddress(),
      7500, // 75% max LTV
      8500, // 85% liquidation threshold
      1000, // 10% liquidation bonus
      ethers.parseEther("10000")
    );

    // Add collateral token
    await collateralManager.addCollateralToken(
      await mockWETH.getAddress(),
      ethers.parseEther("10000")
    );

    // Mint mock WETH to user
    await mockWETH.mint(await user.getAddress(), ethers.parseEther("10"));
  });

  describe("Deposit", function () {
    it("Should allow user to deposit collateral", async function () {
      const depositAmount = ethers.parseEther("1");
      
      await mockWETH.connect(user).approve(await collateralManager.getAddress(), depositAmount);
      
      await expect(collateralManager.connect(user).deposit(await mockWETH.getAddress(), depositAmount))
        .to.emit(collateralManager, "Deposit")
        .withArgs(
          await user.getAddress(),
          await mockWETH.getAddress(),
          depositAmount,
          ethers.parseEther("3000") // $3000 worth
        );

      const position = await collateralManager.positions(await user.getAddress());
      expect(position.collateralValue).to.equal(ethers.parseEther("3000"));
    });

    it("Should reject deposit of unsupported token", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const unsupportedToken = await MockERC20.deploy("Unsupported", "UNSUP", 18);
      
      await expect(
        collateralManager.connect(user).deposit(await unsupportedToken.getAddress(), ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(collateralManager, "TokenNotSupported");
    });
  });

  describe("Borrow", function () {
    beforeEach(async function () {
      // User deposits 1 WETH ($3000)
      const depositAmount = ethers.parseEther("1");
      await mockWETH.connect(user).approve(await collateralManager.getAddress(), depositAmount);
      await collateralManager.connect(user).deposit(await mockWETH.getAddress(), depositAmount);
    });

    it("Should allow user to borrow against collateral", async function () {
      const borrowAmount = ethers.parseEther("2000"); // $2000
      
      await expect(collateralManager.connect(user).borrow(borrowAmount))
        .to.emit(collateralManager, "Borrow")
        .withArgs(await user.getAddress(), borrowAmount, ethers.parseEther("10")); // 0.5% fee

      const kusdBalance = await stablecoin.balanceOf(await user.getAddress());
      expect(kusdBalance).to.equal(borrowAmount);

      const position = await collateralManager.positions(await user.getAddress());
      expect(position.debt).to.equal(borrowAmount + ethers.parseEther("10"));
    });

    it("Should reject borrow if insufficient collateral", async function () {
      const borrowAmount = ethers.parseEther("2500"); // Too much for $3000 collateral
      
      await expect(
        collateralManager.connect(user).borrow(borrowAmount)
      ).to.be.revertedWithCustomError(collateralManager, "InsufficientCollateral");
    });
  });

  describe("Repay", function () {
    beforeEach(async function () {
      // User deposits and borrows
      const depositAmount = ethers.parseEther("1");
      await mockWETH.connect(user).approve(await collateralManager.getAddress(), depositAmount);
      await collateralManager.connect(user).deposit(await mockWETH.getAddress(), depositAmount);
      
      const borrowAmount = ethers.parseEther("1000");
      await collateralManager.connect(user).borrow(borrowAmount);
    });

    it("Should allow user to repay debt", async function () {
      const repayAmount = ethers.parseEther("500");
      
      await stablecoin.connect(user).approve(await collateralManager.getAddress(), repayAmount);
      
      await expect(collateralManager.connect(user).repay(repayAmount))
        .to.emit(collateralManager, "Repay")
        .withArgs(await user.getAddress(), repayAmount, 0);

      const position = await collateralManager.positions(await user.getAddress());
      // Original debt: 1000 + 5 (fee) = 1005, after repaying 500 = 505
      expect(position.debt).to.equal(ethers.parseEther("505"));
    });
  });

  describe("Liquidation", function () {
    beforeEach(async function () {
      // Setup liquidator role
      const LIQUIDATOR_ROLE = await collateralManager.LIQUIDATOR_ROLE();
      await collateralManager.grantRole(LIQUIDATOR_ROLE, await owner.getAddress());

      // User deposits and borrows
      const depositAmount = ethers.parseEther("1");
      await mockWETH.connect(user).approve(await collateralManager.getAddress(), depositAmount);
      await collateralManager.connect(user).deposit(await mockWETH.getAddress(), depositAmount);
      
      const borrowAmount = ethers.parseEther("2000");
      await collateralManager.connect(user).borrow(borrowAmount);
    });

    it("Should liquidate unhealthy position", async function () {
      // Drop ETH price to $2000 to make position liquidatable
      await mockOracle.setPrice(ethers.parseUnits("2000", 8));
      
      const repayAmount = ethers.parseEther("1000");
      await stablecoin.mint(await owner.getAddress(), repayAmount);
      await stablecoin.connect(owner).approve(await collateralManager.getAddress(), repayAmount);
      
      await expect(
        collateralManager.connect(owner).liquidate(
          await user.getAddress(),
          await mockWETH.getAddress(),
          repayAmount
        )
      ).to.emit(collateralManager, "Liquidation");
    });

    it("Should not liquidate healthy position", async function () {
      const repayAmount = ethers.parseEther("100");
      await stablecoin.mint(await owner.getAddress(), repayAmount);
      await stablecoin.connect(owner).approve(await collateralManager.getAddress(), repayAmount);
      
      await expect(
        collateralManager.connect(owner).liquidate(
          await user.getAddress(),
          await mockWETH.getAddress(),
          repayAmount
        )
      ).to.be.revertedWithCustomError(collateralManager, "PositionNotLiquidatable");
    });
  });

  describe("Health Factor", function () {
    it("Should calculate health factor correctly", async function () {
      // User deposits 1 WETH ($3000) and borrows $1000
      const depositAmount = ethers.parseEther("1");
      await mockWETH.connect(user).approve(await collateralManager.getAddress(), depositAmount);
      await collateralManager.connect(user).deposit(await mockWETH.getAddress(), depositAmount);
      
      const borrowAmount = ethers.parseEther("1000");
      await collateralManager.connect(user).borrow(borrowAmount);
      
      const healthFactor = await collateralManager.getHealthFactor(await user.getAddress());
      // Health factor = (3000 * 1e18) / (1000 + 5) ≈ 2.985e18
      expect(healthFactor).to.be.closeTo(ethers.parseEther("2.985"), ethers.parseEther("0.01"));
    });

    it("Should return max uint256 for position with no debt", async function () {
      const depositAmount = ethers.parseEther("1");
      await mockWETH.connect(user).approve(await collateralManager.getAddress(), depositAmount);
      await collateralManager.connect(user).deposit(await mockWETH.getAddress(), depositAmount);
      
      const healthFactor = await collateralManager.getHealthFactor(await user.getAddress());
      expect(healthFactor).to.equal(ethers.MaxUint256);
    });
  });
});