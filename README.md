# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```

# Rence: Blockchain Thrift Platform on Kaia

## Kaia Chain Deployment & Integration Guide

### 1. Deploying to Kaia

- Update your `.env` file with your deployer PRIVATE_KEY.
- Use the provided Hardhat config for Kaia mainnet and testnet (Kairos).
- Deploy contracts to Kaia:
  ```bash
  npx hardhat run scripts/deploy-kaia.js --network kairos # For testnet
  npx hardhat run scripts/deploy-kaia.js --network kaia   # For mainnet
  ```
- Replace `usdtAddress` in `deploy-kaia.js` with the actual USDT contract address on Kaia.

### 2. Wallet Setup

- Use MetaMask or Kaia Wallet.
- For MetaMask, add the Kaia network:
  - **Testnet (Kairos):**
    - RPC: `https://public-en-kairos.kaia.io`
    - Chain ID: `1001`
    - Currency: `KAIA`
  - **Mainnet:**
    - RPC: `https://public-en-cypress.kaia.io`
    - Chain ID: `8217`
    - Currency: `KAIA`
- Get test KAIA from the [Kaia Faucet](https://faucet.kaia.io/).

### 3. Kaia SDK & Fee Delegation

- Use [Kaia SDK](https://docs.kaia.io/) (Ethers.js extension) for frontend/backend blockchain calls.
- **Fee Delegation:**
  - Allows a third party to pay gas for users.
  - See [Kaia Fee Delegation Tutorial](https://docs.kaia.io/) for integration.

### 4. Block Explorers

- Use [Kaiascope](https://scope.kaia.io/) or [Kaiascan](https://scan.kaia.io/) to view transactions and verify contracts.

### 5. Documentation & Branding

- Reference Kaia in all user and technical documentation.
- Use Kaia's name and logo in your UI and docs.

---

For more, see the [Kaia Docs](https://docs.kaia.io/).
# rence
