# Hemat Platform - Local Development Setup Guide

This guide provides step-by-step instructions for setting up the Hemat DeFi Thrift & Insurance Platform locally. Follow these instructions to get the complete development environment running on your machine.

## 🛠️ System Requirements

### Core Dependencies
- **Node.js** v16.0.0 or higher ([Download here](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)
- **PostgreSQL** v12 or higher ([Download here](https://www.postgresql.org/download/))
- **Git** (for cloning and version control)

### Global Tools Installation
```bash
# Install essential global tools
npm install -g hardhat
npm install -g prisma
npm install -g pm2  # Optional: for production deployment
```

## 📦 Project Setup Steps

### 1. Clone Repository and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd hemat-defi-thrift

# Install root dependencies (blockchain/smart contracts)
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Database Setup (PostgreSQL)

#### Install PostgreSQL:
- **Ubuntu/Debian:** 
  ```bash
  sudo apt update && sudo apt install postgresql postgresql-contrib
  ```
- **macOS:** 
  ```bash
  brew install postgresql
  brew services start postgresql
  ```
- **Windows:** Download installer from [postgresql.org](https://www.postgresql.org/download/)

#### Create Database:
```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database and user
CREATE DATABASE hemat_db;
CREATE USER hemat_user WITH ENCRYPTED PASSWORD 'hemat_password_secure';
GRANT ALL PRIVILEGES ON DATABASE hemat_db TO hemat_user;

-- Grant additional permissions
ALTER USER hemat_user CREATEDB;

-- Exit PostgreSQL
\q
```

### 3. Environment Configuration

Create the following environment files:

#### Root `.env` file:
```env
# Blockchain Configuration
PRIVATE_KEY=your_kaia_wallet_private_key_here
RPC_URL=https://public-en-kairos.kaia.io
KAIASCOPE_API_KEY=your_api_key_optional

# Network Configuration
REPORT_GAS=true
```

#### Backend `.env` file:
```env
# Database
DATABASE_URL="postgresql://hemat_user:hemat_password_secure@localhost:5432/hemat_db"

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development

# External Services
REDIS_URL=redis://localhost:6379
IPFS_API_URL=https://ipfs.infura.io:5001

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Notification Services
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
```

#### Frontend `.env` file:
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Blockchain Configuration
VITE_CHAIN_ID=1001
VITE_RPC_URL=https://public-en-kairos.kaia.io
VITE_NETWORK_NAME=Kaia Testnet Kairos

# App Configuration
VITE_APP_NAME=Hemat DeFi Platform
VITE_APP_VERSION=1.0.0
```

### 4. Database Migration

```bash
# Navigate to backend directory
cd backend

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Optional: Seed the database with sample data
npm run db:seed

# Go back to root
cd ..
```

### 5. Smart Contract Setup

```bash
# Compile smart contracts
npm run compile

# Optional: Deploy to local Hardhat network
npx hardhat node  # Run this in a separate terminal

# Optional: Deploy to Kaia testnet (requires wallet setup)
npm run deploy:kairos
```

## 🚀 Running the Application

### Development Mode

You'll need **3 separate terminal windows/tabs**:

#### Terminal 1 - Local Blockchain (Optional):
```bash
# Run local Hardhat network for testing
npx hardhat node
```
*This provides a local blockchain for development. Keep this running.*

#### Terminal 2 - Backend API:
```bash
cd backend
npm run dev
```
*Backend API will be available at `http://localhost:3001`*

#### Terminal 3 - Frontend Application:
```bash
cd frontend
npm run dev
```
*Frontend will be available at `http://localhost:5173`*

### Production Mode

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Build backend (if applicable)
cd backend
npm run build
cd ..

# Start with PM2
pm2 start ecosystem.config.js
```

## 🔑 Wallet Setup (Required for Full Functionality)

### Install Wallet Extension
1. **Kaikas Wallet** (Recommended): [Chrome Extension](https://chromewebstore.google.com/detail/kaikas/jblndlipeogpafnldhgmapagcccfchpi)
2. **MetaMask** (Alternative): [metamask.io](https://metamask.io/)

### Add Kaia Networks

#### Kaia Testnet (Kairos) - For Development:
- **Network Name:** Kaia Testnet Kairos
- **RPC URL:** `https://public-en-kairos.kaia.io`
- **Chain ID:** `1001`
- **Currency Symbol:** `KAIA`
- **Block Explorer:** `https://baobab.scope.klaytn.com`

#### Kaia Mainnet - For Production:
- **Network Name:** Kaia Mainnet
- **RPC URL:** `https://public-en-cypress.kaia.io`
- **Chain ID:** `8217`
- **Currency Symbol:** `KAIA`
- **Block Explorer:** `https://scope.klaytn.com`

### Get Testnet Tokens
1. Visit [Kaia Testnet Faucet](https://baobab.wallet.klaytn.com/faucet)
2. Enter your wallet address
3. Request testnet KAIA tokens for gas fees

## 🔧 Additional Development Tools (Optional)

### Database Management
- **pgAdmin** - GUI for PostgreSQL
- **TablePlus** - Modern database client
- **DBeaver** - Universal database tool

### API Testing
- **Postman** - API development environment
- **Insomnia** - REST API client
- **Thunder Client** - VS Code extension

### Code Editor Extensions (VS Code)
```bash
# Install recommended extensions
code --install-extension JuanBlanco.solidity
code --install-extension Prisma.prisma
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
```

## ✅ Verification Checklist

After completing the setup, verify everything is working:

### ✅ Backend Health Check
- [ ] Backend running at `http://localhost:3001`
- [ ] API responds: `GET http://localhost:3001/health`
- [ ] Database connected (no connection errors in logs)
- [ ] Prisma client generated successfully

### ✅ Frontend Health Check
- [ ] Frontend running at `http://localhost:5173`
- [ ] App loads without errors
- [ ] Can connect wallet (Kaikas/MetaMask)
- [ ] Network detection works correctly

### ✅ Blockchain Integration
- [ ] Smart contracts compiled successfully
- [ ] `artifacts/` directory exists with contract ABIs
- [ ] Wallet can connect to Kaia testnet
- [ ] Can interact with deployed contracts (if deployed)

### ✅ Database Verification
```bash
# Check database connection
cd backend
npx prisma studio  # Opens database browser at http://localhost:5555
```

## 🐛 Common Issues & Solutions

### Issue: PostgreSQL Connection Error
**Solution:** 
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Start PostgreSQL if not running
sudo systemctl start postgresql  # Linux
brew services start postgresql  # macOS
```

### Issue: Port Already in Use
**Solution:**
```bash
# Find process using port 3001
lsof -i :3001
# Kill the process
kill -9 <PID>
```

### Issue: Wallet Connection Fails
**Solution:**
1. Ensure wallet extension is installed and unlocked
2. Check network configuration matches environment variables
3. Clear browser cache and wallet cache
4. Try refreshing the page

### Issue: Smart Contract Compilation Fails
**Solution:**
```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear Hardhat cache
npx hardhat clean
npm run compile
```

## 📚 Development Resources

### Documentation Links
- [Hardhat Documentation](https://hardhat.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Kaia Developer Docs](https://docs.kaia.io/)
- [React Documentation](https://react.dev/)

### Useful Commands
```bash
# View all available npm scripts
npm run

# Check dependency versions
npm list

# Update dependencies
npm update

# Audit for vulnerabilities
npm audit
npm audit fix
```

## 🤝 Getting Help

If you encounter issues:

1. **Check the logs** - Most issues show detailed error messages
2. **Review this guide** - Ensure all steps were followed correctly
3. **Check GitHub Issues** - Look for similar problems and solutions
4. **Create an Issue** - If you find a bug, please report it

## 🎉 Success!

If all verification checks pass, you now have a fully functional local development environment for the Hemat DeFi platform! 

### Next Steps:
1. Explore the codebase structure
2. Run the test suite: `npm test`
3. Start building new features
4. Deploy to testnet when ready

---

**Happy coding! 🚀**

*For additional support, please refer to the main README.md or create an issue on GitHub.*