/**
 * Shared Constants
 * Centralized enums and configuration values
 */

// ─────────────────────────────────────────────────────────────────────────────
// ROLES - RBAC hierarchy (higher index = more privileges)
// ─────────────────────────────────────────────────────────────────────────────
const ROLES = {
  CLIENT: 'client',
  PROFESSIONAL: 'professional',
  ADMIN: 'admin',
  OWNER: 'owner',
  MASTER: 'master',
};

const ROLE_HIERARCHY = [
  ROLES.CLIENT,
  ROLES.PROFESSIONAL,
  ROLES.ADMIN,
  ROLES.OWNER,
  ROLES.MASTER,
];

// ─────────────────────────────────────────────────────────────────────────────
// TENANT STATUS
// ─────────────────────────────────────────────────────────────────────────────
const TENANT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION STATUS
// ─────────────────────────────────────────────────────────────────────────────
const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// ─────────────────────────────────────────────────────────────────────────────
// BILLING CYCLE
// ─────────────────────────────────────────────────────────────────────────────
const BILLING_CYCLE = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT METHOD TYPE (for subscriptions)
// ─────────────────────────────────────────────────────────────────────────────
const PAYMENT_METHOD_TYPE = {
  CARD: 'card',
  PIX: 'pix',
  BOLETO: 'boleto',
};

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION STATUS
// ─────────────────────────────────────────────────────────────────────────────
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE STATUS
// ─────────────────────────────────────────────────────────────────────────────
const INVOICE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT STATUS
// ─────────────────────────────────────────────────────────────────────────────
const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT STATUS
// ─────────────────────────────────────────────────────────────────────────────
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  REFUNDED: 'refunded',
};

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION TYPES
// ─────────────────────────────────────────────────────────────────────────────
const TRANSACTION_TYPE = {
  INCOME: 'income',
  EXPENSE: 'expense',
  REFUND: 'refund',
  COMMISSION: 'commission',
  SPLIT: 'split',
};

// ─────────────────────────────────────────────────────────────────────────────
// BILLING INTERVALS
// ─────────────────────────────────────────────────────────────────────────────
const BILLING_INTERVAL = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAN FEATURES (feature flags)
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_FEATURES = {
  APPOINTMENTS: 'appointments',
  FINANCIAL: 'financial',
  CLIENTS: 'clients',
  PROFESSIONALS: 'professionals',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
  API_ACCESS: 'api_access',
  CUSTOM_BRANDING: 'custom_branding',
  MULTI_LOCATION: 'multi_location',
  ADVANCED_ANALYTICS: 'advanced_analytics',
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION TYPES
// ─────────────────────────────────────────────────────────────────────────────
const NOTIFICATION_TYPE = {
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_DUE: 'payment_due',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  SYSTEM: 'system',
};

// ─────────────────────────────────────────────────────────────────────────────
// HTTP STATUS CODES
// ─────────────────────────────────────────────────────────────────────────────
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CODES
// ─────────────────────────────────────────────────────────────────────────────
const ERROR_CODES = {
  // Auth
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  
  // Tenant
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  TENANT_REQUIRED: 'TENANT_REQUIRED',
  
  // Subscription
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_LIMIT_REACHED: 'SUBSCRIPTION_LIMIT_REACHED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Generic
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// ─────────────────────────────────────────────────────────────────────────────
// BILLING AUDIT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────
const BILLING_AUDIT_ACTIONS = {
  PLAN_CREATED: 'plan.created',
  PLAN_UPDATED: 'plan.updated',
  PLAN_DEACTIVATED: 'plan.deactivated',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
  SUBSCRIPTION_SUSPENDED: 'subscription.suspended',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',
};

// ─────────────────────────────────────────────────────────────────────────────
// GRACE PERIOD DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
const BILLING_DEFAULTS = {
  GRACE_PERIOD_DAYS: 7,
  SUSPENSION_DAYS: 30,
  DEFAULT_TRIAL_DAYS: 30,
  DEFAULT_ANNUAL_DISCOUNT: 15,
  PIX_EXPIRATION_HOURS: 24,
  REMINDER_DAYS_BEFORE: 3,
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  TENANT_STATUS,
  SUBSCRIPTION_STATUS,
  BILLING_CYCLE,
  PAYMENT_METHOD_TYPE,
  TRANSACTION_STATUS,
  INVOICE_STATUS,
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_TYPE,
  BILLING_INTERVAL,
  PLAN_FEATURES,
  NOTIFICATION_TYPE,
  HTTP_STATUS,
  ERROR_CODES,
  PAGINATION,
  BILLING_AUDIT_ACTIONS,
  BILLING_DEFAULTS,
};
