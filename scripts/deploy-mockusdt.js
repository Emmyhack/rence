const hre = require("hardhat");

async function main() {
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.deployed();
  console.log("MockUSDT deployed to:", usdt.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 