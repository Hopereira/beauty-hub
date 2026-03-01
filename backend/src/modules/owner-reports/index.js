/**
 * Owner Reports Module
 */

const OwnerReportsService = require('./reports.service');
const OwnerReportsController = require('./reports.controller');
const createReportsRoutes = require('./reports.routes');

function initOwnerReportsModule(sequelize) {
  const service = new OwnerReportsService(sequelize);
  const controller = new OwnerReportsController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createReportsRoutes(controller, middleware),
  };
}

module.exports = { initOwnerReportsModule };
