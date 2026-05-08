'use strict';

/**
 * WebhookEvent Model
 * Purpose: Idempotency, replay protection, and audit trail for webhooks
 * Security: Stores event metadata and payload for debugging and compliance
 */

module.exports = (sequelize, DataTypes) => {
  const WebhookEvent = sequelize.define('WebhookEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Payment provider: stripe, pagarme, etc.',
    },
    
    eventId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'event_id',
      comment: 'External event ID from provider (for idempotency)',
    },
    
    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'event_type',
      comment: 'Event type: subscription.created, payment.succeeded, etc.',
    },
    
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Full webhook payload (consider encryption for sensitive data)',
    },
    
    processed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at',
    },
    
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if processing failed',
    },
    
    retries: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    
    signatureValid: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'signature_valid',
    },
    
    sourceIp: {
      type: DataTypes.INET,
      allowNull: true,
      field: 'source_ip',
      comment: 'IP address of the webhook sender',
    },
    
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
  }, {
    tableName: 'webhook_events',
    timestamps: true,
    paranoid: false, // Hard delete — we want to keep audit trail
    
    indexes: [
      {
        unique: true,
        fields: ['event_id'],
        name: 'webhook_events_event_id_unique',
      },
      {
        fields: ['provider', 'processed'],
        name: 'webhook_events_provider_processed_idx',
      },
      {
        fields: ['created_at'],
        name: 'webhook_events_created_at_idx',
      },
      {
        fields: ['event_type'],
        name: 'webhook_events_event_type_idx',
      },
    ],
  });

  WebhookEvent.associate = (models) => {
    if (models.Tenant) {
      WebhookEvent.belongsTo(models.Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant',
      });
    }
  };

  return WebhookEvent;
};
