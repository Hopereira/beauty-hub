/**
 * Payment Transaction Model
 * Records all payments with automatic split calculation for future gateway integration
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentTransaction = sequelize.define('PaymentTransaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    appointment_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    client_id: {
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
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    salon_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    professional_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    salon_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    professional_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    gateway_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    net_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM('DINHEIRO', 'DEBITO', 'CREDITO', 'PIX', 'TRANSFERENCIA'),
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'service_payments',
    underscored: true,
    paranoid: true,
    timestamps: true,
  });

  PaymentTransaction.associate = (models) => {
    PaymentTransaction.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    PaymentTransaction.belongsTo(models.Appointment, {
      foreignKey: 'appointment_id',
      as: 'appointment',
    });

    PaymentTransaction.belongsTo(models.Client, {
      foreignKey: 'client_id',
      as: 'client',
    });

    PaymentTransaction.belongsTo(models.ProfessionalDetail, {
      foreignKey: 'professional_id',
      as: 'professional',
    });

    PaymentTransaction.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service',
    });
  };

  return PaymentTransaction;
};
