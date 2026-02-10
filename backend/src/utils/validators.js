const Joi = require('joi');

// ── Auth ──
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  role: Joi.string().valid('ADMIN', 'PROFESSIONAL', 'CLIENT').default('CLIENT'),
  // Admin-specific
  salon_name: Joi.string().max(255).allow('', null),
  cnpj: Joi.string().max(18).allow('', null),
  // Professional-specific
  specialty: Joi.string().max(255).allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// ── Profile ──
const updateProfileSchema = Joi.object({
  first_name: Joi.string().max(100),
  last_name: Joi.string().max(100).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  email: Joi.string().email(),
}).min(1);

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required(),
});

// ── Establishments ──
const establishmentSchema = Joi.object({
  name: Joi.string().max(255).required(),
  address: Joi.string().max(255).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  email: Joi.string().email().allow('', null),
  cnpj: Joi.string().max(18).allow('', null),
  opening_hours: Joi.object().allow(null),
});

// ── Professionals ──
const professionalSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  establishment_id: Joi.string().uuid().required(),
  specialty: Joi.string().max(255).allow('', null),
  commission_rate: Joi.number().min(0).max(100).default(0),
});

// ── Services ──
const serviceSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().allow('', null),
  price: Joi.number().positive().required(),
  duration_minutes: Joi.number().integer().positive().required(),
  is_active: Joi.boolean().default(true),
});

// ── Clients ──
const clientSchema = Joi.object({
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).allow('', null),
  email: Joi.string().email().allow('', null),
  phone: Joi.string().max(20).required(),
  birth_date: Joi.date().iso().allow(null),
  notes: Joi.string().allow('', null),
});

// ── Appointments ──
const appointmentSchema = Joi.object({
  client_id: Joi.string().uuid().required(),
  professional_id: Joi.string().uuid().required(),
  service_id: Joi.string().uuid().required(),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().required(),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW').default('PENDING'),
  notes: Joi.string().allow('', null),
  price_charged: Joi.number().min(0).allow(null),
});

// ── Financial Entries ──
const financialEntrySchema = Joi.object({
  appointment_id: Joi.string().uuid().allow(null),
  client_id: Joi.string().uuid().allow(null),
  amount: Joi.number().positive().required(),
  description: Joi.string().allow('', null),
  entry_date: Joi.date().iso().required(),
  payment_method_id: Joi.string().uuid().required(),
  status: Joi.string().valid('PENDING', 'PAID', 'CANCELLED').default('PAID'),
});

// ── Financial Exits ──
const financialExitSchema = Joi.object({
  amount: Joi.number().positive().required(),
  description: Joi.string().required(),
  exit_date: Joi.date().iso().required(),
  category: Joi.string().max(100).allow('', null),
  status: Joi.string().valid('PENDING', 'PAID', 'CANCELLED').default('PAID'),
});

// ── Payment Methods ──
const paymentMethodSchema = Joi.object({
  name: Joi.string().max(100).required(),
  is_active: Joi.boolean().default(true),
});

// ── Pagination / Query ──
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().allow('', null),
  order: Joi.string().valid('ASC', 'DESC').default('DESC'),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
  establishmentSchema,
  professionalSchema,
  serviceSchema,
  clientSchema,
  appointmentSchema,
  financialEntrySchema,
  financialExitSchema,
  paymentMethodSchema,
  paginationSchema,
};
