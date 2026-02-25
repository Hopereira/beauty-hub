/**
 * Modules Index
 * Initializes and exports all application modules
 */

const { sequelize } = require('../shared/database');
const { initTenantsModule } = require('./tenants');
const { initBillingModule } = require('./billing');
const { initUsersModule } = require('./users');

let initialized = false;
let modules = {};

/**
 * Initialize all modules with proper dependency order
 * @returns {object} All initialized modules
 */
function initializeModules() {
  if (initialized) {
    return modules;
  }

  // 1. Tenants (no dependencies)
  const tenantsModule = initTenantsModule(sequelize);
  
  // 2. Billing (depends on Tenant)
  const billingModule = initBillingModule(sequelize, {
    Tenant: tenantsModule.model,
  });
  
  // 3. Users (depends on Tenant)
  const usersModule = initUsersModule(sequelize, {
    Tenant: tenantsModule.model,
  });

  modules = {
    tenants: tenantsModule,
    billing: billingModule,
    users: usersModule,
    sequelize, // Export sequelize for app.multitenant.js
    // Add other modules here as they are created
  };

  initialized = true;
  
  return modules;
}

/**
 * Get initialized modules
 */
function getModules() {
  if (!initialized) {
    throw new Error('Modules not initialized. Call initializeModules() first.');
  }
  return modules;
}

module.exports = {
  initializeModules,
  getModules,
};
