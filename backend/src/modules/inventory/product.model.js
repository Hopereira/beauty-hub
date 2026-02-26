/**
 * Product Model
 * Inventory products with stock control
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    internal_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    barcode: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    supplier_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    sale_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    minimum_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    expiration_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    batch_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'products',
    underscored: true,
    paranoid: true,
    timestamps: true,
  });

  Product.associate = (models) => {
    Product.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    Product.belongsTo(models.Supplier, {
      foreignKey: 'supplier_id',
      as: 'supplier',
    });

    Product.hasMany(models.InventoryMovement, {
      foreignKey: 'product_id',
      as: 'movements',
    });

    Product.hasMany(models.PurchaseItem, {
      foreignKey: 'product_id',
      as: 'purchaseItems',
    });
  };

  return Product;
};
