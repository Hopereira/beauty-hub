/**
 * Mock Billing Routes
 * Testing endpoints for billing flows
 * ONLY available when PAYMENT_PROVIDER=mock
 */

const express = require('express');

const createMockBillingRoutes = (mockController, authMiddleware) => {
  const router = express.Router();

  // Middleware to check if mock provider is enabled
  const requireMockProvider = (req, res, next) => {
    const provider = process.env.PAYMENT_PROVIDER || 'mock';
    if (provider !== 'mock') {
      return res.status(403).json({
        success: false,
        message: 'Mock endpoints only available when PAYMENT_PROVIDER=mock',
      });
    }
    next();
  };

  // Apply mock provider check to all routes
  router.use(requireMockProvider);

  // ─────────────────────────────────────────────────────────────────────────────
  // Public mock endpoints (for testing)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/billing/mock/events
   * List all supported mock events
   */
  router.get('/events', mockController.listEvents);

  /**
   * POST /api/billing/mock/trigger
   * Trigger a mock billing event
   * Body: { event: string, tenantId?: string, subscriptionId?: string, data?: object }
   */
  router.post('/trigger', mockController.triggerEvent);

  /**
   * POST /api/billing/mock/simulate/trial-expiration
   * Simulate trial expiration
   */
  router.post('/simulate/trial-expiration', mockController.simulateTrialExpiration);

  /**
   * POST /api/billing/mock/simulate/grace-period-expiration
   * Simulate grace period expiration
   */
  router.post('/simulate/grace-period-expiration', mockController.simulateGracePeriodExpiration);

  /**
   * GET /api/billing/mock/subscription/:tenantId
   * Get detailed subscription status
   */
  router.get('/subscription/:tenantId', mockController.getSubscriptionStatus);

  /**
   * POST /api/billing/mock/reset/:tenantId
   * Reset subscription to trial
   */
  router.post('/reset/:tenantId', mockController.resetSubscription);

  /**
   * POST /api/billing/mock/job/:jobName
   * Manually run a billing job
   */
  router.post('/job/:jobName', mockController.runBillingJob);

  return router;
};

module.exports = { createMockBillingRoutes };
