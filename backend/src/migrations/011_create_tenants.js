'use strict';

// Inline constants to avoid path issues with Sequelize CLI
const TENANT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      document_type: {
        type: Sequelize.ENUM('cpf', 'cnpj'),
        allowNull: false,
      },
      document: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      type: {
        type: Sequelize.ENUM('establishment', 'autonomous'),
        allowNull: false,
        defaultValue: 'establishment',
      },
      status: {
        type: Sequelize.ENUM(...Object.values(TENANT_STATUS)),
        allowNull: false,
        defaultValue: TENANT_STATUS.PENDING,
      },
      address: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      branding: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      activated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      suspended_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      suspension_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: true,
        // FK will be added after users table is created
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Indexes
    await queryInterface.addIndex('tenants', ['slug'], { unique: true });
    await queryInterface.addIndex('tenants', ['email'], { unique: true });
    await queryInterface.addIndex('tenants', ['document'], { unique: true });
    await queryInterface.addIndex('tenants', ['status']);
    await queryInterface.addIndex('tenants', ['type']);
    await queryInterface.addIndex('tenants', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tenants');
  },
};
