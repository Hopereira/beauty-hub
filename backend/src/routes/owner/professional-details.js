/**
 * Professional Details Routes Wrapper
 */

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initProfessionalsModule } = require('../../modules/professionals');

// Get all models from sequelize
const models = sequelize.models;

// Initialize module with all models
const professionalsModule = initProfessionalsModule(sequelize, models);

// Create routes with middleware (using tenantFromJWT to map JWT tenantId to req.tenant)
const middleware = { 
  tenantResolver: tenantFromJWT,
  authenticate, 
  authorize: (roles) => authorize(...roles) 
};
const routes = professionalsModule.createRoutes(middleware);

module.exports = routes;
