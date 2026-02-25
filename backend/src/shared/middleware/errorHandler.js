/**
 * Global Error Handler Middleware
 * Handles all errors consistently with proper logging
 */

const { AppError } = require('../errors');
const { HTTP_STATUS, ERROR_CODES } = require('../constants');
const logger = require('../utils/logger');

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error with context
  const logContext = {
    method: req.method,
    path: req.path,
    tenantId: req.tenantId,
    userId: req.user?.id,
    ip: req.ip,
  };

  // Operational errors (expected)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { ...logContext, stack: err.stack });
    } else {
      logger.warn(err.message, logContext);
    }
    
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const details = err.errors?.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
    
    logger.warn('Validation error', { ...logContext, details });
    
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Erro de validação.',
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        details,
      },
    });
  }

  // Sequelize foreign key errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    logger.warn('Foreign key constraint error', { ...logContext, error: err.message });
    
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Referência inválida. O registro relacionado não existe.',
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        details: null,
      },
    });
  }

  // Sequelize database errors
  if (err.name === 'SequelizeDatabaseError') {
    logger.error('Database error', { ...logContext, error: err.message, stack: err.stack });
    
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Erro de banco de dados.',
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        details: process.env.NODE_ENV === 'development' ? err.message : null,
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Token inválido ou expirado.',
      error: {
        code: ERROR_CODES.AUTH_TOKEN_INVALID,
        details: null,
      },
    });
  }

  // Joi validation errors
  if (err.isJoi) {
    const details = err.details?.map(d => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Erro de validação.',
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        details,
      },
    });
  }

  // Unexpected errors
  logger.error('Unexpected error', {
    ...logContext,
    error: err.message,
    stack: err.stack,
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor.'
    : err.message;

  return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
    success: false,
    message,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      details: process.env.NODE_ENV === 'development' ? err.stack : null,
    },
  });
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res) {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      details: null,
    },
  });
}

/**
 * Async handler wrapper
 * Catches async errors and passes to error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
