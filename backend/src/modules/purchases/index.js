/**
 * Purchases Module
 */

const PurchaseModel = require('./purchase.model');
const PurchaseItemModel = require('./purchaseItem.model');
const PurchaseRepository = require('./purchase.repository');
const PurchaseService = require('./purchase.service');
const PurchaseController = require('./purchase.controller');
const createPurchaseRoutes = require('./purchase.routes');

function initPurchasesModule(sequelize, models = {}) {
  const Purchase = PurchaseModel(sequelize);
  const PurchaseItem = PurchaseItemModel(sequelize);

  const allModels = { ...models, Purchase, PurchaseItem };

  if (Purchase.associate) Purchase.associate(allModels);
  if (PurchaseItem.associate) PurchaseItem.associate(allModels);

  const repository = new PurchaseRepository(allModels);
  const service = new PurchaseService(repository, allModels);
  const controller = new PurchaseController(service);

  return {
    models: { Purchase, PurchaseItem },
    repository,
    service,
    controller,
    createRoutes: (middleware) => createPurchaseRoutes(controller, middleware),
  };
}

module.exports = { initPurchasesModule, PurchaseModel, PurchaseItemModel };
