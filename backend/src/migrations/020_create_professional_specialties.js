'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('professional_specialties', {
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
    await queryInterface.addIndex('professional_specialties', ['tenant_id']);
    await queryInterface.addIndex('professional_specialties', ['professional_id']);
    await queryInterface.addIndex('professional_specialties', ['service_id']);
    await queryInterface.addIndex('professional_specialties', ['tenant_id', 'professional_id', 'service_id'], {
      unique: true,
      name: 'unique_professional_specialty',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('professional_specialties');
  },
};
