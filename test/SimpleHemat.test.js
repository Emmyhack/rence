const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Hemat Tests", function () {
    let mockUSDT, mockDeFiAdapter, insurancePool, stakeManager, escrowVault, hematFactory;
    let owner, member1, member2;
    
    beforeEach(async function () {
        [owner, member1, member2] = await ethers.getSigners();
        
        // Deploy MockUSDT
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        mockUSDT = await MockUSDT.deploy();
        await mockUSDT.deployed();
        
        // Mint USDT to test accounts
        await mockUSDT.mint(owner.address, ethers.utils.parseUnits("10000", 6));
        await mockUSDT.mint(member1.address, ethers.utils.parseUnits("1000", 6));
        await mockUSDT.mint(member2.address, ethers.utils.parseUnits("1000", 6));
        
        // Deploy MockDeFiAdapter
        const MockDeFiAdapter = await ethers.getContractFactory("MockDeFiAdapter");
        mockDeFiAdapter = await MockDeFiAdapter.deploy(mockUSDT.address);
        await mockDeFiAdapter.deployed();
        
        // Deploy InsurancePool
        const InsurancePool = await ethers.getContractFactory("InsurancePool");
        insurancePool = await InsurancePool.deploy(mockUSDT.address);
        await insurancePool.deployed();
        
        // Deploy StakeManager
        const StakeManager = await ethers.getContractFactory("StakeManager");
        stakeManager = await StakeManager.deploy(mockUSDT.address);
        await stakeManager.deployed();
        
        // Deploy EscrowVault
        const EscrowVault = await ethers.getContractFactory("EscrowVault");
        escrowVault = await EscrowVault.deploy(
            mockUSDT.address,
            mockDeFiAdapter.address,
            insurancePool.address
        );
        await escrowVault.deployed();
        
        // Deploy HematFactory
        const HematFactory = await ethers.getContractFactory("HematFactory");
        hematFactory = await HematFactory.deploy(
            escrowVault.address,
            stakeManager.address,
            insurancePool.address
        );
        await hematFactory.deployed();
        
        // Set up permissions
        await escrowVault.transferOwnership(hematFactory.address);
        await stakeManager.transferOwnership(hematFactory.address);
        await insurancePool.transferOwnership(hematFactory.address);
    });
    
    describe("Basic Deployment", function () {
        it("Should deploy all contracts successfully", async function () {
            expect(mockUSDT.address).to.not.equal(ethers.constants.AddressZero);
            expect(mockDeFiAdapter.address).to.not.equal(ethers.constants.AddressZero);
            expect(insurancePool.address).to.not.equal(ethers.constants.AddressZero);
            expect(stakeManager.address).to.not.equal(ethers.constants.AddressZero);
            expect(escrowVault.address).to.not.equal(ethers.constants.AddressZero);
            expect(hematFactory.address).to.not.equal(ethers.constants.AddressZero);
        });
        
        it("Should have correct USDT balances", async function () {
            const ownerBalance = await mockUSDT.balanceOf(owner.address);
            const member1Balance = await mockUSDT.balanceOf(member1.address);
            
            expect(ownerBalance).to.equal(ethers.utils.parseUnits("10000", 6));
            expect(member1Balance).to.equal(ethers.utils.parseUnits("1000", 6));
        });
    });
    
    describe("MockUSDT", function () {
        it("Should mint tokens correctly", async function () {
            const initialBalance = await mockUSDT.balanceOf(member1.address);
            await mockUSDT.mint(member1.address, ethers.utils.parseUnits("100", 6));
            const finalBalance = await mockUSDT.balanceOf(member1.address);
            
            expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseUnits("100", 6));
        });
        
        it("Should transfer tokens correctly", async function () {
            const transferAmount = ethers.utils.parseUnits("50", 6);
            const initialBalance = await mockUSDT.balanceOf(member2.address);
            await mockUSDT.transfer(member2.address, transferAmount);
            const finalBalance = await mockUSDT.balanceOf(member2.address);
            
            expect(finalBalance.sub(initialBalance)).to.equal(transferAmount);
        });
    });
    
    describe("MockDeFiAdapter", function () {
        it("Should deposit funds correctly", async function () {
            const depositAmount = ethers.utils.parseUnits("1000", 6);
            await mockUSDT.approve(mockDeFiAdapter.address, depositAmount);
            await mockDeFiAdapter.deposit(depositAmount);
            
            const strategyBalance = await mockDeFiAdapter.strategyBalance();
            expect(strategyBalance).to.equal(depositAmount);
        });
        
        it("Should harvest yield correctly", async function () {
            const depositAmount = ethers.utils.parseUnits("1000", 6);
            await mockUSDT.approve(mockDeFiAdapter.address, depositAmount);
            await mockDeFiAdapter.deposit(depositAmount);
            
            // Fast forward time to generate yield
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 3600]); // 1 year
            await ethers.provider.send("evm_mine");
            
            const harvestedAmount = await mockDeFiAdapter.harvest();
            expect(harvestedAmount).to.be.gt(0);
        });
    });
    
    describe("StakeManager", function () {
        it("Should deposit stake correctly", async function () {
            const stakeAmount = ethers.utils.parseUnits("50", 6);
            await mockUSDT.approve(stakeManager.address, stakeAmount);
            await stakeManager.depositStake(member1.address, ethers.constants.AddressZero, stakeAmount);
            
            const memberStake = await stakeManager.getMemberStake(member1.address, ethers.constants.AddressZero);
            expect(memberStake).to.equal(stakeAmount);
        });
        
        it("Should penalize stake correctly", async function () {
            const stakeAmount = ethers.utils.parseUnits("50", 6);
            await mockUSDT.approve(stakeManager.address, stakeAmount);
            await stakeManager.depositStake(member1.address, ethers.constants.AddressZero, stakeAmount);
            
            const penaltyAmount = ethers.utils.parseUnits("20", 6);
            await stakeManager.penalizeStake(member1.address, ethers.constants.AddressZero, penaltyAmount, "Test penalty");
            
            const remainingStake = await stakeManager.getMemberStake(member1.address, ethers.constants.AddressZero);
            expect(remainingStake).to.equal(stakeAmount.sub(penaltyAmount));
        });
        
        it("Should update trust score correctly", async function () {
            await stakeManager.initializeTrustScore(member1.address);
            let trustScore = await stakeManager.getTrustScore(member1.address);
            expect(trustScore).to.equal(500); // Default trust score
            
            await stakeManager.rewardMember(member1.address);
            trustScore = await stakeManager.getTrustScore(member1.address);
            expect(trustScore).to.equal(510); // Increased by 10
        });
    });
    
    describe("InsurancePool", function () {
        it("Should collect premium correctly", async function () {
            const contributionAmount = ethers.utils.parseUnits("100", 6);
            await mockUSDT.approve(insurancePool.address, contributionAmount);
            await insurancePool.collectPremium(ethers.constants.AddressZero, member1.address, contributionAmount);
            
            const poolStats = await insurancePool.getPoolStats();
            expect(poolStats[0]).to.be.gt(0); // totalPremium
        });
    });
    
    describe("EscrowVault", function () {
        it("Should deposit funds correctly", async function () {
            const contributionAmount = ethers.utils.parseUnits("100", 6);
            await mockUSDT.approve(escrowVault.address, contributionAmount);
            await escrowVault.deposit(ethers.constants.AddressZero, member1.address, contributionAmount);
            
            const groupBalance = await escrowVault.groupBalances(ethers.constants.AddressZero);
            expect(groupBalance).to.equal(contributionAmount);
        });
        
        it("Should withdraw funds correctly", async function () {
            const contributionAmount = ethers.utils.parseUnits("100", 6);
            await mockUSDT.approve(escrowVault.address, contributionAmount);
            await escrowVault.deposit(ethers.constants.AddressZero, member1.address, contributionAmount);
            
            const initialBalance = await mockUSDT.balanceOf(member2.address);
            await escrowVault.withdraw(ethers.constants.AddressZero, member2.address, contributionAmount);
            const finalBalance = await mockUSDT.balanceOf(member2.address);
            
            expect(finalBalance.sub(initialBalance)).to.equal(contributionAmount);
        });
    });
    
    describe("HematFactory", function () {
        it("Should create group correctly", async function () {
            const groupCreationFee = await hematFactory.groupCreationFee();
            const payoutOrder = [member1.address, member2.address];
            
            await hematFactory.createGroup(
                0, // ROTATIONAL model
                ethers.utils.parseUnits("100", 6),
                7 * 24 * 3600, // 7 days
                2, // group size
                payoutOrder,
                true, // insurance enabled
                ethers.utils.parseUnits("50", 6), // stake required
                0, // lock duration
                500 // early withdrawal penalty (5%)
            );
            
            const groupId = await hematFactory.nextGroupId();
            expect(groupId).to.equal(2); // 1-based indexing
        });
    });
});