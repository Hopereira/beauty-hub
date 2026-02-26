/**
 * Tenant From JWT Middleware
 * Maps req.user.tenantId to req.tenant for OWNER module compatibility
 */

function tenantFromJWT(req, res, next) {
  if (req.user && req.user.tenantId) {
    req.tenant = { id: req.user.tenantId };
    req.tenantId = req.user.tenantId;
  }
  next();
}

module.exports = tenantFromJWT;
