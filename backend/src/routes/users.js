const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();

const { getPrismaClient } = require('../database/connection');
const { authenticateToken, optionalAuth, requireAdmin } = require('../middleware/auth');
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

/**
 * @route GET /api/users
 * @desc Get users with pagination and filtering
 * @access Private (Admin only)
 */
router.get('/', [
  authenticateToken,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term required'),
  query('kycStatus').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']).withMessage('Invalid KYC status'),
  validateRequest
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      kycStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const prisma = getPrismaClient();

    // Build where clause
    const where = {};
    if (kycStatus) where.kycStatus = kycStatus;
    if (search) {
      where.OR = [
        { address: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          address: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          trustScore: true,
          kycStatus: true,
          totalContributed: true,
          totalReceived: true,
          groupsJoined: true,
          groupsCreated: true,
          successfulPayments: true,
          defaultedPayments: true,
          createdAt: true,
          lastActiveAt: true,
          _count: {
            select: {
              createdGroups: true,
              memberships: true,
              contributions: true,
              insuranceClaims: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users: users.map(user => ({
        ...user,
        totalContributed: user.totalContributed.toString(),
        totalReceived: user.totalReceived.toString()
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch users'
    });
  }
});

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private
 */
router.get('/:id', [
  authenticateToken,
  param('id').notEmpty().withMessage('User ID is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrismaClient();

    // Check if requesting own profile or admin
    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.address && process.env.ADMIN_ADDRESSES && 
      process.env.ADMIN_ADDRESSES.split(',').map(addr => addr.toLowerCase())
        .includes(req.user.address.toLowerCase());

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        kycDocuments: {
          select: {
            id: true,
            type: true,
            status: true,
            uploadedAt: true,
            verifiedAt: true,
            rejectionReason: true
          }
        },
        createdGroups: {
          select: {
            id: true,
            name: true,
            model: true,
            status: true,
            contributionAmount: true,
            groupSize: true,
            createdAt: true,
            _count: {
              select: { members: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        memberships: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                model: true,
                status: true,
                contributionAmount: true,
                createdAt: true
              }
            }
          },
          orderBy: { joinedAt: 'desc' },
          take: 10
        },
        contributions: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            group: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        insuranceClaims: {
          select: {
            id: true,
            amount: true,
            claimType: true,
            status: true,
            submittedAt: true,
            group: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { submittedAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            createdGroups: true,
            memberships: true,
            contributions: true,
            payouts: true,
            insuranceClaims: true,
            notifications: true
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

    // Format the response
    const userData = {
      ...user,
      totalContributed: user.totalContributed.toString(),
      totalReceived: user.totalReceived.toString(),
      createdGroups: user.createdGroups.map(group => ({
        ...group,
        contributionAmount: group.contributionAmount.toString()
      })),
      contributions: user.contributions.map(contribution => ({
        ...contribution,
        amount: contribution.amount.toString()
      })),
      insuranceClaims: user.insuranceClaims.map(claim => ({
        ...claim,
        amount: claim.amount.toString()
      }))
    };

    res.json(userData);

  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user'
    });
  }
});

/**
 * @route GET /api/users/address/:address
 * @desc Get user by wallet address
 * @access Public (limited info)
 */
router.get('/address/:address', [
  optionalAuth,
  param('address').isEthereumAddress().withMessage('Invalid Ethereum address'),
  validateRequest
], async (req, res) => {
  try {
    const { address } = req.params;
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { address: address.toLowerCase() },
      select: {
        id: true,
        address: true,
        username: true,
        firstName: true,
        lastName: true,
        trustScore: true,
        groupsJoined: true,
        groupsCreated: true,
        successfulPayments: true,
        createdAt: true,
        _count: {
          select: {
            createdGroups: true,
            memberships: true
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

    res.json(user);

  } catch (error) {
    logger.error('Error fetching user by address:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user'
    });
  }
});

/**
 * @route GET /api/users/:id/stats
 * @desc Get detailed user statistics
 * @access Private
 */
router.get('/:id/stats', [
  authenticateToken,
  param('id').notEmpty().withMessage('User ID is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrismaClient();

    // Check access permissions
    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.address && process.env.ADMIN_ADDRESSES && 
      process.env.ADMIN_ADDRESSES.split(',').map(addr => addr.toLowerCase())
        .includes(req.user.address.toLowerCase());

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    // Get comprehensive statistics
    const [
      user,
      contributionStats,
      payoutStats,
      groupStats,
      monthlyActivity
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          address: true,
          trustScore: true,
          totalContributed: true,
          totalReceived: true,
          groupsJoined: true,
          groupsCreated: true,
          successfulPayments: true,
          defaultedPayments: true,
          createdAt: true
        }
      }),
      
      // Contribution statistics
      prisma.contribution.aggregate({
        where: { userId: id, status: 'PAID' },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true
      }),

      // Payout statistics
      prisma.payout.aggregate({
        where: { userId: id, status: 'EXECUTED' },
        _sum: { amount: true },
        _count: true
      }),

      // Group participation stats
      prisma.groupMember.findMany({
        where: { userId: id },
        include: {
          group: {
            select: {
              model: true,
              status: true
            }
          }
        }
      }),

      // Monthly activity (last 12 months)
      prisma.contribution.groupBy({
        by: ['createdAt'],
        where: {
          userId: id,
          status: 'PAID',
          createdAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
          }
        },
        _sum: { amount: true },
        _count: true
      })
    ]);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Process group statistics
    const groupByModel = groupStats.reduce((acc, membership) => {
      const model = membership.group.model;
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {});

    const groupByStatus = groupStats.reduce((acc, membership) => {
      const status = membership.group.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Calculate success rate
    const totalPayments = user.successfulPayments + user.defaultedPayments;
    const successRate = totalPayments > 0 ? (user.successfulPayments / totalPayments) * 100 : 100;

    // Process monthly activity
    const monthlyData = monthlyActivity.reduce((acc, activity) => {
      const month = new Date(activity.createdAt).toISOString().substring(0, 7); // YYYY-MM
      acc[month] = {
        amount: activity._sum.amount || 0,
        count: activity._count
      };
      return acc;
    }, {});

    const stats = {
      profile: {
        ...user,
        totalContributed: user.totalContributed.toString(),
        totalReceived: user.totalReceived.toString(),
        successRate: Math.round(successRate * 100) / 100,
        memberSince: user.createdAt
      },
      contributions: {
        total: contributionStats._sum.amount?.toString() || '0',
        average: contributionStats._avg.amount?.toString() || '0',
        count: contributionStats._count,
        successRate
      },
      payouts: {
        total: payoutStats._sum.amount?.toString() || '0',
        count: payoutStats._count
      },
      groups: {
        byModel: groupByModel,
        byStatus: groupByStatus,
        total: groupStats.length
      },
      monthlyActivity: monthlyData
    };

    res.json(stats);

  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user statistics'
    });
  }
});

/**
 * @route GET /api/users/leaderboard
 * @desc Get platform leaderboard
 * @access Public
 */
router.get('/leaderboard', [
  query('type').optional().isIn(['trustScore', 'contributions', 'groups']).withMessage('Invalid leaderboard type'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest
], async (req, res) => {
  try {
    const { type = 'trustScore', limit = 50 } = req.query;
    const prisma = getPrismaClient();

    let orderBy = {};
    let select = {
      id: true,
      address: true,
      username: true,
      firstName: true,
      lastName: true,
      trustScore: true,
      totalContributed: true,
      groupsJoined: true,
      groupsCreated: true,
      successfulPayments: true,
      createdAt: true
    };

    switch (type) {
      case 'trustScore':
        orderBy = { trustScore: 'desc' };
        break;
      case 'contributions':
        orderBy = { totalContributed: 'desc' };
        break;
      case 'groups':
        orderBy = { groupsCreated: 'desc' };
        break;
    }

    const users = await prisma.user.findMany({
      select,
      orderBy,
      take: parseInt(limit),
      where: {
        // Only show users with some activity
        OR: [
          { groupsJoined: { gt: 0 } },
          { groupsCreated: { gt: 0 } },
          { successfulPayments: { gt: 0 } }
        ]
      }
    });

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      ...user,
      totalContributed: user.totalContributed.toString(),
      // Mask address for privacy (show first 6 and last 4 characters)
      displayAddress: `${user.address.substring(0, 6)}...${user.address.substring(38)}`
    }));

    res.json({
      type,
      leaderboard
    });

  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch leaderboard'
    });
  }
});

/**
 * @route PUT /api/users/:id/admin
 * @desc Update user admin actions (Admin only)
 * @access Private (Admin)
 */
router.put('/:id/admin', [
  authenticateToken,
  requireAdmin,
  param('id').notEmpty().withMessage('User ID is required'),
  body('action').isIn(['updateTrustScore', 'updateKycStatus', 'suspend', 'unsuspend']).withMessage('Invalid action'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { action, value, reason } = req.body;
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    let updateData = {};

    switch (action) {
      case 'updateTrustScore':
        if (typeof value !== 'number' || value < 0 || value > 1000) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Trust score must be between 0 and 1000'
          });
        }
        updateData.trustScore = value;
        break;

      case 'updateKycStatus':
        if (!['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'].includes(value)) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid KYC status'
          });
        }
        updateData.kycStatus = value;
        if (value === 'APPROVED') {
          updateData.kycVerifiedAt = new Date();
        }
        break;

      case 'suspend':
        // In a real implementation, you might have a 'suspended' field
        updateData.trustScore = 0;
        break;

      case 'unsuspend':
        updateData.trustScore = Math.max(user.trustScore, 50);
        break;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Log admin action (you could create an admin log table)
    logger.info(`Admin action: ${req.user.address} performed ${action} on user ${user.address}`, {
      adminAddress: req.user.address,
      targetUser: user.address,
      action,
      value,
      reason
    });

    res.json({
      message: `User ${action} successful`,
      user: {
        id: updatedUser.id,
        address: updatedUser.address,
        trustScore: updatedUser.trustScore,
        kycStatus: updatedUser.kycStatus,
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error in admin action:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Admin action failed'
    });
  }
});

module.exports = router;