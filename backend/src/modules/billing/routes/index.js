/**
 * Billing Routes Index
 */

const { createBillingRoutes } = require('./billing.routes');
const { createMasterBillingRoutes } = require('./master.routes');
const { createWebhookRoutes } = require('./webhook.routes');
const { createMockBillingRoutes } = require('./mock.routes');

module.exports = {
  createBillingRoutes,
  createMasterBillingRoutes,
  createWebhookRoutes,
  createMockBillingRoutes,
};
