/**
 * Inventory Module
 * Manages products and inventory movements
 */

const ProductModel = require('./product.model');
const InventoryMovementModel = require('./inventoryMovement.model');
const ProductRepository = require('./product.repository');
const ProductService = require('./product.service');
const ProductController = require('./product.controller');
const createProductRoutes = require('./product.routes');

function initInventoryModule(sequelize, models = {}) {
  const Product = ProductModel(sequelize);
  const InventoryMovement = InventoryMovementModel(sequelize);

  const allModels = {
    ...models,
    Product,
    InventoryMovement,
  };

  if (Product.associate) Product.associate(allModels);
  if (InventoryMovement.associate) InventoryMovement.associate(allModels);

  const productRepository = new ProductRepository(allModels);
  const productService = new ProductService(productRepository, null, allModels);
  const productController = new ProductController(productService);

  return {
    models: { Product, InventoryMovement },
    productRepository,
    productService,
    productController,
    createRoutes: (middleware) => createProductRoutes(productController, middleware),
  };
}

module.exports = { initInventoryModule, ProductModel, InventoryMovementModel };
