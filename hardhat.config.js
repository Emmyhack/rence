require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    // Local development
    hardhat: {
      chainId: 1337
    },
    // Kaia Mainnet
    kaia: {
      url: process.env.RPC_URL || "https://public-en-cypress.kaia.io",
      chainId: 8217,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    // Kaia Testnet (Kairos)
    kairos: {
      url: process.env.RPC_URL || "https://public-en-kairos.kaia.io",
      chainId: 1001,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  mocha: {
    timeout: 40000
  }
};
