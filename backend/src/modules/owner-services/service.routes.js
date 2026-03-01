/**
 * Owner Services Routes
 */

const { Router } = require('express');
const { validate } = require('../../shared/middleware/validation');
const Joi = require('joi');

const createServiceSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().allow(null, ''),
  price: Joi.number().min(0).required(),
  duration_minutes: Joi.number().integer().min(1).required(),
  category: Joi.string().max(100).allow(null, ''),
  active: Joi.boolean().default(true),
});

const updateServiceSchema = Joi.object({
  name: Joi.string().max(255),
  description: Joi.string().allow(null, ''),
  price: Joi.number().min(0),
  duration_minutes: Joi.number().integer().min(1),
  category: Joi.string().max(100).allow(null, ''),
  active: Joi.boolean(),
});

function createServiceRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['OWNER', 'ADMIN']));

  router.post('/', validate(createServiceSchema), controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.put('/:id', validate(updateServiceSchema), controller.update);
  router.delete('/:id', controller.delete);

  return router;
}

module.exports = createServiceRoutes;
