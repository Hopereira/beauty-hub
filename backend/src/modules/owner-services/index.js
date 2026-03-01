/**
 * Owner Services Module
 * Exports service, controller, and routes factory
 */

const OwnerServiceService = require('./service.service');
const OwnerServiceController = require('./service.controller');
const createServiceRoutes = require('./service.routes');

function initOwnerServicesModule(sequelize, models) {
  const service = new OwnerServiceService(models);
  const controller = new OwnerServiceController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createServiceRoutes(controller, middleware),
  };
}

module.exports = { initOwnerServicesModule };
