/**
 * Payment Transaction Routes
 */

const { Router } = require('express');
const { validate } = require('../../shared/middleware/validation');
const Joi = require('joi');

const createTransactionSchema = Joi.object({
  appointment_id: Joi.string().uuid().allow(null),
  client_id: Joi.string().uuid().required(),
  professional_id: Joi.string().uuid().required(),
  service_id: Joi.string().uuid().required(),
  total_amount: Joi.number().min(0).required(),
  payment_method: Joi.string().valid('DINHEIRO', 'DEBITO', 'CREDITO', 'PIX', 'TRANSFERENCIA').required(),
  gateway_fee: Joi.number().min(0).default(0),
  notes: Joi.string().allow(null, ''),
});

function createPaymentTransactionRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['owner', 'admin']));

  // CRUD
  router.post('/', validate(createTransactionSchema), controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.delete('/:id', controller.delete);

  // Reports
  router.get('/reports/revenue-stats', controller.getRevenueStats);
  router.get('/reports/revenue-by-professional', controller.getRevenueByProfessional);
  router.get('/reports/top-services', controller.getTopServices);

  return router;
}

module.exports = createPaymentTransactionRoutes;
