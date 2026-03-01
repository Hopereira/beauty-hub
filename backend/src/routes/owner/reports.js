/**
 * Owner Reports Routes Wrapper
 */

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initOwnerReportsModule } = require('../../modules/owner-reports');

const ownerReportsModule = initOwnerReportsModule(sequelize);

const middleware = { 
  tenantResolver: tenantFromJWT,
  authenticate, 
  authorize: (roles) => authorize(...roles) 
};
const routes = ownerReportsModule.createRoutes(middleware);

module.exports = routes;
