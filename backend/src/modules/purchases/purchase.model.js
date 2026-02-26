/**
 * Purchase Model
 * Records purchases from suppliers
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Purchase = sequelize.define('Purchase', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    supplier_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    purchase_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    payment_method: {
      type: DataTypes.ENUM('DINHEIRO', 'DEBITO', 'CREDITO', 'PIX', 'TRANSFERENCIA', 'BOLETO', 'A_PRAZO'),
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'PARTIAL', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'purchases',
    underscored: true,
    paranoid: true,
    timestamps: true,
  });

  Purchase.associate = (models) => {
    Purchase.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    Purchase.belongsTo(models.Supplier, {
      foreignKey: 'supplier_id',
      as: 'supplier',
    });

    Purchase.hasMany(models.PurchaseItem, {
      foreignKey: 'purchase_id',
      as: 'items',
    });
  };

  return Purchase;
};
