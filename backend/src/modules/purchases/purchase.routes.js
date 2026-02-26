/**
 * Purchase Routes
 */

const { Router } = require('express');
const { validate } = require('../../shared/middleware/validation');
const Joi = require('joi');

const createPurchaseSchema = Joi.object({
  supplier_id: Joi.string().uuid().required(),
  payment_method: Joi.string().valid('DINHEIRO', 'DEBITO', 'CREDITO', 'PIX', 'TRANSFERENCIA', 'BOLETO', 'A_PRAZO').required(),
  payment_status: Joi.string().valid('PENDING', 'PAID', 'PARTIAL', 'CANCELLED').default('PENDING'),
  notes: Joi.string().allow(null, ''),
  items: Joi.array().items(
    Joi.object({
      product_id: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).required(),
      unit_cost: Joi.number().min(0).required(),
    })
  ).min(1).required(),
});

function createPurchaseRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['owner', 'admin']));

  router.post('/', validate(createPurchaseSchema), controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.delete('/:id', controller.delete);

  return router;
}

module.exports = createPurchaseRoutes;
