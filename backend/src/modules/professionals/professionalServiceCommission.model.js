/**
 * Professional Service Commission Model
 * Custom commission percentage per professional per service
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProfessionalServiceCommission = sequelize.define('ProfessionalServiceCommission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    professional_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
  }, {
    tableName: 'professional_service_commissions',
    underscored: true,
    timestamps: true,
  });

  ProfessionalServiceCommission.associate = (models) => {
    ProfessionalServiceCommission.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    ProfessionalServiceCommission.belongsTo(models.ProfessionalDetail, {
      foreignKey: 'professional_id',
      as: 'professional',
    });

    ProfessionalServiceCommission.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service',
    });
  };

  return ProfessionalServiceCommission;
};
