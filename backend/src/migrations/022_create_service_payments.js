'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'appointments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'clients',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      professional_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'professional_details',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      salon_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Percentage that goes to salon (100 - commission)',
      },
      professional_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Commission percentage for professional',
      },
      salon_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Amount for salon after commission',
      },
      professional_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Commission amount for professional',
      },
      gateway_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Payment gateway fee (for future integration)',
      },
      net_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total amount minus gateway fee',
      },
      payment_method: {
        type: Sequelize.ENUM('DINHEIRO', 'DEBITO', 'CREDITO', 'PIX', 'TRANSFERENCIA'),
        allowNull: false,
      },
      payment_status: {
        type: Sequelize.ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Indexes for performance and filtering
    await queryInterface.addIndex('service_payments', ['tenant_id']);
    await queryInterface.addIndex('service_payments', ['appointment_id']);
    await queryInterface.addIndex('service_payments', ['client_id']);
    await queryInterface.addIndex('service_payments', ['professional_id']);
    await queryInterface.addIndex('service_payments', ['service_id']);
    await queryInterface.addIndex('service_payments', ['payment_status']);
    await queryInterface.addIndex('service_payments', ['payment_method']);
    await queryInterface.addIndex('service_payments', ['paid_at']);
    await queryInterface.addIndex('service_payments', ['created_at']);
    await queryInterface.addIndex('service_payments', ['tenant_id', 'paid_at']);
    await queryInterface.addIndex('service_payments', ['tenant_id', 'professional_id', 'paid_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('service_payments');
  },
};
