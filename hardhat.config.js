require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    // Kaia Mainnet
    kaia: {
      url: process.env.RPC_URL || "https://public-en-cypress.kaia.io",
      chainId: 8217,
      accounts: [process.env.PRIVATE_KEY]
    },
    // Kaia Testnet (Kairos)
    kairos: {
      url: process.env.RPC_URL || "https://public-en-kairos.kaia.io",
      chainId: 1001,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
};

// Make sure to set PRIVATE_KEY in your .env file for deployments
