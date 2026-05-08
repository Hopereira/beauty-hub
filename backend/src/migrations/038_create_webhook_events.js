'use strict';

/**
 * Migration: Create webhook_events table
 * Purpose: Idempotency, replay protection, and audit for webhooks
 * Rollback: Safe — only adds table, doesn't modify existing data
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('webhook_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      
      // Provider identification
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'stripe, pagarme, etc.',
      },
      
      // Event identification (for idempotency)
      event_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'External event ID from provider',
      },
      
      // Event type
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'subscription.created, payment.succeeded, etc.',
      },
      
      // Payload (encrypted or hashed for sensitive data)
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Full webhook payload',
      },
      
      // Processing status
      processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      
      // Error tracking
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      
      // Retry tracking
      retries: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      
      // Signature validation
      signature_valid: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      
      // IP for logging
      source_ip: {
        type: Sequelize.INET,
        allowNull: true,
      },
      
      // Tenant context (if applicable)
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
      
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Indexes for performance
    await queryInterface.addIndex('webhook_events', ['event_id'], {
      unique: true,
      name: 'webhook_events_event_id_unique',
    });
    
    await queryInterface.addIndex('webhook_events', ['provider', 'processed'], {
      name: 'webhook_events_provider_processed_idx',
    });
    
    await queryInterface.addIndex('webhook_events', ['created_at'], {
      name: 'webhook_events_created_at_idx',
    });
    
    await queryInterface.addIndex('webhook_events', ['event_type'], {
      name: 'webhook_events_event_type_idx',
    });

    console.log('[MIGRATION] Table webhook_events created with idempotency support');
  },

  async down(queryInterface) {
    // Safe rollback — removes table but doesn't affect existing data
    await queryInterface.dropTable('webhook_events');
    console.log('[MIGRATION] Table webhook_events removed');
  },
};
