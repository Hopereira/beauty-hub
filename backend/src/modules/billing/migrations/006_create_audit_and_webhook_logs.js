'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create billing_audit_logs table
    await queryInterface.createTable('billing_audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      old_values: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      new_values: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes for audit logs
    await queryInterface.addIndex('billing_audit_logs', ['tenant_id']);
    await queryInterface.addIndex('billing_audit_logs', ['action']);
    await queryInterface.addIndex('billing_audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('billing_audit_logs', ['created_at']);

    // Create webhook_logs table
    await queryInterface.createTable('webhook_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'stripe',
      },
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      event_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('received', 'processing', 'processed', 'failed', 'ignored'),
        defaultValue: 'received',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes for webhook logs
    await queryInterface.addIndex('webhook_logs', ['provider']);
    await queryInterface.addIndex('webhook_logs', ['event_type']);
    await queryInterface.addIndex('webhook_logs', ['status']);
    await queryInterface.addIndex('webhook_logs', ['tenant_id']);
    await queryInterface.addIndex('webhook_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('webhook_logs');
    await queryInterface.dropTable('billing_audit_logs');
  },
};
