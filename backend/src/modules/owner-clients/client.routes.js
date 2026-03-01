/**
 * Owner Clients Routes
 */

const { Router } = require('express');
const { validate } = require('../../shared/middleware/validation');
const Joi = require('joi');

const createClientSchema = Joi.object({
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).required(),
  email: Joi.string().email().allow(null, ''),
  phone: Joi.string().max(20).allow(null, ''),
  birth_date: Joi.date().allow(null),
  address: Joi.string().allow(null, ''),
  notes: Joi.string().allow(null, ''),
});

const updateClientSchema = Joi.object({
  first_name: Joi.string().max(100),
  last_name: Joi.string().max(100),
  email: Joi.string().email().allow(null, ''),
  phone: Joi.string().max(20).allow(null, ''),
  birth_date: Joi.date().allow(null),
  address: Joi.string().allow(null, ''),
  notes: Joi.string().allow(null, ''),
});

function createClientRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['OWNER', 'ADMIN', 'PROFESSIONAL']));

  router.post('/', validate(createClientSchema), controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.put('/:id', validate(updateClientSchema), controller.update);
  router.delete('/:id', controller.delete);
  router.get('/:id/appointments', controller.getAppointments);

  return router;
}

module.exports = createClientRoutes;
