/**
 * Public Module
 * Handles public endpoints (no authentication)
 */

const RegistrationService = require('./services/registration.service');
const RegistrationController = require('./controllers/registration.controller');
const createRegistrationRoutes = require('./routes/registration.routes');

function initPublicModule(sequelize, modules) {
  // Get models from other modules
  const models = {
    Tenant: modules.tenants.model,
    User: modules.users.model,
    Subscription: modules.billing.models.Subscription,
    SubscriptionPlan: modules.billing.models.SubscriptionPlan,
  };

  // Initialize service
  const registrationService = new RegistrationService(sequelize, models);

  // Initialize controller
  const registrationController = new RegistrationController(registrationService);

  // Create routes
  const routes = createRegistrationRoutes(registrationController);

  return {
    services: { registrationService },
    controllers: { registrationController },
    routes,
  };
}

module.exports = { initPublicModule };
