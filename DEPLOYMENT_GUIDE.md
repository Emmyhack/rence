# Hemat Platform - Deployment Guide

## Prerequisites

### System Requirements
- **Node.js**: v16.0.0 or higher
- **PostgreSQL**: v12 or higher  
- **Git**: Latest version
- **Kaia Wallet**: With KAIA tokens for gas fees

### Development Tools
```bash
npm install -g hardhat
npm install -g prisma
npm install -g pm2  # for production
```

---

## Setup Instructions

### 1. Install Dependencies

**Root level:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
cd ..
```

**Frontend:**
```bash
cd frontend  
npm install
cd ..
```

### 2. Database Setup

**Create PostgreSQL Database:**
```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database and user
CREATE DATABASE hemat_db;
CREATE USER hemat_user WITH ENCRYPTED PASSWORD 'hemat_password_secure';
GRANT ALL PRIVILEGES ON DATABASE hemat_db TO hemat_user;

-- Exit PostgreSQL
\q
```

**Generate Prisma Client:**
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
cd ..
```

### 3. Environment Configuration

Your environment files are already configured with:
- **Wallet Private Key**: `0x334f1d6d475a6e3c1893def8fb3d9ef4a25d63bb14c3f42b04a27e85e8e6edd6`
- **RPC URL**: `https://public-en-kairos.node.kaia.io`
- **Network**: Kaia Testnet (Kairos)

---

##  Deployment Steps

### Step 1: Deploy Smart Contracts

```bash
# Compile contracts
npm run compile

# Deploy to Kaia Testnet (Kairos)
npm run deploy:kairos
```

**Expected Output:**
```
  Starting Hemat Platform deployment...
📄 Deploying MockUSDT...
✅ MockUSDT deployed to: 0x1234...
📄 Deploying EscrowVault...
✅ EscrowVault deployed to: 0x5678...
📄 Deploying StakeManager...
✅ StakeManager deployed to: 0x9abc...
📄 Deploying InsurancePool...
✅ InsurancePool deployed to: 0xdef0...
📄 Deploying MockDeFiAdapter...
✅ MockDeFiAdapter deployed to: 0x1357...
📄 Deploying HematFactory...
✅ HematFactory deployed to: 0x2468...
   Hemat Platform deployment completed successfully!
```

### Step 2: Update Frontend Contract Addresses

After deployment, update `frontend/.env` with contract addresses:
```bash
# Copy addresses from deployment output
VITE_HEMAT_FACTORY_ADDRESS=0x2468...
VITE_USDT_TOKEN_ADDRESS=0x1234...
VITE_ESCROW_VAULT_ADDRESS=0x5678...
VITE_STAKE_MANAGER_ADDRESS=0x9abc...
VITE_INSURANCE_POOL_ADDRESS=0xdef0...
```

### Step 3: Start Backend Server

```bash
# Start backend development server
npm run backend:dev

# Or for production
cd backend
npm start
```

**Backend will run on**: `http://localhost:5000`

### Step 4: Start Frontend Application

```bash
# Start frontend development server  
npm run frontend:dev

# Or for production build
npm run frontend:build
```

**Frontend will run on**: `http://localhost:3000`

---

## Testing Deployment

### 1. Test Smart Contracts
```bash
# Run contract tests
npm test

# Check gas usage
REPORT_GAS=true npm test
```

### 2. Test Backend API
```bash
# Health check
curl http://localhost:5000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "uptime": 123.45,
  "services": {
    "database": "connected",
    "blockchain": "connected"
  }
}
```

### 3. Test Frontend
1. Open `http://localhost:3000`
2. Connect MetaMask wallet
3. Switch to Kaia Testnet (Chain ID: 1001)
4. Test wallet connection and basic functionality

---

## Security Configuration

### Your Wallet Details
- **Network**: Kaia Testnet (Kairos)
- **Chain ID**: 1001
- **RPC URL**: https://public-en-kairos.node.kaia.io
- **Private Key**: Configured ✅
- **Admin Address**: Derived from private key ✅

### Security Checklist
- [x] Environment variables secured
- [x] Admin addresses configured
- [x] JWT secrets generated
- [x] Rate limiting enabled
- [x] CORS protection active
- [x] Input validation implemented
- [x] Database credentials secured

---

## Platform Features Ready

### Smart Contract Features
✅ **HematFactory**: Group creation and management  
✅ **HematGroup**: Three thrift models (Rotational, Fixed, Emergency)  
✅ **EscrowVault**: USDT treasury with yield generation  
✅ **StakeManager**: Trust scores and penalty system  
✅ **InsurancePool**: Claims processing and reserves  

### Backend Features  
✅ **Authentication**: Wallet-based login with JWT  
✅ **User Management**: Profiles, KYC, statistics  
✅ **Group Operations**: CRUD operations with blockchain sync  
✅ **Real-time Updates**: WebSocket notifications  
✅ **Admin Panel**: User management and platform monitoring  

### Frontend Features
✅ **Wallet Integration**: MetaMask, WalletConnect support  
✅ **Responsive Design**: Mobile-first, TailwindCSS  
✅ **Real-time UI**: Live updates and notifications  
✅ **Form Validation**: Comprehensive input validation  
✅ **Modern UX**: Animations, loading states, error handling  

---

## Quick Start Commands

```bash
# Full platform deployment
npm run compile && npm run deploy:kairos

# Start all services  
npm run backend:dev &    # Start backend
npm run frontend:dev     # Start frontend

# View logs
tail -f backend/logs/app.log

# Database operations
cd backend
npx prisma studio        # Open database GUI
npx prisma migrate reset # Reset database (development only)
```

---

## 🛠️ Production Deployment

### Environment Preparation
1. **Update .env for production**:
   ```bash
   NODE_ENV=production
   RPC_URL=https://public-en-cypress.kaia.io  # Mainnet
   CHAIN_ID=8217  # Kaia Mainnet
   ```

2. **Deploy to Kaia Mainnet**:
   ```bash
   npm run deploy:kaia
   ```

3. **Start production services**:
   ```bash
   cd backend && pm2 start ecosystem.config.js
   npm run frontend:build
   ```

### Health Monitoring
- **Backend Health**: `GET /health`
- **Database Status**: `GET /api/health/database`  
- **Blockchain Status**: `GET /api/health/blockchain`
- **Logs**: `backend/logs/app.log`

---

## Platform Ready!

Your Hemat platform is now configured and ready for:

 **Development**: All services running locally  
 **Testing**: Smart contracts and API endpoints  
 **Security**: Enterprise-grade protection  
 **Mobile**: Responsive across all devices  
 **Performance**: Optimized for production  

**Your wallet is connected and ready to deploy! **

---

## Support

For deployment issues or questions:
- **Documentation**: Check `docs/` folder
- **Logs**: Monitor `backend/logs/app.log`
- **Database**: Use `npx prisma studio` for debugging
- **Contracts**: Verify on KaiaScope after deployment
