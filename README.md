# Hemat — USDT-Powered DeFi Thrift & Insurance Platform

![Hemat Logo](https://img.shields.io/badge/Hemat-DeFi%20Thrift-purple?style=for-the-badge&logo=ethereum)
![Kaia Network](https://img.shields.io/badge/Kaia-Blockchain-cyan?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Hemat is a decentralized thrift savings and insurance protocol built on the Kaia blockchain, using USDT as the canonical unit. It blends traditional communal thrift models (Ajo/Esusu) with DeFi primitives: on-chain escrow, automated payouts, yield optimization for idle funds, and a transparent insurance reserve.

##  **Live Deployment**

- **Frontend**: [https://rence-rouge.vercel.app](https://rence-rouge.vercel.app)
- **Network**: Kaia Testnet (Kairos)
- **Chain ID**: 1001

##  **Architecture Overview**

### Core Components

1. **HematFactory** - Creates and manages thrift groups
2. **HematGroup** - Individual thrift group contracts
3. **EscrowVault** - Manages USDT deposits and yield distribution
4. **StakeManager** - Handles member stakes and trust scores
5. **InsurancePool** - Manages insurance premiums and claims
6. **DeFiAdapter** - Abstract interface for yield protocol integration

### Thrift Models

####  **Basic Groups**
- **Free to create** (no subscription fee)
- Maximum **5 members**
- **7-day** contribution cycles
- Platform fee charged on payouts
- No trust/stake requirements

####  **Trust Groups**
- Requires **10 USDT** subscription
- Up to **30 members**
- Stake required to join
- Creator sets payout order
- Creator gets **75%** of platform fee share

####  **Super-Trust Groups**
- Requires **25 USDT** subscription
- Up to **100 members**
- Higher stake requirements
- Advanced features
- Creator gets **90%** of platform fee share

##  **Quick Start Guide**

### Prerequisites

- **Node.js 16+**
- **npm or yarn**
- **Kaia-compatible wallet** (Kaikas or MetaMask)
- **Test KAIA tokens** for gas fees
- **Mock USDT tokens** for testing

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/Emmyhack/rence.git
cd rence

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
PRIVATE_KEY=your_private_key_here
RPC_URL=https://public-en-kairos.kaia.io
KAIASCOPE_API_KEY=your_api_key_here
```

### 3. Development

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Start frontend development server
npm run frontend:dev
```

The frontend will be available at `http://localhost:5173`

## 🔧 **Wallet Setup & Configuration**

### Option 1: Kaikas Wallet (Recommended)

1. **Install Kaikas**:
   - Visit [https://app.kaikas.io/](https://app.kaikas.io/)
   - Download and install the browser extension
   - Create or import your wallet

2. **Network Configuration**:
   - Kaikas comes pre-configured with Kaia networks
   - Switch to **Kaia Testnet (Kairos)** for testing

### Option 2: MetaMask Setup

1. **Add Kaia Testnet to MetaMask**:
   - Open MetaMask → Settings → Networks → Add Network
   - Fill in the following details:

```
Network Name: Kaia Testnet (Kairos)
RPC URL: https://public-en-kairos.kaia.io
Chain ID: 1001
Currency Symbol: KAIA
Block Explorer: https://kairos.kaiascope.com
```

2. **Add Kaia Mainnet** (for production):

```
Network Name: Kaia Mainnet
RPC URL: https://public-en-cypress.kaia.io
Chain ID: 8217
Currency Symbol: KAIA
Block Explorer: https://kaiascope.com
```

##  **Adding Mock USDT Token**

### For MetaMask:

1. **Switch to Kaia Testnet** in MetaMask
2. **Click "Import Tokens"** at the bottom of the assets list
3. **Select "Custom Token"** tab
4. **Enter the following details**:

```
Token Contract Address: 0xFE77673f4BF659ef28bD0b3B66013dB5acFA0eBe
Token Symbol: USDT
Token Decimals: 6
```

5. **Click "Add Custom Token"** then **"Import Tokens"**

### For Kaikas Wallet:

1. **Open Kaikas** and ensure you're on **Kaia Testnet**
2. **Go to the main wallet view**
3. **Click the "+" button** or **"Add Token"**
4. **Select "Custom Token"**
5. **Enter the token details**:

```
Contract Address: 0xFE77673f4BF659ef28bD0b3B66013dB5acFA0eBe
Token Name: Mock USDT
Symbol: USDT
Decimals: 6
```

6. **Click "Add"** to import the token

### Getting Test Tokens

1. **Get KAIA tokens** for gas fees:
   - Visit the [Kaia Faucet](https://kairos.wallet.kaia.io/faucet)
   - Connect your wallet and request test tokens

2. **Get Mock USDT tokens**:
   - Contact the project team for test USDT tokens
   - Or use the contract's mint function if you have access

## 📋 **Deployed Contract Addresses (Testnet)**

```
  HematFactory:     0xCeDfe4FAad227720499F2318F92845b87144d702
  MockUSDT:         0xFE77673f4BF659ef28bD0b3B66013dB5acFA0eBe
  EscrowVault:      0x6dca750C61bea425768AEbfba354C81A4122482d
  StakeManager:     0x72a773725845E2F4BBB5b8b2C5C5b06e48B5f4e5
  InsurancePool:    0x7054347C5fe4B2056fcbC482C32D5617978d9F0a
  MockDeFiAdapter:  0xB3a49DcFa3df4a28bdac61f98893FC2854319EB7
```

##  **Complete Testing Guide**

### Step 1: Wallet Connection
-  Connect your wallet to the dApp
-  Ensure you're on Kaia Testnet (Chain ID: 1001)
-  Verify your address displays correctly

### Step 2: Get Test Tokens
-  Obtain KAIA tokens for gas fees
-  Get Mock USDT tokens for testing
-  Verify balances show in your wallet

### Step 3: Basic Group Testing
1. **Create a Basic Group**:
   -  Navigate to "Create Group"
   -  Select "Basic" model (free)
   -  Set contribution: 50 USDT
   -  Set group size: 3-5 members
   -  Submit transaction

2. **Join a Group**:
   -  Browse available groups
   -  Join a group as a member
   -  Deposit required stake

### Step 4: Contribution Cycle
-  Make your first contribution
-  Verify contribution is recorded
-  Check cycle progression
-  Claim payout when eligible

### Step 5: Advanced Features
-  Test Trust/Super-Trust group creation
-  Test insurance claim submission
-  Test yield harvesting
-  Test emergency withdrawal

##  **Fee Structure**

| Feature | Fee | Description |
|---------|-----|-------------|
| **Platform Fee** | 1% | Charged on payouts |
| **Insurance Premium** | 2% | Of contributions (if enabled) |
| **Trust Group Subscription** | 10 USDT | One-time payment |
| **Super-Trust Subscription** | 25 USDT | One-time payment |
| **Early Withdrawal Penalty** | Configurable | Set by group creator |

##  **Security Features**

-  **ReentrancyGuard**: Prevents reentrancy attacks
-  **Pausable**: Emergency pause functionality
-  **Ownable**: Admin controls for critical functions
-  **SafeERC20**: Secure token transfers
-  **Grace Periods**: 2-day default grace period
-  **Stake Slashing**: Penalty system for defaults

##  **Key Features**

###  Yield Optimization
- Idle funds automatically deployed to DeFi protocols
- **80%** of yield returned to members
- **20%** of yield to insurance pool
- **10%** liquidity buffer maintained

###  Insurance System
- Automatic premium collection (2% of contributions)
- On-chain claims with verification
- Emergency payout system
- Reserve threshold protection

###  Trust Scoring
- Behavioral tracking for members
- Penalty system for defaults
- Reward system for completions
- Reputation-based risk assessment

##  **Frontend Features**

The React-based frontend provides:

-  **Wallet Integration**: Kaikas & MetaMask support
-  **Group Management**: Create, join, and manage groups
-  **Contribution Tracking**: Real-time cycle monitoring
-  **Payout System**: Automated claim processing
-  **Insurance Interface**: Claim submission and tracking
-  **Analytics Dashboard**: Yield and performance metrics
-  **Responsive Design**: Mobile-friendly interface

##  **Development Commands**

```bash
# Smart Contract Commands
npm run compile          # Compile contracts
npm test                # Run contract tests
npm run deploy          # Deploy to testnet
npm run deploy:mainnet  # Deploy to mainnet

# Frontend Commands
npm run frontend:dev    # Start development server
npm run frontend:build  # Build for production

# Full Stack
npm run build          # Build entire project
```

##  **Common Issues & Solutions**

### Issue: "Insufficient USDT Balance"
**Solution**: Ensure you have Mock USDT tokens added to your wallet and sufficient balance

### Issue: "Transaction Failed"
**Solutions**:
- Check you have enough KAIA for gas fees
- Verify you're connected to Kaia Testnet
- Ensure USDT approval is granted

### Issue: "Network Error"
**Solutions**:
- Switch to Kaia Testnet (Chain ID: 1001)
- Check your internet connection
- Try refreshing the page

### Issue: "Group Creation Failed"
**Solutions**:
- Verify you have subscription fee for Trust/Super-Trust groups
- Check minimum contribution requirements (10 USDT)
- Ensure all form fields are valid

##  **Roadmap**

###  Phase 1 - MVP (Completed)
- Core smart contracts
- Basic frontend integration
- Testnet deployment
- Internal audit

###  Phase 2 - Enhancement (In Progress)
- Real DeFi protocol integration
- Advanced UI/UX improvements
- Mobile optimization
- External security audit

###  Phase 3 - Scale (Upcoming)
- Mainnet deployment
- Mobile application
- Advanced analytics
- Governance features

##  **Contributing**

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

##  **Support & Community**

-  **Email**: [support@hemat.io](mailto:support@hemat.io)
-  **Issues**: [GitHub Issues](https://github.com/Emmyhack/rence/issues)
-  **Discussions**: [GitHub Discussions](https://github.com/Emmyhack/rence/discussions)
-  **Telegram**: [Join our community](https://t.me/hematdefi)

##  **Disclaimer**

This software is provided "as is" without warranty of any kind. Users should:

-  Conduct thorough research before using
-  Start with small amounts on testnet
-  Understand the risks involved in DeFi
-  Never invest more than you can afford to lose

**The developers are not responsible for any financial losses incurred through the use of this software.**

---

<div align="center">

**Hemat** - *Building the future of decentralized thrift and insurance on Kaia blockchain*

[![Website](https://img.shields.io/badge/Website-Visit-blue?style=for-the-badge)](https://rence-rouge.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/Emmyhack/rence)
[![Kaia](https://img.shields.io/badge/Built%20on-Kaia-purple?style=for-the-badge)](https://kaia.io)

</div>
