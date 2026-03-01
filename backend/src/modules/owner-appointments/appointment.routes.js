/**
 * Owner Appointments Routes
 */

const { Router } = require('express');
const { validate } = require('../../shared/middleware/validation');
const Joi = require('joi');

const createAppointmentSchema = Joi.object({
  client_id: Joi.string().uuid().required(),
  professional_id: Joi.string().uuid().required(),
  service_id: Joi.string().uuid().required(),
  start_time: Joi.date().required(),
  end_time: Joi.date().allow(null),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW').default('PENDING'),
  notes: Joi.string().allow(null, ''),
  price_charged: Joi.number().min(0).allow(null),
});

const updateAppointmentSchema = Joi.object({
  client_id: Joi.string().uuid(),
  professional_id: Joi.string().uuid(),
  service_id: Joi.string().uuid(),
  start_time: Joi.date(),
  end_time: Joi.date().allow(null),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'),
  notes: Joi.string().allow(null, ''),
  price_charged: Joi.number().min(0).allow(null),
});

function createAppointmentRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['OWNER', 'ADMIN', 'PROFESSIONAL']));

  router.post('/', validate(createAppointmentSchema), controller.create);
  router.get('/', controller.getAll);
  router.get('/calendar', controller.getCalendar);
  router.get('/:id', controller.getById);
  router.put('/:id', validate(updateAppointmentSchema), controller.update);
  router.delete('/:id', controller.delete);

  return router;
}

module.exports = createAppointmentRoutes;
