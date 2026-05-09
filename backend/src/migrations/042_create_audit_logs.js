'use strict';

/**
 * Migration: Create audit_logs table
 * Purpose: Track all sensitive operations for compliance
 * LGPD Compliance: Art. 46 (security and audit)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'SET NULL',
      },
      
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      
      // Action details
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'create, read, update, delete, export, login, logout',
      },
      
      entity: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'user, client, appointment, billing, lgpd',
      },
      
      entity_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      
      // Context
      ip_address: {
        type: Sequelize.INET,
        allowNull: true,
      },
      
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      
      request_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Correlation ID for request tracking',
      },
      
      // Data (anonymized)
      old_values: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      
      new_values: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      
      // Metadata
      status: {
        type: Sequelize.STRING(20),
        defaultValue: 'success',
        allowNull: false,
      },
      
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
    
    // Indexes for query performance
    await queryInterface.addIndex('audit_logs', ['tenant_id', 'created_at'], {
      name: 'idx_audit_tenant_time',
    });
    
    await queryInterface.addIndex('audit_logs', ['user_id', 'created_at'], {
      name: 'idx_audit_user_time',
    });
    
    await queryInterface.addIndex('audit_logs', ['action', 'entity'], {
      name: 'idx_audit_action_entity',
    });
    
    await queryInterface.addIndex('audit_logs', ['created_at'], {
      name: 'idx_audit_time',
    });
    
    await queryInterface.addIndex('audit_logs', ['request_id'], {
      name: 'idx_audit_request_id',
    });
    
    console.log('[MIGRATION] Audit logs table created');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
