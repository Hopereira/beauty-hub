/**
 * Tenants Module
 * Exports all tenant-related components
 */

const TenantModel = require('./tenant.model');
const TenantRepository = require('./tenant.repository');
const TenantService = require('./tenant.service');
const TenantController = require('./tenant.controller');
const createTenantRoutes = require('./tenant.routes');
const tenantValidation = require('./tenant.validation');
const OnboardingService = require('./onboarding.service');
const LGPDService = require('./lgpd.service');
const { createOnboardingRoutes } = require('./onboarding.routes');

/**
 * Initialize tenants module
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {object} Module components
 */
function initTenantsModule(sequelize, options = {}) {
  // Initialize model
  const Tenant = TenantModel(sequelize);
  
  // Initialize repository
  const tenantRepository = new TenantRepository(Tenant);
  
  // Initialize service
  const tenantService = new TenantService(tenantRepository);
  
  // Initialize controller
  const tenantController = new TenantController(tenantService);
  
  // Create routes
  const { masterRouter, tenantRouter } = createTenantRoutes(tenantController);

  // Initialize LGPD service
  const lgpdService = new LGPDService(sequelize);

  // Initialize onboarding service (requires billing services)
  let onboardingService = null;
  let onboardingRouter = null;
  
  if (options.subscriptionService && options.planService) {
    onboardingService = new OnboardingService({
      sequelize,
      tenantService,
      userService: options.userService,
      subscriptionService: options.subscriptionService,
      planService: options.planService,
    });
    onboardingRouter = createOnboardingRoutes(onboardingService);
  }

  return {
    model: Tenant,
    repository: tenantRepository,
    service: tenantService,
    controller: tenantController,
    lgpdService,
    onboardingService,
    routes: {
      master: masterRouter,
      tenant: tenantRouter,
      onboarding: onboardingRouter,
    },
    // Export for tenant resolver middleware
    getTenantBySlug: (slug) => tenantRepository.findBySlug(slug),
  };
}

module.exports = {
  initTenantsModule,
  TenantModel,
  TenantRepository,
  TenantService,
  TenantController,
  createTenantRoutes,
  tenantValidation,
  OnboardingService,
  LGPDService,
  createOnboardingRoutes,
};
