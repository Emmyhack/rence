const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Hemat Platform deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  // Deployment configuration
  const config = {
    // Use existing USDT on Kaia mainnet/testnet or deploy mock for testing
    usdtAddress: process.env.USDT_ADDRESS || null,
    treasuryAddress: process.env.TREASURY_ADDRESS || deployer.address,
    adminAddress: process.env.ADMIN_ADDRESS || deployer.address,
    initialYieldBoost: ethers.utils.parseUnits("1000", 6), // 1000 USDT for testing
  };
  
  let usdtToken;
  
  // Deploy or use existing USDT token
  if (!config.usdtAddress) {
    console.log("📝 Deploying Mock USDT token...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdtToken = await MockUSDT.deploy();
    await usdtToken.deployed();
    console.log("Mock USDT deployed to:", usdtToken.address);
    config.usdtAddress = usdtToken.address;
  } else {
    console.log("📝 Using existing USDT at:", config.usdtAddress);
    usdtToken = await ethers.getContractAt("IERC20", config.usdtAddress);
  }
  
  // Deploy EscrowVault
  console.log("📝 Deploying EscrowVault...");
  const EscrowVault = await ethers.getContractFactory("EscrowVault");
  const escrowVault = await EscrowVault.deploy(
    config.usdtAddress,
    config.treasuryAddress,
    config.adminAddress
  );
  await escrowVault.deployed();
  console.log("EscrowVault deployed to:", escrowVault.address);
  
  // Deploy StakeManager
  console.log("📝 Deploying StakeManager...");
  const StakeManager = await ethers.getContractFactory("StakeManager");
  const stakeManager = await StakeManager.deploy(
    config.usdtAddress,
    config.adminAddress
  );
  await stakeManager.deployed();
  console.log("StakeManager deployed to:", stakeManager.address);
  
  // Deploy InsurancePool
  console.log("📝 Deploying InsurancePool...");
  const InsurancePool = await ethers.getContractFactory("InsurancePool");
  const insurancePool = await InsurancePool.deploy(
    config.usdtAddress,
    config.adminAddress
  );
  await insurancePool.deployed();
  console.log("InsurancePool deployed to:", insurancePool.address);
  
  // Deploy MockDeFiAdapter
  console.log("📝 Deploying MockDeFiAdapter...");
  const MockDeFiAdapter = await ethers.getContractFactory("MockDeFiAdapter");
  const defiAdapter = await MockDeFiAdapter.deploy(config.usdtAddress);
  await defiAdapter.deployed();
  console.log("MockDeFiAdapter deployed to:", defiAdapter.address);
  
  // Deploy HematFactory
  console.log("📝 Deploying HematFactory...");
  const HematFactory = await ethers.getContractFactory("HematFactory");
  const hematFactory = await HematFactory.deploy(
    config.usdtAddress,
    escrowVault.address,
    stakeManager.address,
    insurancePool.address,
    config.adminAddress
  );
  await hematFactory.deployed();
  console.log("HematFactory deployed to:", hematFactory.address);
  
  // Configure contracts
  console.log("⚙️ Configuring contracts...");
  
  // Set DeFi adapter in EscrowVault
  await escrowVault.setDeFiAdapter(defiAdapter.address);
  console.log("✅ DeFi adapter set in EscrowVault");
  
  // Grant HARVESTER role to factory for automatic yield harvesting
  const HARVESTER_ROLE = await escrowVault.HARVESTER_ROLE();
  await escrowVault.grantRole(HARVESTER_ROLE, hematFactory.address);
  console.log("✅ Harvester role granted to HematFactory");
  
  // If using mock USDT, mint some tokens for testing
  if (usdtToken.mint) {
    console.log("💰 Minting test USDT tokens...");
    
    // Mint to deployer
    await usdtToken.mint(deployer.address, ethers.utils.parseUnits("100000", 6)); // 100K USDT
    
    // Mint to DeFi adapter for initial yield simulation
    await usdtToken.mint(defiAdapter.address, config.initialYieldBoost);
    
    console.log("✅ Test tokens minted");
  }
  
  // Verify all deployments
  console.log("🔍 Verifying deployments...");
  
  const deployments = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      USDT: {
        address: config.usdtAddress,
        mock: !process.env.USDT_ADDRESS
      },
      EscrowVault: {
        address: escrowVault.address,
        treasuryAddress: config.treasuryAddress
      },
      StakeManager: {
        address: stakeManager.address
      },
      InsurancePool: {
        address: insurancePool.address
      },
      MockDeFiAdapter: {
        address: defiAdapter.address,
        apy: "8%"
      },
      HematFactory: {
        address: hematFactory.address,
        maxGroupsPerCreator: "10",
        minContributionAmount: "10 USDT",
        maxContributionAmount: "10,000 USDT"
      }
    },
    configuration: {
      platformFeeBps: "100", // 1%
      insuranceBps: "200",   // 2%
      liquidityBufferRatio: "10%",
      gracePeriod: "2 days"
    }
  };
  
  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${network.name}-${network.chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
  
  console.log("📄 Deployment info saved to:", deploymentFile);
  
  // Create environment file for frontend/backend
  const envContent = `
# Hemat Platform - ${network.name} Deployment
REACT_APP_NETWORK_NAME=${network.name}
REACT_APP_CHAIN_ID=${network.chainId}
REACT_APP_USDT_ADDRESS=${config.usdtAddress}
REACT_APP_ESCROW_VAULT_ADDRESS=${escrowVault.address}
REACT_APP_STAKE_MANAGER_ADDRESS=${stakeManager.address}
REACT_APP_INSURANCE_POOL_ADDRESS=${insurancePool.address}
REACT_APP_DEFI_ADAPTER_ADDRESS=${defiAdapter.address}
REACT_APP_HEMAT_FACTORY_ADDRESS=${hematFactory.address}

# Backend Environment
USDT_ADDRESS=${config.usdtAddress}
ESCROW_VAULT_ADDRESS=${escrowVault.address}
STAKE_MANAGER_ADDRESS=${stakeManager.address}
INSURANCE_POOL_ADDRESS=${insurancePool.address}
DEFI_ADAPTER_ADDRESS=${defiAdapter.address}
HEMAT_FACTORY_ADDRESS=${hematFactory.address}
TREASURY_ADDRESS=${config.treasuryAddress}
ADMIN_ADDRESS=${config.adminAddress}
`;
  
  const envFile = path.join(__dirname, "../.env.deployment");
  fs.writeFileSync(envFile, envContent.trim());
  console.log("📄 Environment file created:", envFile);
  
  // Test basic functionality
  console.log("🧪 Testing basic functionality...");
  
  try {
    // Test factory stats
    const stats = await hematFactory.getPlatformStats();
    console.log("✅ Factory stats:", {
      totalGroups: stats.totalGroups.toString(),
      activeGroups: stats.activeGroups.toString()
    });
    
    // Test EscrowVault configuration
    const platformFee = await escrowVault.PLATFORM_FEE_BPS();
    console.log("✅ Platform fee:", platformFee.toString(), "bps");
    
    // Test DeFi adapter
    const apy = await defiAdapter.getAPY();
    console.log("✅ DeFi adapter APY:", apy.toString(), "bps");
    
    // Test insurance pool health
    const poolHealth = await insurancePool.getPoolHealth();
    console.log("✅ Insurance pool health:", {
      totalBalance: poolHealth.totalBalance.toString(),
      reserve: poolHealth.reserve.toString()
    });
    
  } catch (error) {
    console.error("❌ Basic functionality test failed:", error.message);
  }
  
  console.log("\n🎉 Hemat Platform deployment completed successfully!");
  console.log("📋 Summary:");
  console.log("- Network:", network.name);
  console.log("- HematFactory:", hematFactory.address);
  console.log("- EscrowVault:", escrowVault.address);
  console.log("- StakeManager:", stakeManager.address);
  console.log("- InsurancePool:", insurancePool.address);
  console.log("- MockDeFiAdapter:", defiAdapter.address);
  console.log("- USDT Token:", config.usdtAddress);
  
  console.log("\n📖 Next steps:");
  console.log("1. Update frontend/backend .env files with the addresses above");
  console.log("2. Run tests: npm run test");
  console.log("3. Start backend: npm run backend:dev");
  console.log("4. Start frontend: npm run frontend:dev");
  
  if (network.name !== "hardhat") {
    console.log("5. Verify contracts on explorer (optional)");
    console.log("   - npx hardhat verify --network", network.name, hematFactory.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });