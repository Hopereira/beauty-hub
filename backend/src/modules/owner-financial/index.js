/**
 * Owner Financial Module
 */

const OwnerFinancialService = require('./financial.service');
const OwnerFinancialController = require('./financial.controller');
const createFinancialRoutes = require('./financial.routes');

function initOwnerFinancialModule(sequelize, models) {
  const service = new OwnerFinancialService(models, sequelize);
  const controller = new OwnerFinancialController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createFinancialRoutes(controller, middleware),
  };
}

module.exports = { initOwnerFinancialModule };
