/**
 * Suppliers Module
 */

const SupplierModel = require('./supplier.model');
const SupplierRepository = require('./supplier.repository');
const SupplierService = require('./supplier.service');
const SupplierController = require('./supplier.controller');
const createSupplierRoutes = require('./supplier.routes');

function initSuppliersModule(sequelize, models = {}) {
  const Supplier = SupplierModel(sequelize);

  const allModels = { ...models, Supplier };

  if (Supplier.associate) Supplier.associate(allModels);

  const repository = new SupplierRepository(allModels);
  const service = new SupplierService(repository);
  const controller = new SupplierController(service);

  return {
    models: { Supplier },
    repository,
    service,
    controller,
    createRoutes: (middleware) => createSupplierRoutes(controller, middleware),
  };
}

module.exports = { initSuppliersModule, SupplierModel };
