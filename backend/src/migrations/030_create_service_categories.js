'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      establishment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'establishments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#E91E63',
      },
      icon: {
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

    await queryInterface.addIndex('service_categories', ['establishment_id']);
    await queryInterface.addIndex('service_categories', ['name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('service_categories');
  },
};
