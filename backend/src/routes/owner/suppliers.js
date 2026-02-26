/**
 * Suppliers Routes Wrapper
 */

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initSuppliersModule } = require('../../modules/suppliers');

// Get all models from sequelize
const models = sequelize.models;

// Initialize module with all models
const suppliersModule = initSuppliersModule(sequelize, models);

// Create routes with middleware (using tenantFromJWT to map JWT tenantId to req.tenant)
const middleware = { 
  tenantResolver: tenantFromJWT,
  authenticate, 
  authorize: (roles) => authorize(...roles) 
};
const routes = suppliersModule.createRoutes(middleware);

module.exports = routes;
