// PRODUCTION APP: Multi-Tenant SaaS Architecture
const app = require('./src/app.multitenant');
const { sequelize } = require('./src/models');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

async function start() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Sync models (creates tables if they don't exist)
    // In production, use migrations instead
    if (env.nodeEnv === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized.');
    }

    // Start server
    app.listen(env.port, '0.0.0.0', () => {
      logger.info(`Beauty Hub API running on port ${env.port} [${env.nodeEnv}]`);
      logger.info(`Health check: http://localhost:${env.port}/api/health`);
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
