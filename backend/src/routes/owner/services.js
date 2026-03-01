/**
 * Owner Services Routes Wrapper
 */

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initOwnerServicesModule } = require('../../modules/owner-services');

// Get all models from sequelize
const models = sequelize.models;

// Initialize module with all models
const ownerServicesModule = initOwnerServicesModule(sequelize, models);

// Create routes with middleware
const middleware = { 
  tenantResolver: tenantFromJWT,
  authenticate, 
  authorize: (roles) => authorize(...roles) 
};
const routes = ownerServicesModule.createRoutes(middleware);

module.exports = routes;
