/**
 * Purchase Item Model
 * Individual items in a purchase order
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PurchaseItem = sequelize.define('PurchaseItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    purchase_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unit_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  }, {
    tableName: 'purchase_items',
    underscored: true,
    timestamps: true,
  });

  PurchaseItem.associate = (models) => {
    PurchaseItem.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    PurchaseItem.belongsTo(models.Purchase, {
      foreignKey: 'purchase_id',
      as: 'purchase',
    });

    PurchaseItem.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product',
    });
  };

  return PurchaseItem;
};
