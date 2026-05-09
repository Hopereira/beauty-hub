/**
 * Sentry Configuration
 * Error tracking and performance monitoring
 * FASE 6: Observability
 */

const Sentry = require('@sentry/node');
const env = require('./env');

/**
 * Initialize Sentry
 * Only active in production/staging with valid DSN
 */
function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn || env.nodeEnv === 'development') {
    console.log('[SENTRY] Disabled (no DSN or development mode)');
    return null;
  }
  
  Sentry.init({
    dsn,
    environment: env.nodeEnv,
    release: process.env.SENTRY_RELEASE || process.env.FLY_IMAGE_REF || 'unknown',
    
    // Performance monitoring
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    
    // Set user context for better debugging
    beforeSend(event, hint) {
      // Filter sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.['authorization'];
        delete event.request.headers?.['cookie'];
      }
      
      // Add tenant context if available
      if (hint?.syntheticException?._tenantContext) {
        event.tags = event.tags || {};
        event.tags.tenant_id = hint.syntheticException._tenantContext.tenantId;
      }
      
      return event;
    },
    
    integrations: [
      // Automatically instrument Node.js libraries
      Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
    ],
  });
  
  console.log('[SENTRY] Initialized');
  return Sentry;
}

/**
 * Express middleware for Sentry
 */
function sentryMiddleware() {
  return Sentry.Handlers.requestHandler({
    ip: true,
    user: ['id', 'email', 'tenantId'],
  });
}

/**
 * Express error handler for Sentry
 */
function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only send 500+ errors to Sentry
      return !error.statusCode || error.statusCode >= 500;
    },
  });
}

/**
 * Set user context for Sentry
 */
function setUserContext(user) {
  if (!user) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    tenantId: user.tenantId || user.tenant_id,
  });
}

/**
 * Set tenant context for debugging
 */
function setTenantContext(tenantId) {
  Sentry.setTag('tenant_id', tenantId || 'none');
}

/**
 * Capture exception with context
 */
function captureException(error, context = {}) {
  if (context.user) {
    setUserContext(context.user);
  }
  if (context.tenantId) {
    setTenantContext(context.tenantId);
  }
  
  Sentry.captureException(error);
}

/**
 * Capture message
 */
function captureMessage(message, level = 'info') {
  Sentry.captureMessage(message, level);
}

module.exports = {
  initSentry,
  sentryMiddleware,
  sentryErrorHandler,
  setUserContext,
  setTenantContext,
  captureException,
  captureMessage,
  Sentry,
};
