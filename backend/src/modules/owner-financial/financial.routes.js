/**
 * Owner Financial Routes
 */

const { Router } = require('express');
const { validate } = require('../../shared/middleware/validation');
const Joi = require('joi');

const financialEntrySchema = Joi.object({
  description: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  entry_date: Joi.date().required(),
  status: Joi.string().valid('PENDING', 'PAID').default('PENDING'),
  payment_method_id: Joi.string().uuid().allow(null),
  client_id: Joi.string().uuid().allow(null),
  appointment_id: Joi.string().uuid().allow(null),
});

const financialExitSchema = Joi.object({
  description: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  exit_date: Joi.date().required(),
  status: Joi.string().valid('PENDING', 'PAID').default('PENDING'),
  category: Joi.string().max(100).allow(null, ''),
});

const paymentMethodSchema = Joi.object({
  name: Joi.string().max(100).required(),
  active: Joi.boolean().default(true),
});

function createFinancialRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['OWNER', 'ADMIN']));

  // Summary
  router.get('/summary', controller.getSummary);

  // Entries
  router.get('/entries', controller.listEntries);
  router.get('/entries/:id', controller.getEntryById);
  router.post('/entries', validate(financialEntrySchema), controller.createEntry);
  router.put('/entries/:id', controller.updateEntry);
  router.delete('/entries/:id', controller.deleteEntry);

  // Exits
  router.get('/exits', controller.listExits);
  router.get('/exits/:id', controller.getExitById);
  router.post('/exits', validate(financialExitSchema), controller.createExit);
  router.put('/exits/:id', controller.updateExit);
  router.delete('/exits/:id', controller.deleteExit);

  // Payment Methods
  router.get('/payment-methods', controller.listPaymentMethods);
  router.post('/payment-methods', validate(paymentMethodSchema), controller.createPaymentMethod);
  router.put('/payment-methods/:id', controller.updatePaymentMethod);
  router.delete('/payment-methods/:id', controller.deletePaymentMethod);

  return router;
}

module.exports = createFinancialRoutes;
