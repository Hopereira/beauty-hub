/**
 * Owner Clients Module
 */

const OwnerClientService = require('./client.service');
const OwnerClientController = require('./client.controller');
const createClientRoutes = require('./client.routes');

function initOwnerClientsModule(sequelize, models) {
  const service = new OwnerClientService(models);
  const controller = new OwnerClientController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createClientRoutes(controller, middleware),
  };
}

module.exports = { initOwnerClientsModule };
