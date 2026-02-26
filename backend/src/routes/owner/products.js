/**
 * Products Routes Wrapper
 */

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initInventoryModule } = require('../../modules/inventory');

// Get all models from sequelize
const models = sequelize.models;

// Initialize module with all models
const inventoryModule = initInventoryModule(sequelize, models);

// Create routes with middleware (using tenantFromJWT to map JWT tenantId to req.tenant)
const middleware = { 
  tenantResolver: tenantFromJWT,
  authenticate, 
  authorize: (roles) => authorize(...roles) 
};
const routes = inventoryModule.createRoutes(middleware);

module.exports = routes;
