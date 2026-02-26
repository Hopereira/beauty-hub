'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('inventory_movements', {
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
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      type: {
        type: Sequelize.ENUM('ENTRY', 'EXIT', 'ADJUSTMENT'),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      previous_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      new_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      professional_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'professional_details',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'clients',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'services',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reference_type: {
        type: Sequelize.ENUM('APPOINTMENT', 'PURCHASE', 'MANUAL', 'ADJUSTMENT'),
        allowNull: false,
      },
      reference_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of the related entity (appointment_id, purchase_id, etc)',
      },
      movement_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
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
    });

    // Indexes for performance
    await queryInterface.addIndex('inventory_movements', ['tenant_id']);
    await queryInterface.addIndex('inventory_movements', ['product_id']);
    await queryInterface.addIndex('inventory_movements', ['professional_id']);
    await queryInterface.addIndex('inventory_movements', ['service_id']);
    await queryInterface.addIndex('inventory_movements', ['type']);
    await queryInterface.addIndex('inventory_movements', ['reference_type']);
    await queryInterface.addIndex('inventory_movements', ['movement_date']);
    await queryInterface.addIndex('inventory_movements', ['tenant_id', 'movement_date']);
    await queryInterface.addIndex('inventory_movements', ['tenant_id', 'product_id', 'movement_date']);
    await queryInterface.addIndex('inventory_movements', ['tenant_id', 'professional_id', 'movement_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('inventory_movements');
  },
};
