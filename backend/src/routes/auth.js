const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const router = express.Router();

const { getPrismaClient } = require('../database/connection');
const { 
  verifyWalletSignature, 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  authenticateToken 
} = require('../middleware/auth');
const logger = require('../utils/logger');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

// Store nonces temporarily (in production, use Redis)
const nonceStore = new Map();

/**
 * @route GET /api/auth/nonce/:address
 * @desc Get authentication nonce for wallet address
 * @access Public
 */
router.get('/nonce/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid Ethereum address'
      });
    }

    // Generate a unique nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    // Store nonce with expiration (5 minutes)
    nonceStore.set(address.toLowerCase(), {
      nonce,
      timestamp,
      expires: timestamp + (5 * 60 * 1000)
    });

    // Clean up expired nonces
    cleanupExpiredNonces();

    res.json({
      nonce,
      message: `Please sign this message to authenticate with Hemat:\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`,
      timestamp
    });

  } catch (error) {
    logger.error('Error generating nonce:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate nonce'
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Authenticate user with wallet signature
 * @access Public
 */
router.post('/login', [
  body('address').isEthereumAddress().withMessage('Invalid Ethereum address'),
  body('signature').notEmpty().withMessage('Signature is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('nonce').notEmpty().withMessage('Nonce is required'),
  validateRequest,
  verifyWalletSignature
], async (req, res) => {
  try {
    const { address, nonce } = req.body;
    const prisma = getPrismaClient();

    // Verify nonce
    const storedNonce = nonceStore.get(address.toLowerCase());
    if (!storedNonce || storedNonce.nonce !== nonce) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired nonce'
      });
    }

    // Check if nonce is expired
    if (Date.now() > storedNonce.expires) {
      nonceStore.delete(address.toLowerCase());
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Nonce has expired'
      });
    }

    // Remove used nonce
    nonceStore.delete(address.toLowerCase());

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { address: address.toLowerCase() }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          address: address.toLowerCase(),
          trustScore: 100,
          lastActiveAt: new Date()
        }
      });

      logger.info(`New user created: ${user.address}`);
    } else {
      // Update last active time
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() }
      });
    }

    // Generate tokens
    const accessToken = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Return user data and tokens
    const userData = {
      id: user.id,
      address: user.address,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      trustScore: user.trustScore,
      kycStatus: user.kycStatus,
      totalContributed: user.totalContributed.toString(),
      totalReceived: user.totalReceived.toString(),
      groupsJoined: user.groupsJoined,
      groupsCreated: user.groupsCreated,
      createdAt: user.createdAt
    };

    res.json({
      user: userData,
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  validateRequest
], async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    // Generate new access token
    const newAccessToken = generateToken(user.id);

    res.json({
      accessToken: newAccessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid refresh token'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (client-side token removal)
 * @access Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Logout failed'
    });
  }
});

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        kycDocuments: {
          select: {
            type: true,
            status: true,
            uploadedAt: true
          }
        },
        _count: {
          select: {
            createdGroups: true,
            memberships: true,
            contributions: true,
            insuranceClaims: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const userData = {
      id: user.id,
      address: user.address,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
      trustScore: user.trustScore,
      kycStatus: user.kycStatus,
      kycDocuments: user.kycDocuments,
      totalContributed: user.totalContributed.toString(),
      totalReceived: user.totalReceived.toString(),
      groupsJoined: user.groupsJoined,
      groupsCreated: user.groupsCreated,
      successfulPayments: user.successfulPayments,
      defaultedPayments: user.defaultedPayments,
      stats: user._count,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastActiveAt: user.lastActiveAt
    };

    res.json(userData);

  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', [
  authenticateToken,
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('username').optional().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('firstName').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('phoneNumber').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Invalid phone number'),
  validateRequest
], async (req, res) => {
  try {
    const { email, username, firstName, lastName, phoneNumber } = req.body;
    const prisma = getPrismaClient();

    // Check if email is already taken
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: req.user.id }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email address is already in use'
        });
      }
    }

    // Check if username is already taken
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          id: { not: req.user.id }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Username is already taken'
        });
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        email,
        username,
        firstName,
        lastName,
        phoneNumber,
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        address: updatedUser.address,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        trustScore: updatedUser.trustScore,
        kycStatus: updatedUser.kycStatus,
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route GET /api/auth/verify
 * @desc Verify if token is valid
 * @access Private
 */
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      address: req.user.address,
      trustScore: req.user.trustScore,
      kycStatus: req.user.kycStatus
    }
  });
});

// Clean up expired nonces periodically
function cleanupExpiredNonces() {
  const now = Date.now();
  for (const [address, data] of nonceStore.entries()) {
    if (now > data.expires) {
      nonceStore.delete(address);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupExpiredNonces, 5 * 60 * 1000);

module.exports = router;