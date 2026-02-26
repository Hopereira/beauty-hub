/**
 * Professional Detail Routes
 * Defines API endpoints for professional management
 */

const { Router } = require('express');
const { validate } = require('../../shared/middleware/validation');
const Joi = require('joi');

// Validation schemas
const createProfessionalSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  cpf: Joi.string().max(14).allow(null, ''),
  hire_date: Joi.date().allow(null),
  contract_type: Joi.string().valid('CLT', 'AUTONOMO', 'PARCEIRO').required(),
  base_commission_percentage: Joi.number().min(0).max(100).default(0),
  active: Joi.boolean().default(true),
});

const updateProfessionalSchema = Joi.object({
  cpf: Joi.string().max(14).allow(null, ''),
  hire_date: Joi.date().allow(null),
  contract_type: Joi.string().valid('CLT', 'AUTONOMO', 'PARCEIRO'),
  base_commission_percentage: Joi.number().min(0).max(100),
  active: Joi.boolean(),
});

const addSpecialtySchema = Joi.object({
  service_id: Joi.string().uuid().required(),
});

const setCommissionSchema = Joi.object({
  service_id: Joi.string().uuid().required(),
  commission_percentage: Joi.number().min(0).max(100).required(),
});

/**
 * Create professional routes
 */
function createProfessionalRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  // Apply middleware
  if (authenticate) router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize) router.use(authorize(['owner', 'admin']));

  // CRUD routes
  router.post('/', validate(createProfessionalSchema), controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.put('/:id', validate(updateProfessionalSchema), controller.update);
  router.delete('/:id', controller.delete);

  // Specialty management
  router.post('/:id/specialties', validate(addSpecialtySchema), controller.addSpecialty);
  router.delete('/:id/specialties/:serviceId', controller.removeSpecialty);

  // Commission management
  router.post('/:id/commissions', validate(setCommissionSchema), controller.setServiceCommission);

  // Statistics
  router.get('/:id/statistics', controller.getStatistics);

  return router;
}

module.exports = createProfessionalRoutes;
