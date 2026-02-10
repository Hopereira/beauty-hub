const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FinancialExit = sequelize.define('FinancialExit', {
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
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    exit_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PAID',
    },
  }, {
    tableName: 'financial_exits',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return FinancialExit;
};
