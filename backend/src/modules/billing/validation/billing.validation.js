/**
 * Billing Validation Schemas
 * Joi validation schemas for billing endpoints
 */

const Joi = require('joi');
const { BILLING_CYCLE, PAYMENT_METHOD_TYPE } = require('../../../shared/constants');

// ═══════════════════════════════════════════════════════════════════════════
// PLAN SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const createPlanSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().min(2).max(50).pattern(/^[a-z0-9-]+$/).required(),
  description: Joi.string().max(500).allow('', null),
  price_monthly: Joi.number().min(0).precision(2).required(),
  price_yearly: Joi.number().min(0).precision(2).allow(null),
  annual_discount_percentage: Joi.number().min(0).max(100).precision(2).default(15),
  currency: Joi.string().length(3).uppercase().default('BRL'),
  trial_days: Joi.number().integer().min(0).max(365).default(0),
  limits: Joi.object({
    users: Joi.number().integer().min(1),
    professionals: Joi.number().integer().min(1),
    clients: Joi.number().integer().min(1),
    appointments_per_month: Joi.number().integer().min(1),
    storage_mb: Joi.number().integer().min(1),
  }).default({}),
  features: Joi.array().items(Joi.string()).default([]),
  max_users: Joi.number().integer().min(1).allow(null),
  max_professionals: Joi.number().integer().min(1).allow(null),
  max_appointments_per_month: Joi.number().integer().min(1).allow(null),
  is_active: Joi.boolean().default(true),
  is_public: Joi.boolean().default(true),
  is_highlighted: Joi.boolean().default(false),
  sort_order: Joi.number().integer().min(0).default(0),
  metadata: Joi.object().default({}),
});

const updatePlanSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(500).allow('', null),
  price_monthly: Joi.number().min(0).precision(2),
  price_yearly: Joi.number().min(0).precision(2),
  annual_discount_percentage: Joi.number().min(0).max(100).precision(2),
  trial_days: Joi.number().integer().min(0).max(365),
  limits: Joi.object({
    users: Joi.number().integer().min(1),
    professionals: Joi.number().integer().min(1),
    clients: Joi.number().integer().min(1),
    appointments_per_month: Joi.number().integer().min(1),
    storage_mb: Joi.number().integer().min(1),
  }),
  features: Joi.array().items(Joi.string()),
  max_users: Joi.number().integer().min(1).allow(null),
  max_professionals: Joi.number().integer().min(1).allow(null),
  max_appointments_per_month: Joi.number().integer().min(1).allow(null),
  is_active: Joi.boolean(),
  is_public: Joi.boolean(),
  is_highlighted: Joi.boolean(),
  sort_order: Joi.number().integer().min(0),
  metadata: Joi.object(),
}).min(1);

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const activateSubscriptionSchema = Joi.object({
  planId: Joi.string().uuid().required(),
  billingCycle: Joi.string().valid(...Object.values(BILLING_CYCLE)).required(),
  paymentMethod: Joi.string().valid(...Object.values(PAYMENT_METHOD_TYPE)).required(),
  paymentData: Joi.object({
    paymentMethodId: Joi.string().when('...paymentMethod', {
      is: PAYMENT_METHOD_TYPE.CARD,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    cardToken: Joi.string(),
  }).default({}),
});

const createPixPaymentSchema = Joi.object({
  planId: Joi.string().uuid(),
  billingCycle: Joi.string().valid(...Object.values(BILLING_CYCLE)).required(),
});

const changePlanSchema = Joi.object({
  planId: Joi.string().uuid().required(),
});

const cancelSubscriptionSchema = Joi.object({
  immediately: Joi.boolean().default(false),
  reason: Joi.string().max(500).allow('', null),
});

const suspendSubscriptionSchema = Joi.object({
  reason: Joi.string().max(500).allow('', null),
});

// ═══════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const listSubscriptionsQuerySchema = Joi.object({
  status: Joi.string().valid('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired'),
  planId: Joi.string().uuid(),
  billingCycle: Joi.string().valid(...Object.values(BILLING_CYCLE)),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const listInvoicesQuerySchema = Joi.object({
  status: Joi.string().valid('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded'),
  tenantId: Joi.string().uuid(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const revenueSummaryQuerySchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
});

const auditLogsQuerySchema = Joi.object({
  action: Joi.string(),
  tenantId: Joi.string().uuid(),
  entityType: Joi.string().valid('subscription_plan', 'subscription', 'invoice', 'payment'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

// ═══════════════════════════════════════════════════════════════════════════
// PARAM SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const slugParamSchema = Joi.object({
  slug: Joi.string().min(2).max(50).required(),
});

const providerParamSchema = Joi.object({
  provider: Joi.string().valid('stripe', 'mercadopago', 'mock').required(),
});

module.exports = {
  // Plan
  createPlanSchema,
  updatePlanSchema,
  
  // Subscription
  activateSubscriptionSchema,
  createPixPaymentSchema,
  changePlanSchema,
  cancelSubscriptionSchema,
  suspendSubscriptionSchema,
  
  // Query
  listSubscriptionsQuerySchema,
  listInvoicesQuerySchema,
  revenueSummaryQuerySchema,
  auditLogsQuerySchema,
  
  // Params
  uuidParamSchema,
  slugParamSchema,
  providerParamSchema,
};
