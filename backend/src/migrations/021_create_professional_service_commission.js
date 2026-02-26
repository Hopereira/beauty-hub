'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('professional_service_commissions', {
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
      professional_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'professional_details',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      commission_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
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
    await queryInterface.addIndex('professional_service_commissions', ['tenant_id']);
    await queryInterface.addIndex('professional_service_commissions', ['professional_id']);
    await queryInterface.addIndex('professional_service_commissions', ['service_id']);
    await queryInterface.addIndex('professional_service_commissions', ['tenant_id', 'professional_id', 'service_id'], {
      unique: true,
      name: 'unique_professional_service_commission',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('professional_service_commissions');
  },
};
