/**
 * Product Routes
 */

const { Router } = require('express');
const { validate } = require('../../shared/middleware/validation');
const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().max(255).required(),
  category: Joi.string().max(100).allow(null, ''),
  internal_code: Joi.string().max(50).allow(null, ''),
  barcode: Joi.string().max(50).allow(null, ''),
  supplier_id: Joi.string().uuid().allow(null),
  cost_price: Joi.number().min(0).required(),
  sale_price: Joi.number().min(0).required(),
  stock_quantity: Joi.number().integer().min(0).default(0),
  minimum_stock: Joi.number().integer().min(0).default(0),
  expiration_date: Joi.date().allow(null),
  batch_number: Joi.string().max(50).allow(null, ''),
  active: Joi.boolean().default(true),
});

const updateProductSchema = Joi.object({
  name: Joi.string().max(255),
  category: Joi.string().max(100).allow(null, ''),
  internal_code: Joi.string().max(50).allow(null, ''),
  barcode: Joi.string().max(50).allow(null, ''),
  supplier_id: Joi.string().uuid().allow(null),
  cost_price: Joi.number().min(0),
  sale_price: Joi.number().min(0),
  minimum_stock: Joi.number().integer().min(0),
  expiration_date: Joi.date().allow(null),
  batch_number: Joi.string().max(50).allow(null, ''),
  active: Joi.boolean(),
});

const adjustStockSchema = Joi.object({
  quantity: Joi.number().integer().required(),
  notes: Joi.string().allow(null, ''),
});

function createProductRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['owner', 'admin']));

  router.post('/', validate(createProductSchema), controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.put('/:id', validate(updateProductSchema), controller.update);
  router.delete('/:id', controller.delete);
  router.post('/:id/adjust-stock', validate(adjustStockSchema), controller.adjustStock);

  return router;
}

module.exports = createProductRoutes;
