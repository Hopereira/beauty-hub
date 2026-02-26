'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      internal_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      barcode: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      supplier_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      cost_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      sale_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      stock_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minimum_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      expiration_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      batch_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
    await queryInterface.addIndex('products', ['tenant_id']);
    await queryInterface.addIndex('products', ['supplier_id']);
    await queryInterface.addIndex('products', ['category']);
    await queryInterface.addIndex('products', ['active']);
    await queryInterface.addIndex('products', ['barcode']);
    await queryInterface.addIndex('products', ['internal_code']);
    await queryInterface.addIndex('products', ['expiration_date']);
    await queryInterface.addIndex('products', ['tenant_id', 'stock_quantity']);
    await queryInterface.addIndex('products', ['tenant_id', 'name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  },
};
