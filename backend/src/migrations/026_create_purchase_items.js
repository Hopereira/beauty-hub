'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('purchase_items', {
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
      purchase_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'purchases',
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
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unit_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      total_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
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

    // Indexes
    await queryInterface.addIndex('purchase_items', ['tenant_id']);
    await queryInterface.addIndex('purchase_items', ['purchase_id']);
    await queryInterface.addIndex('purchase_items', ['product_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('purchase_items');
  },
};
