/**
 * Owner Clients Routes Wrapper
 */

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initOwnerClientsModule } = require('../../modules/owner-clients');

const models = sequelize.models;
const ownerClientsModule = initOwnerClientsModule(sequelize, models);

const middleware = { 
  tenantResolver: tenantFromJWT,
  authenticate, 
  authorize: (roles) => authorize(...roles) 
};
const routes = ownerClientsModule.createRoutes(middleware);

module.exports = routes;
