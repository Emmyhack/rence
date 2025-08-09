require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-gas-reporter");
require("solidity-coverage");

console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "***CONFIGURED***" : "NOT_SET");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000  // Higher runs for smaller code size
      },
      viaIR: true  // Enable intermediate representation for better optimization
    }
  },
  networks: {
    // Local development
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
    },
    // Kaia Mainnet
    kaia: {
      url: process.env.RPC_URL || "https://public-en-cypress.kaia.io",
      chainId: 8217,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 8500000,
      gasPrice: 25000000000, // 25 gwei
    },
    // Kaia Testnet (Kairos)
    kairos: {
      url: process.env.RPC_URL || "https://public-en-kairos.kaia.io",
      chainId: 1001,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 8500000,
      gasPrice: 25000000000, // 25 gwei
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    apiKey: {
      kaia: process.env.KAIASCOPE_API_KEY || "abc",
      kairos: process.env.KAIASCOPE_API_KEY || "abc"
    }
  },
  mocha: {
    timeout: 40000
  }
};
