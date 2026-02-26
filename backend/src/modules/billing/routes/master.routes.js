/**
 * Master Billing Routes
 * MASTER-only endpoints for billing administration
 */

const { Router } = require('express');
const { validate } = require('../../../shared/middleware/validation');
const {
  createPlanSchema,
  updatePlanSchema,
  listSubscriptionsQuerySchema,
  listInvoicesQuerySchema,
  revenueSummaryQuerySchema,
  auditLogsQuerySchema,
  suspendSubscriptionSchema,
  uuidParamSchema,
} = require('../validation/billing.validation');

/**
 * Create master billing routes
 * @param {MasterBillingController} controller - Master billing controller instance
 * @param {object} middleware - Middleware functions
 */
function createMasterBillingRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize } = middleware;

  // All routes require MASTER role
  if (authenticate) {
    router.use(authenticate);
  }
  if (authorize) {
    router.use(authorize(['master']));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // Get all plans (including inactive)
  router.get('/plans', controller.getAllPlans);

  // Create new plan
  router.post(
    '/plans',
    validate(createPlanSchema),
    controller.createPlan
  );

  // Update plan
  router.put(
    '/plans/:id',
    validate(uuidParamSchema, 'params'),
    validate(updatePlanSchema),
    controller.updatePlan
  );

  // Activate plan
  router.patch(
    '/plans/:id/activate',
    validate(uuidParamSchema, 'params'),
    controller.activatePlan
  );

  // Deactivate plan
  router.patch(
    '/plans/:id/deactivate',
    validate(uuidParamSchema, 'params'),
    controller.deactivatePlan
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // Get all subscriptions
  router.get(
    '/subscriptions',
    validate(listSubscriptionsQuerySchema, 'query'),
    controller.getAllSubscriptions
  );

  // Get subscription by ID
  router.get(
    '/subscriptions/:id',
    validate(uuidParamSchema, 'params'),
    controller.getSubscription
  );

  // Suspend subscription
  router.post(
    '/subscriptions/:id/suspend',
    validate(uuidParamSchema, 'params'),
    validate(suspendSubscriptionSchema),
    controller.suspendSubscription
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // REVENUE & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  // Get MRR
  router.get('/mrr', controller.getMRR);

  // Get revenue summary
  router.get(
    '/revenue-summary',
    validate(revenueSummaryQuerySchema, 'query'),
    controller.getRevenueSummary
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════════════════════════════════════

  // Get all invoices
  router.get(
    '/invoices',
    validate(listInvoicesQuerySchema, 'query'),
    controller.getAllInvoices
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  // Get audit logs
  router.get(
    '/audit-logs',
    validate(auditLogsQuerySchema, 'query'),
    controller.getAuditLogs
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  // Get webhook logs
  router.get('/webhook-logs', controller.getWebhookLogs);

  return router;
}

module.exports = createMasterBillingRoutes;
