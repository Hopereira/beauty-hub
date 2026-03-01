/**
 * Owner Financial Routes Wrapper
 */

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initOwnerFinancialModule } = require('../../modules/owner-financial');

const models = sequelize.models;
const ownerFinancialModule = initOwnerFinancialModule(sequelize, models);

const middleware = { 
  tenantResolver: tenantFromJWT,
  authenticate, 
  authorize: (roles) => authorize(...roles) 
};
const routes = ownerFinancialModule.createRoutes(middleware);

module.exports = routes;
