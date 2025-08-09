const jwt = require('jsonwebtoken');
const { getPrismaClient } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Verify JWT token middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        address: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        trustScore: true,
        kycStatus: true,
        lastActiveAt: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    // Update last active time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid access token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token has expired'
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const prisma = getPrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        address: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        trustScore: true,
        kycStatus: true
      }
    });

    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Check if user has required trust score
 */
const requireTrustScore = (minScore = 50) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (req.user.trustScore < minScore) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Minimum trust score of ${minScore} required. Current score: ${req.user.trustScore}`
      });
    }

    next();
  };
};

/**
 * Check if user has completed KYC
 */
const requireKYC = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (req.user.kycStatus !== 'APPROVED') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'KYC verification required',
      kycStatus: req.user.kycStatus
    });
  }

  next();
};

/**
 * Verify wallet signature for authentication
 */
const verifyWalletSignature = async (req, res, next) => {
  try {
    const { address, signature, message, nonce } = req.body;

    if (!address || !signature || !message || !nonce) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Address, signature, message, and nonce are required'
      });
    }

    // Import ethers dynamically to avoid issues
    const { ethers } = require('ethers');
    
    // Verify the signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid signature'
      });
    }

    // Check nonce to prevent replay attacks
    const prisma = getPrismaClient();
    
    // Store the verified address for the next middleware
    req.verifiedAddress = address.toLowerCase();
    req.nonce = nonce;
    
    next();
  } catch (error) {
    logger.error('Wallet signature verification error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Signature verification failed'
    });
  }
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'hemat-platform',
      audience: 'hemat-users'
    }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { 
      expiresIn: '30d',
      issuer: 'hemat-platform',
      audience: 'hemat-users'
    }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Admin role check middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  // Check if user has admin role (you can customize this logic)
  const adminAddresses = process.env.ADMIN_ADDRESSES ? 
    process.env.ADMIN_ADDRESSES.split(',').map(addr => addr.toLowerCase()) : [];
  
  if (!adminAddresses.includes(req.user.address.toLowerCase())) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireTrustScore,
  requireKYC,
  verifyWalletSignature,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  requireAdmin
};