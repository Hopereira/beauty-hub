'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('purchases', {
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
      supplier_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      purchase_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      payment_method: {
        type: Sequelize.ENUM('DINHEIRO', 'DEBITO', 'CREDITO', 'PIX', 'TRANSFERENCIA', 'BOLETO', 'A_PRAZO'),
        allowNull: false,
      },
      payment_status: {
        type: Sequelize.ENUM('PENDING', 'PAID', 'PARTIAL', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
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

    // Indexes
    await queryInterface.addIndex('purchases', ['tenant_id']);
    await queryInterface.addIndex('purchases', ['supplier_id']);
    await queryInterface.addIndex('purchases', ['purchase_date']);
    await queryInterface.addIndex('purchases', ['payment_status']);
    await queryInterface.addIndex('purchases', ['tenant_id', 'purchase_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('purchases');
  },
};
