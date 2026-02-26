/**
 * Supplier Routes
 */

const { Router } = require('express');
const { validate } = require('../../shared/middleware/validation');
const Joi = require('joi');

const createSupplierSchema = Joi.object({
  name: Joi.string().max(255).required(),
  document: Joi.string().max(18).allow(null, ''),
  phone: Joi.string().max(20).allow(null, ''),
  email: Joi.string().email().max(255).allow(null, ''),
  address: Joi.string().allow(null, ''),
  notes: Joi.string().allow(null, ''),
  active: Joi.boolean().default(true),
});

const updateSupplierSchema = Joi.object({
  name: Joi.string().max(255),
  document: Joi.string().max(18).allow(null, ''),
  phone: Joi.string().max(20).allow(null, ''),
  email: Joi.string().email().max(255).allow(null, ''),
  address: Joi.string().allow(null, ''),
  notes: Joi.string().allow(null, ''),
  active: Joi.boolean(),
});

function createSupplierRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['owner', 'admin']));

  router.post('/', validate(createSupplierSchema), controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.put('/:id', validate(updateSupplierSchema), controller.update);
  router.delete('/:id', controller.delete);

  return router;
}

module.exports = createSupplierRoutes;
