/**
 * Multi-Tenant Express Application
 * SaaS-ready Beauty Hub API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { initializeModules } = require('./modules');
const { errorHandler, notFoundHandler } = require('./shared/middleware');
const { createTenantResolver, validateTenantConsistency } = require('./shared/middleware');
const { createBruteForceProtection } = require('./shared/middleware');
const logger = require('./shared/utils/logger');
const OnboardingService = require('./modules/tenants/onboarding.service');
const { createOnboardingRoutes } = require('./modules/tenants/onboarding.routes');

// Legacy routes (until fully migrated to modules)
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const serviceRoutes = require('./routes/services');
const professionalRoutes = require('./routes/professionals');
const appointmentRoutes = require('./routes/appointments');
const financialRoutes = require('./routes/financial');
const notificationRoutes = require('./routes/notifications');

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Modules
// ─────────────────────────────────────────────────────────────────────────────
const modules = initializeModules();

// ─────────────────────────────────────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Adjust for SPA
}));

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost in development
    if (env.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    // Allow configured origins
    const allowedOrigins = env.cors.origin.split(',').map(o => o.trim());
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Allow subdomains (for multi-tenant)
    const isSubdomain = allowedOrigins.some(allowed => {
      const pattern = allowed.replace('*.', '.*\\.');
      return new RegExp(`^${pattern}$`).test(origin);
    });
    
    if (isSubdomain) {
      return callback(null, true);
    }
    
    callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
}));

// ─────────────────────────────────────────────────────────────────────────────
// Body Parsing
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.path === '/api/health',
}));

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by tenant + IP for better isolation
    const tenantKey = req.headers['x-tenant-slug'] || 'global';
    return `${tenantKey}:${req.ip}`;
  },
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
    error: { code: 'RATE_LIMIT_EXCEEDED', details: null },
  },
});
app.use('/api/', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    error: { code: 'AUTH_RATE_LIMIT', details: null },
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Beauty Hub Multi-Tenant API is running.',
    data: {
      version: '2.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Resolver (for tenant-scoped routes)
// ─────────────────────────────────────────────────────────────────────────────
const tenantResolver = createTenantResolver(modules.tenants.getTenantBySlug);

// ─────────────────────────────────────────────────────────────────────────────
// Brute Force Protection
// ─────────────────────────────────────────────────────────────────────────────
const { sequelize } = modules;
const bruteForceProtection = createBruteForceProtection(sequelize);

// ─────────────────────────────────────────────────────────────────────────────
// Public Routes (no tenant required)
// ─────────────────────────────────────────────────────────────────────────────

// Public subscription plans
app.get('/api/plans', async (req, res) => {
  const { SubscriptionPlan } = modules.billing.models;
  const plans = await SubscriptionPlan.findAll({
    where: { is_active: true, is_public: true },
    order: [['sort_order', 'ASC']],
  });
  res.json({
    success: true,
    data: plans.map(p => p.toPublicJSON ? p.toPublicJSON() : p.toJSON()),
  });
});

// Auth routes (public - no tenant required for login/register)
app.use('/api/auth', authRoutes);

// Onboarding / Self-Signup routes (public)
const onboardingService = new OnboardingService({
  sequelize,
  tenantService: modules.tenants.service,
  userService: modules.users.service,
  subscriptionService: modules.billing.services.subscriptionService,
  planService: modules.billing.services.planService,
});
const onboardingRoutes = createOnboardingRoutes(onboardingService);
app.use('/api', onboardingRoutes);

// Billing public routes (plans listing)
app.get('/api/billing/plans', async (req, res) => {
  const { SubscriptionPlan } = modules.billing.models;
  const plans = await SubscriptionPlan.findAll({
    where: { is_active: true, is_public: true },
    order: [['sort_order', 'ASC']],
  });
  res.json({
    success: true,
    data: plans,
  });
});

app.get('/api/billing/plans/:slug', async (req, res) => {
  const { SubscriptionPlan } = modules.billing.models;
  const plan = await SubscriptionPlan.findOne({
    where: { slug: req.params.slug, is_active: true },
  });
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found' });
  }
  res.json({ success: true, data: plan });
});

// ─────────────────────────────────────────────────────────────────────────────
// Master Routes (SaaS Admin - no tenant scope)
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/master/tenants', modules.tenants.routes.master);

// Master Billing routes (plans, subscriptions, invoices, MRR)
const masterBillingRoutes = modules.billing.createRoutes({
  authenticate: modules.users.middleware.authenticate,
  authorize: modules.users.middleware.authorize,
}).master;
app.use('/api/master/billing', masterBillingRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Tenant-Scoped Routes
// ─────────────────────────────────────────────────────────────────────────────

// Apply tenant resolver to all tenant-scoped routes
app.use('/api', tenantResolver);
app.use('/api', validateTenantConsistency);

// Current tenant info
app.use('/api/tenant', modules.tenants.routes.tenant);

// Users
app.use('/api/users', modules.users.routes.users);

// Profile
app.use('/api/profile', modules.users.routes.profile);

// Legacy routes (tenant-scoped)
app.use('/api/clients', clientRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/notifications', notificationRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/*', notFoundHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
