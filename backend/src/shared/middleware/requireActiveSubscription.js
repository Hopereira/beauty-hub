/**
 * Middleware: Require Active Subscription
 * Enforces subscription status for SaaS features
 * 
 * Subscription Status Rules:
 * - ACTIVE: Full access
 * - TRIAL: Full access (trial period)
 * - PAST_DUE: Read-only access
 * - SUSPENDED: Blocked
 * - CANCELED: Blocked
 */

const logger = require('../../utils/logger');

/**
 * Check if subscription allows write operations
 */
function allowsWrite(status) {
  return ['active', 'trialing'].includes(status?.toLowerCase());
}

/**
 * Check if subscription allows read operations
 */
function allowsRead(status) {
  return ['active', 'trialing', 'past_due'].includes(status?.toLowerCase());
}

/**
 * Middleware factory
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowReadOnly - Allow read operations for PAST_DUE
 */
function requireActiveSubscription(options = {}) {
  const { allowReadOnly = false } = options;

  return async (req, res, next) => {
    try {
      // Get tenant from request (set by tenantResolver middleware)
      const tenant = req.tenant;

      if (!tenant) {
        logger.warn('[Subscription] No tenant found in request');
        return res.status(403).json({
          success: false,
          message: 'Tenant not found',
          error: { 
            code: 'TENANT_NOT_FOUND', 
            details: 'Multi-tenant context is required' 
          },
        });
      }

      // Get subscription from tenant
      const { Subscription } = require('../../models');
      const subscription = await Subscription.findOne({
        where: { tenant_id: tenant.id },
        order: [['created_at', 'DESC']],
      });

      if (!subscription) {
        logger.warn(`[Subscription] No subscription found for tenant ${tenant.slug}`);
        return res.status(402).json({
          success: false,
          message: 'No active subscription',
          error: { 
            code: 'NO_SUBSCRIPTION', 
            details: 'Please subscribe to a plan to access this feature',
            action: 'redirect_to_billing',
          },
        });
      }

      const status = subscription.status?.toLowerCase();
      const method = req.method.toUpperCase();
      const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

      // Check subscription status
      if (status === 'suspended' || status === 'canceled') {
        logger.warn(`[Subscription] Access denied for tenant ${tenant.slug} - status: ${status}`);
        return res.status(402).json({
          success: false,
          message: `Subscription is ${status}`,
          error: { 
            code: 'SUBSCRIPTION_INACTIVE', 
            details: `Your subscription is ${status}. Please update your billing information.`,
            action: 'redirect_to_billing',
            subscription: {
              status: subscription.status,
              plan: subscription.plan_name,
            },
          },
        });
      }

      // Check write operations for PAST_DUE
      if (status === 'past_due' && isWriteOperation) {
        logger.warn(`[Subscription] Write operation denied for tenant ${tenant.slug} - status: past_due`);
        return res.status(402).json({
          success: false,
          message: 'Subscription payment is past due',
          error: { 
            code: 'SUBSCRIPTION_PAST_DUE', 
            details: 'Your subscription payment is overdue. Read-only access granted. Please update your payment method.',
            action: 'redirect_to_billing',
            subscription: {
              status: subscription.status,
              plan: subscription.plan_name,
            },
          },
        });
      }

      // Check if subscription allows the operation
      if (isWriteOperation && !allowsWrite(status)) {
        return res.status(402).json({
          success: false,
          message: 'Subscription does not allow write operations',
          error: { 
            code: 'SUBSCRIPTION_READ_ONLY', 
            details: 'Your subscription is in read-only mode',
            action: 'redirect_to_billing',
          },
        });
      }

      if (!isWriteOperation && !allowsRead(status)) {
        return res.status(402).json({
          success: false,
          message: 'Subscription does not allow access',
          error: { 
            code: 'SUBSCRIPTION_BLOCKED', 
            details: 'Your subscription does not allow access to this resource',
            action: 'redirect_to_billing',
          },
        });
      }

      // Attach subscription to request for downstream use
      req.subscription = subscription;

      // Log successful access
      logger.debug(`[Subscription] Access granted for tenant ${tenant.slug} - status: ${status}, method: ${method}`);

      next();
    } catch (error) {
      logger.error('[Subscription] Middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking subscription status',
        error: { 
          code: 'SUBSCRIPTION_CHECK_ERROR', 
          details: error.message 
        },
      });
    }
  };
}

module.exports = requireActiveSubscription;
