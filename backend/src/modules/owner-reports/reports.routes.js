/**
 * Owner Reports Routes
 */

const { Router } = require('express');

function createReportsRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['OWNER', 'ADMIN']));

  router.get('/revenue-by-period', controller.getRevenueByPeriod);
  router.get('/commission-by-professional', controller.getCommissionByProfessional);
  router.get('/top-services', controller.getTopServices);
  router.get('/top-products', controller.getTopProducts);
  router.get('/financial-summary', controller.getFinancialSummary);

  return router;
}

module.exports = createReportsRoutes;
