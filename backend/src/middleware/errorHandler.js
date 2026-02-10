const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  logger.error(err.message, { stack: err.stack, url: req.originalUrl, method: req.method });

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const details = {};
    if (err.errors) {
      err.errors.forEach((e) => {
        details[e.path] = e.message;
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Erro de validação no banco de dados.',
      error: { code: 'DB_VALIDATION_ERROR', details },
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Erro interno do servidor.' : err.message,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : null,
    },
  });
}

module.exports = errorHandler;
