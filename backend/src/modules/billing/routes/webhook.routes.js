/**
 * Webhook Routes
 * Handles payment gateway webhook endpoints
 */

const { Router } = require('express');
const { validate } = require('../../../shared/middleware/validation');
const { providerParamSchema } = require('../validation/billing.validation');

/**
 * Create webhook routes
 * @param {WebhookController} controller - Webhook controller instance
 */
function createWebhookRoutes(controller) {
  const router = Router();

  // Webhook endpoint for payment providers
  // POST /api/webhooks/billing/:provider
  router.post(
    '/:provider',
    validate(providerParamSchema, 'params'),
    controller.handleWebhook
  );

  return router;
}

module.exports = createWebhookRoutes;
