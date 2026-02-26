/**
 * Supplier Model
 * Manages product suppliers
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Supplier = sequelize.define('Supplier', {
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
    document: {
      type: DataTypes.STRING(18),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'suppliers',
    underscored: true,
    paranoid: true,
    timestamps: true,
  });

  Supplier.associate = (models) => {
    Supplier.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    Supplier.hasMany(models.Product, {
      foreignKey: 'supplier_id',
      as: 'products',
    });

    Supplier.hasMany(models.Purchase, {
      foreignKey: 'supplier_id',
      as: 'purchases',
    });
  };

  return Supplier;
};
