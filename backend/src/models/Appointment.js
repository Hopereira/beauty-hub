const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define('Appointment', {
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
    client_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'clients', key: 'id' },
    },
    professional_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'professionals', key: 'id' },
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'services', key: 'id' },
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price_charged: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  }, {
    tableName: 'appointments',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return Appointment;
};
