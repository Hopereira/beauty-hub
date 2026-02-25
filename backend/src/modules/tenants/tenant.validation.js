/**
 * Tenant Validation Schemas
 */

const { Joi, schemas } = require('../../shared/middleware/validation');
const { TENANT_STATUS } = require('../../shared/constants');

const createTenantSchema = Joi.object({
  name: Joi.string().min(2).max(255).required()
    .messages({
      'string.min': 'Nome deve ter no mínimo 2 caracteres.',
      'string.max': 'Nome deve ter no máximo 255 caracteres.',
      'any.required': 'Nome é obrigatório.',
    }),
  
  slug: schemas.slug.optional(),
  
  email: schemas.email.required()
    .messages({
      'string.email': 'Email inválido.',
      'any.required': 'Email é obrigatório.',
    }),
  
  phone: schemas.phone.optional(),
  
  document_type: Joi.string().valid('cpf', 'cnpj').required()
    .messages({
      'any.only': 'Tipo de documento deve ser cpf ou cnpj.',
      'any.required': 'Tipo de documento é obrigatório.',
    }),
  
  document: Joi.string().required()
    .when('document_type', {
      is: 'cpf',
      then: schemas.cpf,
      otherwise: schemas.cnpj,
    })
    .messages({
      'any.required': 'Documento é obrigatório.',
    }),
  
  type: Joi.string().valid('establishment', 'autonomous').default('establishment'),
  
  address: Joi.object({
    street: Joi.string().max(255).optional(),
    number: Joi.string().max(20).optional(),
    complement: Joi.string().max(100).optional(),
    neighborhood: Joi.string().max(100).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(2).uppercase().optional(),
    zipCode: Joi.string().pattern(/^\d{8}$/).optional(),
    country: Joi.string().max(2).uppercase().default('BR'),
  }).optional(),
  
  settings: Joi.object({
    timezone: Joi.string().default('America/Sao_Paulo'),
    currency: Joi.string().default('BRL'),
    language: Joi.string().default('pt-BR'),
    notificationsEnabled: Joi.boolean().default(true),
    allowOnlineBooking: Joi.boolean().default(true),
    requirePaymentOnBooking: Joi.boolean().default(false),
    cancellationPolicyHours: Joi.number().integer().min(0).default(24),
  }).optional(),
});

const updateTenantSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  email: schemas.email.optional(),
  phone: schemas.phone.optional().allow('', null),
  
  address: Joi.object({
    street: Joi.string().max(255).optional(),
    number: Joi.string().max(20).optional(),
    complement: Joi.string().max(100).optional().allow('', null),
    neighborhood: Joi.string().max(100).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(2).uppercase().optional(),
    zipCode: Joi.string().pattern(/^\d{8}$/).optional(),
    country: Joi.string().max(2).uppercase().optional(),
  }).optional(),
});

const updateSettingsSchema = Joi.object({
  timezone: Joi.string().optional(),
  currency: Joi.string().optional(),
  language: Joi.string().optional(),
  notificationsEnabled: Joi.boolean().optional(),
  allowOnlineBooking: Joi.boolean().optional(),
  requirePaymentOnBooking: Joi.boolean().optional(),
  cancellationPolicyHours: Joi.number().integer().min(0).optional(),
});

const updateBrandingSchema = Joi.object({
  logo: Joi.string().uri().optional().allow('', null),
  primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  customDomain: Joi.string().hostname().optional().allow('', null),
});

const suspendTenantSchema = Joi.object({
  reason: Joi.string().max(500).required()
    .messages({
      'any.required': 'Motivo da suspensão é obrigatório.',
    }),
});

const listTenantsSchema = Joi.object({
  page: schemas.pagination.page,
  limit: schemas.pagination.limit,
  status: Joi.string().valid(...Object.values(TENANT_STATUS)).optional(),
  type: Joi.string().valid('establishment', 'autonomous').optional(),
  search: Joi.string().max(100).optional(),
});

module.exports = {
  createTenantSchema,
  updateTenantSchema,
  updateSettingsSchema,
  updateBrandingSchema,
  suspendTenantSchema,
  listTenantsSchema,
};
