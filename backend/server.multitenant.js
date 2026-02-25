/**
 * Multi-Tenant Server Entry Point
 * SaaS-ready Beauty Hub API
 */

const app = require('./src/app.multitenant');
const { sequelize } = require('./src/shared/database');
const logger = require('./src/shared/utils/logger');

const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function start() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Sync models (in development only)
    if (NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized.');
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Beauty Hub API running on port ${PORT} [${NODE_ENV}]`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

start();
