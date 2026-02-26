/**
 * Inventory Movement Model
 * Tracks all stock movements (entries, exits, adjustments)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryMovement = sequelize.define('InventoryMovement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('ENTRY', 'EXIT', 'ADJUSTMENT'),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    previous_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    new_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    professional_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    client_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reference_type: {
      type: DataTypes.ENUM('APPOINTMENT', 'PURCHASE', 'MANUAL', 'ADJUSTMENT'),
      allowNull: false,
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    movement_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'inventory_movements',
    underscored: true,
    timestamps: true,
  });

  InventoryMovement.associate = (models) => {
    InventoryMovement.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    InventoryMovement.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product',
    });

    InventoryMovement.belongsTo(models.ProfessionalDetail, {
      foreignKey: 'professional_id',
      as: 'professional',
    });

    InventoryMovement.belongsTo(models.Client, {
      foreignKey: 'client_id',
      as: 'client',
    });

    InventoryMovement.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service',
    });
  };

  return InventoryMovement;
};
