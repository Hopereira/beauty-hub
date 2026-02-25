/**
 * Billing Routes
 * Public and tenant-scoped billing endpoints
 */

const { Router } = require('express');
const { validate } = require('../../../shared/middleware/validation');
const {
  activateSubscriptionSchema,
  createPixPaymentSchema,
  changePlanSchema,
  cancelSubscriptionSchema,
  listInvoicesQuerySchema,
  uuidParamSchema,
  slugParamSchema,
} = require('../validation/billing.validation');

/**
 * Create billing routes
 * @param {BillingController} controller - Billing controller instance
 * @param {object} middleware - Middleware functions
 */
function createBillingRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC ROUTES (no auth required)
  // ═══════════════════════════════════════════════════════════════════════════

  // Get all public plans
  router.get('/plans', controller.getPlans);

  // Get plan by slug
  router.get('/plans/:slug', validate(slugParamSchema, 'params'), controller.getPlanBySlug);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATED ROUTES (tenant context required)
  // ═══════════════════════════════════════════════════════════════════════════

  // All routes below require authentication
  if (authenticate) {
    router.use(authenticate);
  }
  if (tenantResolver) {
    router.use(tenantResolver);
  }

  // Get current subscription
  router.get(
    '/subscription',
    controller.getSubscription
  );

  // Activate subscription with payment
  router.post(
    '/subscription/activate',
    authorize ? authorize(['owner', 'admin']) : (req, res, next) => next(),
    validate(activateSubscriptionSchema),
    controller.activateSubscription
  );

  // Create PIX payment
  router.post(
    '/subscription/pix',
    authorize ? authorize(['owner', 'admin']) : (req, res, next) => next(),
    validate(createPixPaymentSchema),
    controller.createPixPayment
  );

  // Change plan
  router.put(
    '/subscription/plan',
    authorize ? authorize(['owner']) : (req, res, next) => next(),
    validate(changePlanSchema),
    controller.changePlan
  );

  // Cancel subscription
  router.post(
    '/subscription/cancel',
    authorize ? authorize(['owner']) : (req, res, next) => next(),
    validate(cancelSubscriptionSchema),
    controller.cancelSubscription
  );

  // Get invoices
  router.get(
    '/invoices',
    validate(listInvoicesQuerySchema, 'query'),
    controller.getInvoices
  );

  // Get invoice by ID
  router.get(
    '/invoices/:id',
    validate(uuidParamSchema, 'params'),
    controller.getInvoice
  );

  return router;
}

module.exports = createBillingRoutes;
