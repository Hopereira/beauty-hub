/**
 * Public Billing Routes
 * No authentication required
 */

const express = require('express');

function createPublicBillingRoutes(controller) {
  const router = express.Router();

  // Get all public plans
  router.get('/plans', controller.getPublicPlans.bind(controller));

  // Get plan by slug
  router.get('/plans/:slug', controller.getPlanBySlug.bind(controller));

  return router;
}

module.exports = createPublicBillingRoutes;
