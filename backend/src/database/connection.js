const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

let prisma;

/**
 * Initialize Prisma client with proper configuration
 */
function createPrismaClient() {
  return new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
    errorFormat: 'pretty',
  });
}

/**
 * Connect to the database with retry logic
 */
async function connectDatabase() {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      if (!prisma) {
        prisma = createPrismaClient();

        // Set up logging
        prisma.$on('query', (e) => {
          if (process.env.NODE_ENV === 'development') {
            logger.debug('Query: ' + e.query);
            logger.debug('Params: ' + e.params);
            logger.debug('Duration: ' + e.duration + 'ms');
          }
        });

        prisma.$on('error', (e) => {
          logger.error('Prisma error:', e);
        });

        prisma.$on('info', (e) => {
          logger.info('Prisma info:', e.message);
        });

        prisma.$on('warn', (e) => {
          logger.warn('Prisma warning:', e.message);
        });
      }

      // Test the connection
      await prisma.$connect();
      logger.info('Database connected successfully');
      
      return prisma;
    } catch (error) {
      retries++;
      logger.error(`Database connection attempt ${retries} failed:`, error);
      
      if (retries >= maxRetries) {
        logger.error('Max database connection retries reached');
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, retries) * 1000;
      logger.info(`Retrying database connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Gracefully disconnect from the database
 */
async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  }
}

/**
 * Get the Prisma client instance
 */
function getPrismaClient() {
  if (!prisma) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return prisma;
}

/**
 * Health check for database connection
 */
async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
}

/**
 * Database transaction wrapper
 */
async function withTransaction(callback) {
  return await prisma.$transaction(callback);
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getPrismaClient,
  checkDatabaseHealth,
  withTransaction,
};