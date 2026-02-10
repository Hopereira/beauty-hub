const { verifyAccessToken } = require('../utils/jwt');
const logger = require('../utils/logger');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso não fornecido.',
      error: { code: 'AUTH_TOKEN_MISSING', details: null },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Invalid or expired token', { error: err.message });
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado.',
      error: { code: 'AUTH_TOKEN_INVALID', details: null },
    });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissão insuficiente.',
        error: { code: 'AUTH_FORBIDDEN', details: null },
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
