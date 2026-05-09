/**
 * Request ID Middleware
 * Adds correlation ID to each request for tracing
 * FASE 6: Observability
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Attach request ID to each request
 */
function requestIdMiddleware(req, res, next) {
  // Get request ID from header or generate new
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to request
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('x-request-id', requestId);
  
  // Add to request context for logging
  req.logContext = {
    requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };
  
  next();
}

module.exports = requestIdMiddleware;
