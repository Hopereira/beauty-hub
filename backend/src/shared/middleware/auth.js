/**
 * Authentication & Authorization Middleware
 * JWT verification with tenant context and RBAC
 */

const { verifyAccessToken } = require('../utils/jwt');
const { UnauthorizedError, ForbiddenError } = require('../errors');
const { ROLES, ROLE_HIERARCHY, ERROR_CODES } = require('../constants');
const logger = require('../utils/logger');

/**
 * Authenticate user via JWT
 * Extracts user info and tenant context from token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError(
      'Token de acesso não fornecido.',
      ERROR_CODES.AUTH_TOKEN_MISSING
    ));
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = verifyAccessToken(token);
    
    // Inject user info into request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId || null,
    };

    // If token has tenantId and request doesn't, use token's tenantId
    if (decoded.tenantId && !req.tenantId) {
      req.tenantId = decoded.tenantId;
    }

    next();
  } catch (err) {
    logger.warn('Invalid or expired token', { error: err.message });
    
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError(
        'Token expirado. Faça login novamente.',
        ERROR_CODES.AUTH_TOKEN_EXPIRED
      ));
    }
    
    return next(new UnauthorizedError(
      'Token inválido.',
      ERROR_CODES.AUTH_TOKEN_INVALID
    ));
  }
}

/**
 * Authorize user by role(s)
 * Supports role hierarchy - higher roles include lower role permissions
 * @param {...string} allowedRoles - Roles allowed to access
 * @returns {Function} Express middleware
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError(
        'Autenticação necessária.',
        ERROR_CODES.AUTH_TOKEN_MISSING
      ));
    }

    const userRole = req.user.role;
    const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);

    // Check if user's role is in allowed roles
    const hasDirectAccess = allowedRoles.includes(userRole);

    // Check if user has higher role (hierarchy)
    const hasHierarchyAccess = allowedRoles.some(role => {
      const requiredIndex = ROLE_HIERARCHY.indexOf(role);
      return userRoleIndex > requiredIndex;
    });

    if (!hasDirectAccess && !hasHierarchyAccess) {
      logger.warn('Authorization denied', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        tenantId: req.tenantId,
      });
      
      return next(new ForbiddenError(
        'Acesso negado. Permissão insuficiente.'
      ));
    }

    next();
  };
}

/**
 * Authorize only specific roles (no hierarchy)
 * @param {...string} exactRoles - Exact roles allowed
 * @returns {Function} Express middleware
 */
function authorizeExact(...exactRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError(
        'Autenticação necessária.',
        ERROR_CODES.AUTH_TOKEN_MISSING
      ));
    }

    if (!exactRoles.includes(req.user.role)) {
      return next(new ForbiddenError(
        'Acesso negado. Permissão insuficiente.'
      ));
    }

    next();
  };
}

/**
 * Check if user can access resource owned by another user
 * @param {Function} getOwnerId - Function to extract owner ID from request
 * @returns {Function} Express middleware
 */
function authorizeOwnerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError());
      }

      // MASTER, OWNER, ADMIN can access any resource in tenant
      const adminRoles = [ROLES.MASTER, ROLES.OWNER, ROLES.ADMIN];
      if (adminRoles.includes(req.user.role)) {
        return next();
      }

      // Check if user owns the resource
      const ownerId = await getOwnerId(req);
      if (ownerId && ownerId === req.user.id) {
        return next();
      }

      return next(new ForbiddenError(
        'Acesso negado. Você não tem permissão para acessar este recurso.'
      ));
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to ensure user belongs to current tenant
 * Must be used after authenticate and tenantResolver
 */
function ensureTenantMember(req, res, next) {
  // MASTER can access any tenant
  if (req.user && req.user.role === ROLES.MASTER) {
    return next();
  }

  // User must have tenantId matching request tenantId
  if (!req.user || !req.tenantId) {
    return next(new ForbiddenError(
      'Contexto de tenant inválido.'
    ));
  }

  if (req.user.tenantId !== req.tenantId) {
    return next(new ForbiddenError(
      'Usuário não pertence a este tenant.'
    ));
  }

  next();
}

module.exports = {
  authenticate,
  authorize,
  authorizeExact,
  authorizeOwnerOrAdmin,
  ensureTenantMember,
  ROLES,
};
