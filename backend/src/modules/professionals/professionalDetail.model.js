/**
 * Professional Details Model
 * Extended information for professionals (commission, contract type, etc)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProfessionalDetail = sequelize.define('ProfessionalDetail', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    cpf: {
      type: DataTypes.STRING(14),
      allowNull: true,
    },
    hire_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    contract_type: {
      type: DataTypes.ENUM('CLT', 'AUTONOMO', 'PARCEIRO'),
      allowNull: false,
      defaultValue: 'AUTONOMO',
    },
    base_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'professional_details',
    underscored: true,
    paranoid: true,
    timestamps: true,
  });

  ProfessionalDetail.associate = (models) => {
    ProfessionalDetail.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    ProfessionalDetail.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    ProfessionalDetail.hasMany(models.ProfessionalSpecialty, {
      foreignKey: 'professional_id',
      as: 'specialties',
    });

    ProfessionalDetail.hasMany(models.ProfessionalServiceCommission, {
      foreignKey: 'professional_id',
      as: 'commissions',
    });

    ProfessionalDetail.hasMany(models.PaymentTransaction, {
      foreignKey: 'professional_id',
      as: 'transactions',
    });

    ProfessionalDetail.hasMany(models.InventoryMovement, {
      foreignKey: 'professional_id',
      as: 'inventoryMovements',
    });
  };

  return ProfessionalDetail;
};
