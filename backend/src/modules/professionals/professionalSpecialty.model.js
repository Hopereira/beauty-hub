/**
 * Professional Specialty Model
 * Links professionals to their service specialties
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProfessionalSpecialty = sequelize.define('ProfessionalSpecialty', {
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
  }, {
    tableName: 'professional_specialties',
    underscored: true,
    timestamps: true,
  });

  ProfessionalSpecialty.associate = (models) => {
    ProfessionalSpecialty.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    ProfessionalSpecialty.belongsTo(models.ProfessionalDetail, {
      foreignKey: 'professional_id',
      as: 'professional',
    });

    ProfessionalSpecialty.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service',
    });
  };

  return ProfessionalSpecialty;
};
