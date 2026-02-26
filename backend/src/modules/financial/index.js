/**
 * Financial Module
 * Manages payment transactions with automatic split calculation
 */

const PaymentTransactionModel = require('./paymentTransaction.model');
const PaymentTransactionRepository = require('./paymentTransaction.repository');
const PaymentTransactionService = require('./paymentTransaction.service');
const PaymentTransactionController = require('./paymentTransaction.controller');
const createPaymentTransactionRoutes = require('./paymentTransaction.routes');

function initFinancialModule(sequelize, models = {}) {
  const PaymentTransaction = PaymentTransactionModel(sequelize);

  const allModels = { ...models, PaymentTransaction };

  if (PaymentTransaction.associate) PaymentTransaction.associate(allModels);

  const repository = new PaymentTransactionRepository(allModels);
  const service = new PaymentTransactionService(repository, allModels);
  const controller = new PaymentTransactionController(service);

  return {
    models: { PaymentTransaction },
    repository,
    service,
    controller,
    createRoutes: (middleware) => createPaymentTransactionRoutes(controller, middleware),
  };
}

module.exports = { initFinancialModule, PaymentTransactionModel };
