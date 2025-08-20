import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { MasterVault, RiskManager, Stablecoin } from "../typechain-types";

describe("MasterVault", function () {
  let masterVault: MasterVault;
  let riskManager: RiskManager;
  let stablecoin: Stablecoin;
  let mockRWAVault: any;
  let mockLSTVault: any;
  let owner: Signer;
  let user: Signer;
  let aiSigner: Signer;

  beforeEach(async function () {
    [owner, user, aiSigner] = await ethers.getSigners();

    // Deploy mock stablecoin
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockStablecoin = await MockERC20.deploy("KUSD", "KUSD", 18);
    stablecoin = mockStablecoin as unknown as Stablecoin;

    // Deploy Risk Manager
    const RiskManagerFactory = await ethers.getContractFactory("RiskManager");
    riskManager = await RiskManagerFactory.deploy(await owner.getAddress());

    // Deploy mock vaults
    const MockVault = await ethers.getContractFactory("MockVault");
    mockRWAVault = await MockVault.deploy(await stablecoin.getAddress());
    mockLSTVault = await MockVault.deploy(await stablecoin.getAddress());

    // Deploy Master Vault
    const MasterVaultFactory = await ethers.getContractFactory("MasterVault");
    masterVault = await MasterVaultFactory.deploy(
      await stablecoin.getAddress(),
      await riskManager.getAddress(),
      await aiSigner.getAddress(),
      await owner.getAddress()
    );

    // Set vaults
    await masterVault.setVaults(
      await mockRWAVault.getAddress(),
      await mockLSTVault.getAddress(),
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );

    // Grant vault manager role to master vault
    const VAULT_MANAGER_ROLE = ethers.id("VAULT_MANAGER_ROLE");
    await mockRWAVault.grantRole(VAULT_MANAGER_ROLE, await masterVault.getAddress());
    await mockLSTVault.grantRole(VAULT_MANAGER_ROLE, await masterVault.getAddress());

    // Mint tokens to user
    await stablecoin.mint(await user.getAddress(), ethers.parseEther("10000"));
  });

  describe("Deposit", function () {
    it("Should deposit with conservative risk profile", async function () {
      const amount = ethers.parseEther("1000");
      
      await stablecoin.connect(user).approve(await masterVault.getAddress(), amount);
      
      await expect(masterVault.connect(user).deposit(amount, 0)) // Conservative profile
        .to.emit(masterVault, "Deposit")
        .withArgs(await user.getAddress(), amount, 0);

      const position = await masterVault.userPositions(await user.getAddress());
      expect(position.totalDeposited).to.equal(amount);
      expect(position.riskProfile).to.equal(0);
    });

    it("Should reject invalid risk profile", async function () {
      const amount = ethers.parseEther("1000");
      
      await stablecoin.connect(user).approve(await masterVault.getAddress(), amount);
      
      await expect(
        masterVault.connect(user).deposit(amount, 5) // Invalid profile
      ).to.be.revertedWithCustomError(masterVault, "InvalidRiskProfile");
    });

    it("Should allocate funds according to risk profile", async function () {
      const amount = ethers.parseEther("1000");
      
      await stablecoin.connect(user).approve(await masterVault.getAddress(), amount);
      await masterVault.connect(user).deposit(amount, 1); // Balanced profile

      // Check that funds were allocated to vaults
      const rwaBalance = await mockRWAVault.balanceOf(await user.getAddress());
      const lstBalance = await mockLSTVault.balanceOf(await user.getAddress());
      
      // Balanced profile: 50% RWA, 40% LST
      expect(rwaBalance).to.equal(ethers.parseEther("500"));
      expect(lstBalance).to.equal(ethers.parseEther("400"));
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1000");
      await stablecoin.connect(user).approve(await masterVault.getAddress(), amount);
      await masterVault.connect(user).deposit(amount, 1);
    });

    it("Should allow user to withdraw", async function () {
      const withdrawAmount = ethers.parseEther("500");
      
      await expect(masterVault.connect(user).withdraw(withdrawAmount))
        .to.emit(masterVault, "Withdraw")
        .withArgs(await user.getAddress(), withdrawAmount);

      const position = await masterVault.userPositions(await user.getAddress());
      expect(position.totalDeposited).to.equal(ethers.parseEther("500"));
    });

    it("Should reject withdrawal of more than deposited", async function () {
      const withdrawAmount = ethers.parseEther("1500");
      
      await expect(
        masterVault.connect(user).withdraw(withdrawAmount)
      ).to.be.revertedWithCustomError(masterVault, "InsufficientBalance");
    });
  });

  describe("AI Rebalance", function () {
    it("Should accept valid AI signature for rebalancing", async function () {
      const params = {
        rwaWeight: 3000,
        lstWeight: 3000,
        defiWeight: 3000,
        optionsWeight: 1000,
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        nonce: 1
      };

      // Create signature
      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256", "address", "uint256"],
        [
          params.rwaWeight,
          params.lstWeight,
          params.defiWeight,
          params.optionsWeight,
          params.deadline,
          params.nonce,
          await masterVault.getAddress(),
          (await ethers.provider.getNetwork()).chainId
        ]
      );

      const signature = await aiSigner.signMessage(ethers.getBytes(messageHash));

      await expect(masterVault.aiRebalance(params, signature))
        .to.emit(masterVault, "AIRebalance")
        .withArgs(await aiSigner.getAddress(), params.nonce);
    });

    it("Should reject invalid signature", async function () {
      const params = {
        rwaWeight: 3000,
        lstWeight: 3000,
        defiWeight: 3000,
        optionsWeight: 1000,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 1
      };

      // Sign with wrong signer
      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256", "address", "uint256"],
        [
          params.rwaWeight,
          params.lstWeight,
          params.defiWeight,
          params.optionsWeight,
          params.deadline,
          params.nonce,
          await masterVault.getAddress(),
          (await ethers.provider.getNetwork()).chainId
        ]
      );

      const signature = await user.signMessage(ethers.getBytes(messageHash));

      await expect(
        masterVault.aiRebalance(params, signature)
      ).to.be.revertedWithCustomError(masterVault, "InvalidSignature");
    });

    it("Should reject expired signature", async function () {
      const params = {
        rwaWeight: 3000,
        lstWeight: 3000,
        defiWeight: 3000,
        optionsWeight: 1000,
        deadline: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        nonce: 1
      };

      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256", "address", "uint256"],
        [
          params.rwaWeight,
          params.lstWeight,
          params.defiWeight,
          params.optionsWeight,
          params.deadline,
          params.nonce,
          await masterVault.getAddress(),
          (await ethers.provider.getNetwork()).chainId
        ]
      );

      const signature = await aiSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        masterVault.aiRebalance(params, signature)
      ).to.be.revertedWithCustomError(masterVault, "SignatureExpired");
    });

    it("Should reject invalid weights", async function () {
      const params = {
        rwaWeight: 3000,
        lstWeight: 3000,
        defiWeight: 3000,
        optionsWeight: 2000, // Total > 10000
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 1
      };

      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256", "address", "uint256"],
        [
          params.rwaWeight,
          params.lstWeight,
          params.defiWeight,
          params.optionsWeight,
          params.deadline,
          params.nonce,
          await masterVault.getAddress(),
          (await ethers.provider.getNetwork()).chainId
        ]
      );

      const signature = await aiSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        masterVault.aiRebalance(params, signature)
      ).to.be.revertedWithCustomError(masterVault, "InvalidWeights");
    });
  });

  describe("Manual Rebalance", function () {
    it("Should allow admin to manually rebalance", async function () {
      const REBALANCER_ROLE = await masterVault.REBALANCER_ROLE();
      
      await expect(
        masterVault.connect(owner).manualRebalance(2500, 2500, 2500, 2500)
      ).to.emit(masterVault, "Rebalanced")
        .withArgs(2500, 2500, 2500, 2500);
    });

    it("Should reject manual rebalance from non-admin", async function () {
      await expect(
        masterVault.connect(user).manualRebalance(2500, 2500, 2500, 2500)
      ).to.be.reverted; // AccessControl revert
    });
  });

  describe("TVL Calculation", function () {
    it("Should calculate total value locked correctly", async function () {
      // Mock vault returns
      await mockRWAVault.setTotalAssets(ethers.parseEther("1000"));
      await mockLSTVault.setTotalAssets(ethers.parseEther("2000"));
      
      const tvl = await masterVault.getTotalValueLocked();
      expect(tvl).to.equal(ethers.parseEther("3000"));
    });
  });
});