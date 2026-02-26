'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('professional_details', {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      cpf: {
        type: Sequelize.STRING(14),
        allowNull: true,
      },
      hire_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      contract_type: {
        type: Sequelize.ENUM('CLT', 'AUTONOMO', 'PARCEIRO'),
        allowNull: false,
        defaultValue: 'AUTONOMO',
      },
      base_commission_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
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
    await queryInterface.addIndex('professional_details', ['tenant_id']);
    await queryInterface.addIndex('professional_details', ['user_id']);
    await queryInterface.addIndex('professional_details', ['tenant_id', 'user_id'], {
      unique: true,
      where: { deleted_at: null },
    });
    await queryInterface.addIndex('professional_details', ['active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('professional_details');
  },
};
