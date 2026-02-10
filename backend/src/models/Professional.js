const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Professional = sequelize.define('Professional', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
    },
    establishment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'establishments', key: 'id' },
    },
    specialty: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
  }, {
    tableName: 'professionals',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return Professional;
};
