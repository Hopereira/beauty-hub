/**
 * Database Connection
 * Centralized Sequelize instance with connection pooling
 */

const { Sequelize } = require('sequelize');
const env = require('../../config/env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true,
  },
  pool: {
    max: env.nodeEnv === 'production' ? 50 : 20,
    min: 5,
    acquire: 60000,
    idle: 10000,
  },
  dialectOptions: env.nodeEnv === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  } : {},
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    return true;
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
}

/**
 * Graceful shutdown
 */
async function closeConnection() {
  try {
    await sequelize.close();
    logger.info('Database connection closed.');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  closeConnection,
};
