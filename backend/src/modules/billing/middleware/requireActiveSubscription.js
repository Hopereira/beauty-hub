/**
 * Require Active Subscription Middleware
 * Blocks write operations for suspended/cancelled subscriptions
 */

const { SUBSCRIPTION_STATUS, TENANT_STATUS, HTTP_STATUS, ERROR_CODES } = require('../../../shared/constants');

/**
 * Custom error for inactive subscription
 */
class SubscriptionInactiveError extends Error {
  constructor(message = 'Your subscription is inactive. Please renew to continue.', status = null) {
    super(message);
    this.name = 'SubscriptionInactiveError';
    this.statusCode = HTTP_STATUS.FORBIDDEN;
    this.code = ERROR_CODES.SUBSCRIPTION_EXPIRED;
    this.subscriptionStatus = status;
  }
}

/**
 * Middleware factory to require active subscription
 * @param {object} options - Configuration options
 * @param {boolean} options.allowRead - Allow read operations even if suspended (default: true)
 * @param {boolean} options.allowTrial - Allow trial subscriptions (default: true)
 * @param {Array} options.exemptRoles - Roles exempt from check (default: ['MASTER'])
 * @param {Array} options.exemptPaths - Paths exempt from check (default: billing-related)
 */
function requireActiveSubscription(options = {}) {
  const {
    allowRead = true,
    allowTrial = true,
    exemptRoles = ['master'],
    exemptPaths = [
      '/api/billing',
      '/api/plans',
      '/api/subscriptions',
      '/api/invoices',
      '/api/auth',
      '/api/health',
      '/api/webhooks',
    ],
  } = options;

  return async (req, res, next) => {
    try {
      // Check if path is exempt
      const isExemptPath = exemptPaths.some(path => req.path.startsWith(path));
      if (isExemptPath) {
        return next();
      }

      // Check if role is exempt
      const userRole = req.user?.role?.toLowerCase();
      if (userRole && exemptRoles.includes(userRole)) {
        return next();
      }

      // Allow read operations if configured
      const isReadOperation = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      if (allowRead && isReadOperation) {
        return next();
      }

      // Get tenant and subscription from request
      const tenant = req.tenant;
      const subscription = req.subscription || tenant?.subscription;

      if (!tenant) {
        return next(); // Let tenant middleware handle this
      }

      // Check tenant status first
      if (tenant.status === TENANT_STATUS.SUSPENDED) {
        throw new SubscriptionInactiveError(
          'Your account is suspended due to payment issues. Please update your payment method.',
          'tenant_suspended'
        );
      }

      if (tenant.status === TENANT_STATUS.CANCELLED) {
        throw new SubscriptionInactiveError(
          'Your account has been cancelled. Please contact support to reactivate.',
          'tenant_cancelled'
        );
      }

      // Check subscription if available
      if (subscription) {
        const status = subscription.status;

        // Active subscriptions are OK
        if (status === SUBSCRIPTION_STATUS.ACTIVE) {
          return next();
        }

        // Trial subscriptions
        if (status === SUBSCRIPTION_STATUS.TRIAL) {
          if (!allowTrial) {
            throw new SubscriptionInactiveError(
              'This feature requires an active paid subscription.',
              'trial'
            );
          }

          // Check if trial has expired
          if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) < new Date()) {
            throw new SubscriptionInactiveError(
              'Your trial has expired. Please subscribe to continue.',
              'trial_expired'
            );
          }

          return next();
        }

        // Past due - allow grace period
        if (status === SUBSCRIPTION_STATUS.PAST_DUE) {
          const gracePeriodDays = subscription.grace_period_days || 7;
          const gracePeriodEnd = new Date(subscription.current_period_end);
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

          if (new Date() > gracePeriodEnd) {
            throw new SubscriptionInactiveError(
              'Your subscription is past due. Please update your payment to continue.',
              'past_due'
            );
          }

          // Still in grace period - allow but warn
          res.setHeader('X-Subscription-Warning', 'past_due');
          return next();
        }

        // Suspended
        if (status === SUBSCRIPTION_STATUS.SUSPENDED) {
          throw new SubscriptionInactiveError(
            'Your subscription has been suspended. Please renew to continue.',
            'suspended'
          );
        }

        // Cancelled
        if (status === SUBSCRIPTION_STATUS.CANCELLED) {
          // Check if still within paid period
          if (subscription.current_period_end && new Date(subscription.current_period_end) > new Date()) {
            return next();
          }

          throw new SubscriptionInactiveError(
            'Your subscription has been cancelled.',
            'cancelled'
          );
        }

        // Expired
        if (status === SUBSCRIPTION_STATUS.EXPIRED) {
          throw new SubscriptionInactiveError(
            'Your subscription has expired. Please renew to continue.',
            'expired'
          );
        }
      }

      // No subscription found - check if tenant should have one
      // For new tenants without subscription, allow a grace period
      if (!subscription && tenant.created_at) {
        const daysSinceCreation = Math.floor(
          (new Date() - new Date(tenant.created_at)) / (1000 * 60 * 60 * 24)
        );

        // Allow 7 days for new tenants to set up subscription
        if (daysSinceCreation <= 7) {
          res.setHeader('X-Subscription-Warning', 'no_subscription');
          return next();
        }

        throw new SubscriptionInactiveError(
          'Please set up a subscription to continue using the platform.',
          'no_subscription'
        );
      }

      next();
    } catch (error) {
      if (error instanceof SubscriptionInactiveError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            subscriptionStatus: error.subscriptionStatus,
          },
        });
      }
      next(error);
    }
  };
}

/**
 * Middleware to load subscription into request
 */
function loadSubscription(Subscription, SubscriptionPlan) {
  return async (req, res, next) => {
    try {
      if (!req.tenant?.id) {
        return next();
      }

      const subscription = await Subscription.findOne({
        where: { tenant_id: req.tenant.id },
        include: [{ model: SubscriptionPlan, as: 'plan' }],
        order: [['created_at', 'DESC']],
      });

      if (subscription) {
        req.subscription = subscription;

        // Attach subscription info to response headers for debugging
        res.setHeader('X-Subscription-Status', subscription.status);
        res.setHeader('X-Subscription-Plan', subscription.plan?.slug || 'unknown');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if a specific feature is available in the current plan
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      const subscription = req.subscription;
      
      if (!subscription || !subscription.plan) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: ERROR_CODES.FEATURE_NOT_AVAILABLE,
            message: 'This feature requires an active subscription.',
            feature: featureName,
          },
        });
      }

      const plan = subscription.plan;
      const features = plan.features || [];

      if (!features.includes(featureName)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: ERROR_CODES.FEATURE_NOT_AVAILABLE,
            message: `This feature requires a higher plan. Current plan: ${plan.name}`,
            feature: featureName,
            currentPlan: plan.slug,
          },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if usage limit is not exceeded
 */
function checkUsageLimit(limitKey, getCurrentUsage) {
  return async (req, res, next) => {
    try {
      const subscription = req.subscription;
      
      if (!subscription || !subscription.plan) {
        return next(); // Let requireActiveSubscription handle this
      }

      const plan = subscription.plan;
      const limits = plan.limits || {};
      const limit = limits[limitKey] || plan[`max_${limitKey}`];

      if (!limit) {
        return next(); // No limit defined
      }

      const currentUsage = await getCurrentUsage(req);

      if (currentUsage >= limit) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: ERROR_CODES.SUBSCRIPTION_LIMIT_REACHED,
            message: `You have reached the ${limitKey} limit for your plan.`,
            limit,
            current: currentUsage,
            limitKey,
            currentPlan: plan.slug,
          },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  requireActiveSubscription,
  loadSubscription,
  requireFeature,
  checkUsageLimit,
  SubscriptionInactiveError,
};
