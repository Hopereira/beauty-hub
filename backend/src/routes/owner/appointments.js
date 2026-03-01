/**
 * Owner Appointments Routes Wrapper
 */

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initOwnerAppointmentsModule } = require('../../modules/owner-appointments');

const models = sequelize.models;
const ownerAppointmentsModule = initOwnerAppointmentsModule(sequelize, models);

const middleware = { 
  tenantResolver: tenantFromJWT,
  authenticate, 
  authorize: (roles) => authorize(...roles) 
};
const routes = ownerAppointmentsModule.createRoutes(middleware);

module.exports = routes;
