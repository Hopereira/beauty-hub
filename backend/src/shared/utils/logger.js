/**
 * Structured Logger using Winston
 * Supports tenant context for multi-tenant logging
 */

const winston = require('winston');
const env = require('../../config/env');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format with tenant context
const logFormat = printf(({ level, message, timestamp, tenantId, userId, ...metadata }) => {
  let log = `${timestamp} [${level}]`;
  
  if (tenantId) {
    log += ` [tenant:${tenantId}]`;
  }
  if (userId) {
    log += ` [user:${userId}]`;
  }
  
  log += `: ${message}`;
  
  if (Object.keys(metadata).length > 0 && metadata.stack === undefined) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  
  if (metadata.stack) {
    log += `\n${metadata.stack}`;
  }
  
  return log;
});

const logger = winston.createLogger({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        logFormat
      ),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});

// Add file transport in production
if (env.nodeEnv === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880,
    maxFiles: 5,
  }));
}

/**
 * Create a child logger with tenant context
 * @param {string} tenantId - Tenant UUID
 * @param {string} userId - User UUID
 * @returns {winston.Logger}
 */
function createTenantLogger(tenantId, userId = null) {
  return logger.child({ tenantId, userId });
}

module.exports = logger;
module.exports.createTenantLogger = createTenantLogger;
