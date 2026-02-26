const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Establishment = sequelize.define('Establishment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(255),
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
    cnpj: {
      type: DataTypes.STRING(18),
      allowNull: true,
      unique: true,
    },
    opening_hours: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    payment_settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Configurações de pagamento (Pagar.me, split, etc)',
    },
    bank_account: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Dados bancários para recebimento',
    },
    pagarme_recipient_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID do recebedor no Pagar.me',
    },
  }, {
    tableName: 'establishments',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return Establishment;
};
