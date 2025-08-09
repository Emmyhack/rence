// scripts/deploy-kaia-with-new-usdt.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Network:", hre.network.name);

  // Use the newly deployed MockUSDT address
  const usdtAddress = "0xa594DC91dc16b95047370909422830c88a793Ea1";
  console.log("Using existing MockUSDT at:", usdtAddress);

  // Deploy Treasury
  const Treasury = await hre.ethers.getContractFactory("RenceTreasury");
  const treasury = await Treasury.deploy(usdtAddress);
  await treasury.deployed();
  console.log("RenceTreasury deployed to:", treasury.address);

  // Deploy Staking Group (example params)
  const StakingGroup = await hre.ethers.getContractFactory("RenceStakingGroup");
  const baseStake = hre.ethers.utils.parseUnits("100", 6); // 100 USDT
  const totalCycles = 5;
  const cycleDuration = 60 * 60 * 24 * 7; // 1 week
  const stakingGroup = await StakingGroup.deploy(usdtAddress, treasury.address, baseStake, totalCycles, cycleDuration);
  await stakingGroup.deployed();
  console.log("RenceStakingGroup deployed to:", stakingGroup.address);

  // Deploy Non-Staking Group (example params)
  const NonStakingGroup = await hre.ethers.getContractFactory("RenceNonStakingGroup");
  const groupName = "Demo Group";
  const contributionAmount = hre.ethers.utils.parseUnits("100", 6);
  const nonStakingGroup = await NonStakingGroup.deploy(usdtAddress, treasury.address, groupName, contributionAmount, totalCycles, cycleDuration);
  await nonStakingGroup.deployed();
  console.log("RenceNonStakingGroup deployed to:", nonStakingGroup.address);

  // Deploy Forum
  const Forum = await hre.ethers.getContractFactory("RenceForum");
  const forum = await Forum.deploy();
  await forum.deployed();
  console.log("RenceForum deployed to:", forum.address);

  console.log("\n=== Deployment Summary ===");
  console.log("MockUSDT:", usdtAddress);
  console.log("RenceTreasury:", treasury.address);
  console.log("RenceStakingGroup:", stakingGroup.address);
  console.log("RenceNonStakingGroup:", nonStakingGroup.address);
  console.log("RenceForum:", forum.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});