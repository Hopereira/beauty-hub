const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FinancialEntry = sequelize.define('FinancialEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    establishment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'establishments', key: 'id' },
    },
    appointment_id: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      references: { model: 'appointments', key: 'id' },
    },
    client_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'clients', key: 'id' },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    entry_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    payment_method_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'payment_methods', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PAID',
    },
  }, {
    tableName: 'financial_entries',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return FinancialEntry;
};
