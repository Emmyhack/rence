const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Hemat DeFi Thrift Platform...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    
    // Deploy MockUSDT first (for testing)
    console.log("\n1. Deploying MockUSDT...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.deployed();
    console.log("MockUSDT deployed to:", mockUSDT.address);
    
    // Deploy MockDeFiAdapter
    console.log("\n2. Deploying MockDeFiAdapter...");
    const MockDeFiAdapter = await ethers.getContractFactory("MockDeFiAdapter");
    const mockDeFiAdapter = await MockDeFiAdapter.deploy(mockUSDT.address);
    await mockDeFiAdapter.deployed();
    console.log("MockDeFiAdapter deployed to:", mockDeFiAdapter.address);
    
    // Deploy InsurancePool
    console.log("\n3. Deploying InsurancePool...");
    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    const insurancePool = await InsurancePool.deploy(mockUSDT.address);
    await insurancePool.deployed();
    console.log("InsurancePool deployed to:", insurancePool.address);
    
    // Deploy StakeManager
    console.log("\n4. Deploying StakeManager...");
    const StakeManager = await ethers.getContractFactory("StakeManager");
    const stakeManager = await StakeManager.deploy(mockUSDT.address);
    await stakeManager.deployed();
    console.log("StakeManager deployed to:", stakeManager.address);
    
    // Deploy EscrowVault
    console.log("\n5. Deploying EscrowVault...");
    const EscrowVault = await ethers.getContractFactory("EscrowVault");
    const escrowVault = await EscrowVault.deploy(
        mockUSDT.address,
        mockDeFiAdapter.address,
        insurancePool.address
    );
    await escrowVault.deployed();
    console.log("EscrowVault deployed to:", escrowVault.address);
    
    // Deploy HematFactory
    console.log("\n6. Deploying HematFactory...");
    const HematFactory = await ethers.getContractFactory("HematFactory");
    const hematFactory = await HematFactory.deploy(
        escrowVault.address,
        stakeManager.address,
        insurancePool.address
    );
    await hematFactory.deployed();
    console.log("HematFactory deployed to:", hematFactory.address);
    
    // Set up permissions
    console.log("\n7. Setting up permissions...");
    
    // Transfer ownership of EscrowVault to factory
    await escrowVault.transferOwnership(hematFactory.address);
    console.log("EscrowVault ownership transferred to factory");
    
    // Transfer ownership of StakeManager to factory
    await stakeManager.transferOwnership(hematFactory.address);
    console.log("StakeManager ownership transferred to factory");
    
    // Transfer ownership of InsurancePool to factory
    await insurancePool.transferOwnership(hematFactory.address);
    console.log("InsurancePool ownership transferred to factory");
    
    console.log("\n=== Deployment Summary ===");
    console.log("MockUSDT:", mockUSDT.address);
    console.log("MockDeFiAdapter:", mockDeFiAdapter.address);
    console.log("InsurancePool:", insurancePool.address);
    console.log("StakeManager:", stakeManager.address);
    console.log("EscrowVault:", escrowVault.address);
    console.log("HematFactory:", hematFactory.address);
    console.log("\nDeployment completed successfully!");
    
    // Save deployment addresses
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        contracts: {
            mockUSDT: mockUSDT.address,
            mockDeFiAdapter: mockDeFiAdapter.address,
            insurancePool: insurancePool.address,
            stakeManager: stakeManager.address,
            escrowVault: escrowVault.address,
            hematFactory: hematFactory.address
        },
        timestamp: new Date().toISOString()
    };
    
    console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });