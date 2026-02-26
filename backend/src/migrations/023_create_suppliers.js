'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('suppliers', {
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
      document: {
        type: Sequelize.STRING(18),
        allowNull: true,
        comment: 'CPF or CNPJ',
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
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
    await queryInterface.addIndex('suppliers', ['tenant_id']);
    await queryInterface.addIndex('suppliers', ['document']);
    await queryInterface.addIndex('suppliers', ['active']);
    await queryInterface.addIndex('suppliers', ['tenant_id', 'name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('suppliers');
  },
};
