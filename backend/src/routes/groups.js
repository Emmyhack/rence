const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();

const logger = require('../utils/logger');
const { blockchainService } = require('../services/blockchain');
const authMiddleware = require('../middleware/auth');

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
 * @route GET /api/groups
 * @desc Get all groups with pagination and filtering
 * @access Public
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('model').optional().isIn(['ROTATIONAL', 'FIXED_SAVINGS', 'EMERGENCY_LIQUIDITY']).withMessage('Invalid thrift model'),
  query('status').optional().isIn(['CREATED', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']).withMessage('Invalid status'),
  query('creator').optional().isEthereumAddress().withMessage('Invalid creator address'),
  validateRequest
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      model,
      status,
      creator,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (model) where.model = model;
    if (status) where.status = status;
    if (creator) where.creatorId = creator;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get groups from database
    const prisma = req.app.locals.prisma;
    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              address: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          members: {
            select: {
              id: true,
              userId: true,
              isActive: true,
              joinedAt: true,
              user: {
                select: {
                  address: true,
                  username: true
                }
              }
            }
          },
          _count: {
            select: {
              members: true,
              contributions: true,
              payouts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.group.count({ where })
    ]);

    res.json({
      groups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching groups:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch groups'
    });
  }
});

/**
 * @route GET /api/groups/:id
 * @desc Get group by ID
 * @access Public
 */
router.get('/:id', [
  param('id').notEmpty().withMessage('Group ID is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            address: true,
            username: true,
            firstName: true,
            lastName: true,
            trustScore: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                address: true,
                username: true,
                firstName: true,
                lastName: true,
                trustScore: true
              }
            }
          },
          orderBy: { position: 'asc' }
        },
        contributions: {
          include: {
            user: {
              select: {
                address: true,
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        payouts: {
          include: {
            user: {
              select: {
                address: true,
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        cycles: {
          orderBy: { cycleNumber: 'desc' },
          take: 10
        },
        insuranceClaims: {
          where: {
            status: { not: 'REJECTED' }
          },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });

    if (!group) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Group not found'
      });
    }

    // Get additional blockchain data
    try {
      const blockchainInfo = await blockchainService.getGroupInfo(group.onChainId);
      const groupContract = await blockchainService.getGroupContract(group.onChainId);
      const groupStatus = await groupContract.getGroupStatus();

      group.blockchainInfo = blockchainInfo;
      group.onChainStatus = groupStatus;
    } catch (error) {
      logger.warn(`Failed to get blockchain info for group ${id}:`, error);
    }

    res.json(group);

  } catch (error) {
    logger.error('Error fetching group:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch group'
    });
  }
});

/**
 * @route POST /api/groups
 * @desc Create a new group
 * @access Private
 */
router.post('/', [
  authMiddleware,
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
  body('model').isIn(['ROTATIONAL', 'FIXED_SAVINGS', 'EMERGENCY_LIQUIDITY']).withMessage('Invalid thrift model'),
  body('contributionAmount').isFloat({ min: 10, max: 10000 }).withMessage('Contribution amount must be between 10 and 10,000 USDT'),
  body('cycleInterval').isInt({ min: 86400, max: 2592000 }).withMessage('Cycle interval must be between 1 day and 30 days'),
  body('groupSize').isInt({ min: 3, max: 50 }).withMessage('Group size must be between 3 and 50'),
  body('lockDuration').optional().isInt({ min: 604800 }).withMessage('Lock duration must be at least 7 days'),
  body('stakeRequired').optional().isFloat({ min: 0 }).withMessage('Stake must be non-negative'),
  body('insuranceEnabled').optional().isBoolean().withMessage('Insurance enabled must be boolean'),
  validateRequest
], async (req, res) => {
  try {
    const { user } = req;
    const {
      name,
      description,
      model,
      contributionAmount,
      cycleInterval,
      groupSize,
      lockDuration,
      stakeRequired = 0,
      insuranceEnabled = false
    } = req.body;

    const prisma = req.app.locals.prisma;

    // Check if user has reached group creation limit
    const userGroupCount = await prisma.group.count({
      where: { creatorId: user.id }
    });

    if (userGroupCount >= 10) { // Default limit
      return res.status(400).json({
        error: 'Limit Exceeded',
        message: 'You have reached the maximum number of groups you can create'
      });
    }

    // Prepare blockchain config
    const blockchainConfig = {
      model: model === 'ROTATIONAL' ? 0 : model === 'FIXED_SAVINGS' ? 1 : 2,
      contributionAmount: Math.floor(contributionAmount * 1000000), // Convert to 6 decimals
      cycleInterval,
      groupSize,
      lockDuration: lockDuration || 0,
      gracePeriod: 172800, // 2 days
      stakeRequired: Math.floor(stakeRequired * 1000000),
      insuranceEnabled,
      insuranceBps: insuranceEnabled ? 200 : 0, // 2%
      platformFeeBps: 100, // 1%
      earlyWithdrawalPenaltyBps: 500 // 5%
    };

    // Create group on blockchain
    const blockchainResult = await blockchainService.createGroup(blockchainConfig);

    if (!blockchainResult.groupId) {
      return res.status(500).json({
        error: 'Blockchain Error',
        message: 'Failed to create group on blockchain'
      });
    }

    // Get group contract address
    const contractAddress = await blockchainService.contracts.hematFactory.getGroupContract(blockchainResult.groupId);

    // Create group in database
    const group = await prisma.group.create({
      data: {
        onChainId: blockchainResult.groupId,
        contractAddress,
        name,
        description,
        creatorId: user.id,
        model,
        contributionAmount,
        cycleInterval,
        groupSize,
        lockDuration,
        stakeRequired,
        insuranceEnabled,
        insuranceBps: insuranceEnabled ? 200 : 0,
        platformFeeBps: 100,
        earlyWithdrawalPenaltyBps: 500,
        maturityTime: model === 'FIXED_SAVINGS' && lockDuration ? 
          new Date(Date.now() + lockDuration * 1000) : null
      },
      include: {
        creator: {
          select: {
            id: true,
            address: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Update user stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        groupsCreated: { increment: 1 }
      }
    });

    // Create initial cycle for rotational groups
    if (model === 'ROTATIONAL') {
      await prisma.cycle.create({
        data: {
          groupId: group.id,
          cycleNumber: 1,
          startTime: new Date(),
          targetAmount: contributionAmount * groupSize,
          membersExpected: groupSize
        }
      });
    }

    // Log group creation event
    await prisma.groupEvent.create({
      data: {
        groupId: group.id,
        type: 'GROUP_CREATED',
        title: 'Group Created',
        description: `${model} group created by ${user.address}`,
        txHash: blockchainResult.txHash,
        blockNumber: blockchainResult.blockNumber
      }
    });

    // Send real-time notification
    const io = req.app.get('io');
    io.emit('group-created', {
      group,
      creator: user.address
    });

    res.status(201).json({
      group,
      blockchain: {
        txHash: blockchainResult.txHash,
        blockNumber: blockchainResult.blockNumber,
        onChainId: blockchainResult.groupId
      }
    });

  } catch (error) {
    logger.error('Error creating group:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create group'
    });
  }
});

/**
 * @route POST /api/groups/:id/join
 * @desc Join a group
 * @access Private
 */
router.post('/:id/join', [
  authMiddleware,
  param('id').notEmpty().withMessage('Group ID is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    const prisma = req.app.locals.prisma;

    // Get group
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: true,
        creator: true
      }
    });

    if (!group) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Group not found'
      });
    }

    // Check if group is accepting members
    if (group.status !== 'CREATED') {
      return res.status(400).json({
        error: 'Invalid State',
        message: 'Group is not accepting new members'
      });
    }

    // Check if group is full
    if (group.members.length >= group.groupSize) {
      return res.status(400).json({
        error: 'Group Full',
        message: 'Group has reached maximum capacity'
      });
    }

    // Check if user is already a member
    const existingMember = group.members.find(m => m.userId === user.id);
    if (existingMember) {
      return res.status(400).json({
        error: 'Already Member',
        message: 'You are already a member of this group'
      });
    }

    // Check if user can join (trust score, blacklist, etc.)
    if (user.trustScore < 50) {
      return res.status(400).json({
        error: 'Trust Score Too Low',
        message: 'Your trust score is too low to join this group'
      });
    }

    // Join group on blockchain
    try {
      const blockchainResult = await blockchainService.joinGroup(group.onChainId, user.address);
      
      // Add member to database
      const member = await prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId: user.id,
          position: group.members.length, // Position for payout order
          stakeAmount: group.stakeRequired
        },
        include: {
          user: {
            select: {
              id: true,
              address: true,
              username: true,
              firstName: true,
              lastName: true,
              trustScore: true
            }
          }
        }
      });

      // Update user stats
      await prisma.user.update({
        where: { id: user.id },
        data: {
          groupsJoined: { increment: 1 }
        }
      });

      // Check if group should be activated
      const updatedGroup = await prisma.group.findUnique({
        where: { id },
        include: { members: true }
      });

      if (updatedGroup.members.length === updatedGroup.groupSize) {
        await prisma.group.update({
          where: { id },
          data: {
            status: 'ACTIVE',
            activatedAt: new Date()
          }
        });
      }

      // Log member joined event
      await prisma.groupEvent.create({
        data: {
          groupId: group.id,
          type: 'MEMBER_JOINED',
          title: 'Member Joined',
          description: `${user.address} joined the group`,
          txHash: blockchainResult.txHash,
          blockNumber: blockchainResult.blockNumber
        }
      });

      // Send real-time notification to group
      const io = req.app.get('io');
      io.to(`group-${group.id}`).emit('member-joined', {
        member,
        groupId: group.id
      });

      res.status(201).json({
        member,
        blockchain: blockchainResult
      });

    } catch (blockchainError) {
      logger.error('Blockchain error joining group:', blockchainError);
      res.status(500).json({
        error: 'Blockchain Error',
        message: 'Failed to join group on blockchain'
      });
    }

  } catch (error) {
    logger.error('Error joining group:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to join group'
    });
  }
});

/**
 * @route GET /api/groups/:id/members
 * @desc Get group members
 * @access Public
 */
router.get('/:id/members', [
  param('id').notEmpty().withMessage('Group ID is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    const members = await prisma.groupMember.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: {
            id: true,
            address: true,
            username: true,
            firstName: true,
            lastName: true,
            trustScore: true
          }
        }
      },
      orderBy: { position: 'asc' }
    });

    res.json(members);

  } catch (error) {
    logger.error('Error fetching group members:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch group members'
    });
  }
});

/**
 * @route GET /api/groups/:id/analytics
 * @desc Get group analytics
 * @access Public
 */
router.get('/:id/analytics', [
  param('id').notEmpty().withMessage('Group ID is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    // Get basic group stats
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            contributions: true,
            payouts: true,
            insuranceClaims: true
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Group not found'
      });
    }

    // Get contribution stats
    const contributionStats = await prisma.contribution.aggregate({
      where: { groupId: id, status: 'PAID' },
      _sum: { amount: true },
      _avg: { amount: true },
      _count: true
    });

    // Get payout stats
    const payoutStats = await prisma.payout.aggregate({
      where: { groupId: id, status: 'EXECUTED' },
      _sum: { amount: true },
      _count: true
    });

    // Get member performance
    const memberPerformance = await prisma.groupMember.findMany({
      where: { groupId: id },
      select: {
        user: {
          select: {
            address: true,
            username: true
          }
        },
        successfulPayments: true,
        missedPayments: true,
        totalContributed: true,
        totalReceived: true,
        trustScore: true
      }
    });

    const analytics = {
      groupInfo: {
        status: group.status,
        currentCycle: group.currentCycle,
        totalMembers: group._count.members,
        totalContributions: group._count.contributions,
        totalPayouts: group._count.payouts,
        totalClaims: group._count.insuranceClaims
      },
      financial: {
        totalContributed: contributionStats._sum.amount || 0,
        averageContribution: contributionStats._avg.amount || 0,
        totalPaidOut: payoutStats._sum.amount || 0,
        contributionCount: contributionStats._count,
        payoutCount: payoutStats._count
      },
      memberPerformance,
      completion: {
        percentage: group.groupSize > 0 ? (group._count.payouts / group.groupSize) * 100 : 0
      }
    };

    res.json(analytics);

  } catch (error) {
    logger.error('Error fetching group analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch group analytics'
    });
  }
});

module.exports = router;