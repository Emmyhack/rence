const hre = require("hardhat");

// Update these addresses as needed
const USDT_ADDRESS = "0xa594DC91dc16b95047370909422830c88a793Ea1";
const STAKING_GROUP_ADDRESS = "YOUR_STAKING_GROUP_ADDRESS"; // <-- Replace with actual deployed address
const MINT_TO_ADDRESS = "YOUR_USER_ADDRESS"; // <-- Replace with user address (or leave blank to use deployer)

async function main() {
  const usdt = await hre.ethers.getContractAt("MockUSDT", USDT_ADDRESS);
  const stakingGroup = await hre.ethers.getContractAt("RenceStakingGroup", STAKING_GROUP_ADDRESS);
  const [deployer, user1] = await hre.ethers.getSigners();
  const mintTo = MINT_TO_ADDRESS && MINT_TO_ADDRESS !== "YOUR_USER_ADDRESS" ? MINT_TO_ADDRESS : user1.address;
  const baseStake = hre.ethers.utils.parseUnits("100", 6); // 100 USDT

  // Mint USDT to user
  const mintTx = await usdt.mint(mintTo, baseStake);
  await mintTx.wait();
  console.log(`Minted 100 USDT to ${mintTo}`);

  // Approve staking group to spend USDT
  const approveTx = await usdt.connect(user1).approve(STAKING_GROUP_ADDRESS, baseStake);
  await approveTx.wait();
  console.log(`Approved staking group to spend 100 USDT from ${user1.address}`);

  // Join the staking group (creator must call joinGroup first after deployment)
  const joinTx = await stakingGroup.connect(user1).joinGroup();
  await joinTx.wait();
  console.log(`${user1.address} joined the staking group!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 