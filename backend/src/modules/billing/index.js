/**
 * Billing Module
 * Complete billing system with payment providers, services, and controllers
 */

// Models
const SubscriptionPlanModel = require('./subscriptionPlan.model');
const SubscriptionModel = require('./subscription.model');
const InvoiceModel = require('./invoice.model');
const UsageLogModel = require('./usageLog.model');

// Providers
const {
  PaymentProviderInterface,
  MockPaymentProvider,
  StripePaymentProvider,
  getPaymentProvider,
  resetProvider,
} = require('./providers');

// Services
const {
  PlanService,
  SubscriptionService,
  InvoiceService,
  BillingAuditService,
} = require('./services');

// Controllers
const {
  BillingController,
  MasterBillingController,
  WebhookController,
} = require('./controllers');

// Routes
const {
  createBillingRoutes,
  createMasterBillingRoutes,
  createWebhookRoutes,
} = require('./routes');

// Middleware
const {
  requireActiveSubscription,
  loadSubscription,
  requireFeature,
  checkUsageLimit,
  SubscriptionInactiveError,
} = require('./middleware/requireActiveSubscription');

// Jobs
const {
  JOB_DEFINITIONS,
  BillingJobProcessors,
  createJobRunner,
  BULLMQ_CONFIG,
} = require('./jobs');

/**
 * Initialize billing module
 * @param {Sequelize} sequelize - Sequelize instance
 * @param {object} models - Other models for associations
 * @param {object} options - Additional options
 * @returns {object} Module components
 */
function initBillingModule(sequelize, models = {}, options = {}) {
  // Initialize models
  const SubscriptionPlan = SubscriptionPlanModel(sequelize);
  const Subscription = SubscriptionModel(sequelize);
  const Invoice = InvoiceModel(sequelize);
  const UsageLog = UsageLogModel(sequelize);

  // ─────────────────────────────────────────────────────────────────────────────
  // Associations
  // ─────────────────────────────────────────────────────────────────────────────

  // Tenant <-> Subscription
  if (models.Tenant) {
    models.Tenant.hasMany(Subscription, { foreignKey: 'tenant_id', as: 'subscriptions' });
    Subscription.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

    models.Tenant.hasMany(Invoice, { foreignKey: 'tenant_id', as: 'invoices' });
    Invoice.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

    models.Tenant.hasMany(UsageLog, { foreignKey: 'tenant_id', as: 'usageLogs' });
    UsageLog.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
  }

  // SubscriptionPlan <-> Subscription
  SubscriptionPlan.hasMany(Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });
  Subscription.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });

  // Subscription <-> Invoice
  Subscription.hasMany(Invoice, { foreignKey: 'subscription_id', as: 'invoices' });
  Invoice.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

  // Subscription <-> UsageLog
  Subscription.hasMany(UsageLog, { foreignKey: 'subscription_id', as: 'usageLogs' });
  UsageLog.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

  // ─────────────────────────────────────────────────────────────────────────────
  // Services
  // ─────────────────────────────────────────────────────────────────────────────

  const billingModels = {
    SubscriptionPlan,
    Subscription,
    Invoice,
    UsageLog,
    Tenant: models.Tenant,
  };

  const auditService = new BillingAuditService(sequelize);
  const paymentProvider = getPaymentProvider(options.paymentProvider);

  const planService = new PlanService(billingModels, auditService);
  const subscriptionService = new SubscriptionService(billingModels, paymentProvider, auditService);
  const invoiceService = new InvoiceService(billingModels, auditService);

  const services = {
    planService,
    subscriptionService,
    invoiceService,
    auditService,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Controllers
  // ─────────────────────────────────────────────────────────────────────────────

  const billingController = new BillingController(services);
  const masterBillingController = new MasterBillingController(services);
  const webhookController = new WebhookController(services, paymentProvider);

  const controllers = {
    billingController,
    masterBillingController,
    webhookController,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Routes Factory
  // ─────────────────────────────────────────────────────────────────────────────

  const createRoutes = (middleware = {}) => ({
    billing: createBillingRoutes(billingController, middleware),
    master: createMasterBillingRoutes(masterBillingController, middleware),
    webhooks: createWebhookRoutes(webhookController),
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Jobs
  // ─────────────────────────────────────────────────────────────────────────────

  const jobRunner = createJobRunner(billingModels, services, options.notificationService);

  return {
    // Models
    models: billingModels,

    // Services
    services,

    // Controllers
    controllers,

    // Routes factory
    createRoutes,

    // Middleware
    middleware: {
      requireActiveSubscription: requireActiveSubscription(),
      loadSubscription: loadSubscription(Subscription, SubscriptionPlan),
      requireFeature,
      checkUsageLimit,
    },

    // Jobs
    jobs: {
      definitions: JOB_DEFINITIONS,
      runner: jobRunner,
      config: BULLMQ_CONFIG,
    },

    // Payment provider
    paymentProvider,

    // Helper functions
    recordUsage: (tenantId, metric, quantity, metadata) =>
      UsageLog.recordUsage(tenantId, metric, quantity, metadata),
    getUsageSummary: (tenantId, metric, start, end) =>
      UsageLog.getUsageSummary(tenantId, metric, start, end),
  };
}

module.exports = {
  // Main initializer
  initBillingModule,

  // Models
  SubscriptionPlanModel,
  SubscriptionModel,
  InvoiceModel,
  UsageLogModel,

  // Providers
  PaymentProviderInterface,
  MockPaymentProvider,
  StripePaymentProvider,
  getPaymentProvider,
  resetProvider,

  // Services
  PlanService,
  SubscriptionService,
  InvoiceService,
  BillingAuditService,

  // Controllers
  BillingController,
  MasterBillingController,
  WebhookController,

  // Routes
  createBillingRoutes,
  createMasterBillingRoutes,
  createWebhookRoutes,

  // Middleware
  requireActiveSubscription,
  loadSubscription,
  requireFeature,
  checkUsageLimit,
  SubscriptionInactiveError,

  // Jobs
  JOB_DEFINITIONS,
  BillingJobProcessors,
  createJobRunner,
  BULLMQ_CONFIG,
};
