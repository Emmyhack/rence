# Hemat — USDT-Powered DeFi Thrift & Insurance Platform

Hemat is a decentralized thrift savings and insurance protocol built on the Kaia blockchain, using USDT as the canonical unit. It blends traditional communal thrift models (Ajo/Esusu) with DeFi primitives: on-chain escrow, automated payouts, yield optimization for idle funds, and a transparent insurance reserve.

## 🏗️ Architecture Overview

### Core Components

1. **HematFactory** - Creates and manages thrift groups
2. **HematGroup** - Individual thrift group contracts
3. **EscrowVault** - Manages USDT deposits and yield distribution
4. **StakeManager** - Handles member stakes and trust scores
5. **InsurancePool** - Manages insurance premiums and claims
6. **DeFiAdapter** - Abstract interface for yield protocol integration

### Thrift Models

#### 1. Rotational Contribution (Ajo/Esusu)
- Members contribute fixed USDT amounts each cycle
- Payout rotates among members in predetermined order
- Automated smart contract handles payments and penalties

#### 2. Fixed Savings Pool
- Members deposit for a locked term
- Receive principal + yield at maturity
- Early withdrawal with penalty

#### 3. Emergency Liquidity Pool
- Dedicated pool for verified emergencies
- On-chain claims with off-chain verification
- Instant payouts for approved claims

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- Hardhat
- Kaia wallet with testnet/mainnet access

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd hemat-defi-thrift

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Setup

Create a `.env` file with the following variables:

```env
PRIVATE_KEY=your_private_key_here
RPC_URL=https://public-en-kairos.kaia.io
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Compilation

```bash
# Compile contracts
npm run compile
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/Hemat.test.js
```

### Deployment

```bash
# Deploy to testnet
npm run deploy

# Deploy to mainnet
npm run deploy:mainnet
```

## 📋 Smart Contracts

### HematFactory.sol
- Creates and registers thrift groups
- Enforces global constraints
- Manages group discovery

### HematGroup.sol
- Manages individual thrift groups
- Handles member contributions and payouts
- Supports multiple thrift models
- Implements cycle management

### EscrowVault.sol
- Receives and manages USDT deposits
- Interfaces with DeFi protocols for yield
- Handles fee distribution
- Maintains per-group accounting

### StakeManager.sol
- Manages member stakes
- Tracks trust scores
- Handles penalties and rewards
- Provides behavioral analytics

### InsurancePool.sol
- Collects insurance premiums
- Processes claims
- Manages emergency payouts
- Maintains reserve ratios

### DeFiAdapter.sol
- Abstract interface for yield protocols
- Supports deposit/withdraw/harvest operations
- Allows strategy swapping without core changes

## 💰 Fee Structure

- **Platform Fee**: 1% on payouts
- **Insurance Premium**: 2% of contributions
- **Stake Penalty**: Configurable per group
- **Early Withdrawal Penalty**: Configurable per group

## 🔒 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency pause functionality
- **Ownable**: Admin controls for critical functions
- **SafeERC20**: Secure token transfers
- **Grace Periods**: Default 2-day grace period for missed payments

## 🧪 Testing

The platform includes comprehensive tests covering:

- Contract deployment
- Member interactions
- Contribution and payout flows
- Insurance claims
- Yield distribution
- Error handling
- Integration scenarios

Run tests with:
```bash
npm test
```

## 📊 Key Features

### Yield Optimization
- Idle funds automatically deployed to DeFi protocols
- 80% of yield returned to members
- 20% of yield to insurance pool
- 10% liquidity buffer maintained

### Insurance System
- Automatic premium collection (2% of contributions)
- On-chain claims with off-chain verification
- Emergency payout system
- Reserve threshold protection

### Trust Scoring
- Behavioral tracking for members
- Penalty system for defaults
- Reward system for successful completions
- Reputation-based risk assessment

### Multi-Model Support
- Rotational savings (Ajo/Esusu)
- Fixed-term savings pools
- Emergency liquidity pools
- Configurable parameters per model

## 🌐 Frontend Integration

The platform is designed to work with web3 wallets and provides:

- Group creation and management
- Member onboarding
- Contribution tracking
- Payout claiming
- Insurance claim submission
- Real-time balance updates

## 🔧 Configuration

### Default Parameters

```solidity
PLATFORM_FEE_BPS = 100;        // 1%
INSURANCE_BPS = 200;           // 2%
DEFAULT_GRACE_PERIOD = 2 days;
LIQUIDITY_BUFFER_RATIO = 10%;  // 10%
MIN_GROUP_SIZE = 2;
MAX_GROUP_SIZE = 50;
```

### Network Configuration

The platform supports both Kaia testnet (Kairos) and mainnet:

```javascript
// Testnet
kairos: {
  url: "https://public-en-kairos.kaia.io",
  chainId: 1001
}

// Mainnet
kaia: {
  url: "https://public-en-cypress.kaia.io",
  chainId: 8217
}
```

## 📈 Roadmap

### Phase 1 - MVP (4-8 weeks)
- ✅ Core smart contracts
- ✅ Basic frontend integration
- ✅ Testnet deployment
- ✅ Internal audit

### Phase 2 - Harden & Integrate (8-12 weeks)
- 🔄 Real DeFi protocol integration
- 🔄 Fiat on-ramp integration
- 🔄 External security audit
- 🔄 Bug bounty program

### Phase 3 - Scale (3-6 months)
- 📋 Mobile application
- 📋 Regional fiat rails
- 📋 Advanced analytics
- 📋 Governance features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Join our community discussions
- Check the documentation

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users should conduct their own research and due diligence before using this platform. The developers are not responsible for any financial losses incurred through the use of this software.

---

**Hemat** - Building the future of decentralized thrift and insurance on Kaia blockchain.
