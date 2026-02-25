'use strict';

/**
 * Migration: Add SaaS Production Tables
 * - webhook_events: Idempotency + DLQ for webhook processing
 * - login_attempts: Brute force protection
 * - data_retention_logs: LGPD compliance tracking
 * - usage_counters: Real-time usage tracking (denormalized for performance)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ═══════════════════════════════════════════════════════════════════════════
      // 1. WEBHOOK_EVENTS - Idempotency + DLQ
      // ═══════════════════════════════════════════════════════════════════════════
      
      await queryInterface.createTable('webhook_events', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        provider: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        event_id: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'External event ID from payment provider',
        },
        event_type: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'dead_letter'),
          allowNull: false,
          defaultValue: 'pending',
        },
        payload: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        tenant_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'tenants',
            key: 'id',
          },
          onDelete: 'SET NULL',
        },
        attempt_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        max_attempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 5,
        },
        last_attempt_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        next_retry_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        error_message: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        error_stack: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        processing_time_ms: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
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
      }, { transaction });

      // Unique constraint for idempotency
      await queryInterface.addIndex('webhook_events', ['provider', 'event_id'], {
        unique: true,
        name: 'idx_webhook_events_idempotency',
        transaction,
      });

      await queryInterface.addIndex('webhook_events', ['status'], {
        name: 'idx_webhook_events_status',
        transaction,
      });

      await queryInterface.addIndex('webhook_events', ['status', 'next_retry_at'], {
        name: 'idx_webhook_events_retry',
        where: { status: 'failed' },
        transaction,
      });

      await queryInterface.addIndex('webhook_events', ['tenant_id'], {
        name: 'idx_webhook_events_tenant',
        transaction,
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // 2. LOGIN_ATTEMPTS - Brute Force Protection
      // ═══════════════════════════════════════════════════════════════════════════

      await queryInterface.createTable('login_attempts', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        identifier: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Email or IP address',
        },
        identifier_type: {
          type: Sequelize.ENUM('email', 'ip'),
          allowNull: false,
        },
        tenant_slug: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        success: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ip_address: {
          type: Sequelize.STRING(45),
          allowNull: true,
        },
        user_agent: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        failure_reason: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addIndex('login_attempts', ['identifier', 'identifier_type', 'created_at'], {
        name: 'idx_login_attempts_identifier',
        transaction,
      });

      await queryInterface.addIndex('login_attempts', ['ip_address', 'created_at'], {
        name: 'idx_login_attempts_ip',
        transaction,
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // 3. USAGE_COUNTERS - Real-time Usage Tracking (denormalized)
      // ═══════════════════════════════════════════════════════════════════════════

      await queryInterface.createTable('usage_counters', {
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
          onDelete: 'CASCADE',
        },
        metric: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'users, professionals, clients, appointments, storage_mb',
        },
        period_key: {
          type: Sequelize.STRING(10),
          allowNull: false,
          comment: 'Format: YYYY-MM for monthly, "lifetime" for absolute counts',
        },
        count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        limit_value: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Current plan limit for quick comparison',
        },
        last_updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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
      }, { transaction });

      // Unique constraint for upsert
      await queryInterface.addIndex('usage_counters', ['tenant_id', 'metric', 'period_key'], {
        unique: true,
        name: 'idx_usage_counters_unique',
        transaction,
      });

      await queryInterface.addIndex('usage_counters', ['tenant_id'], {
        name: 'idx_usage_counters_tenant',
        transaction,
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // 4. DATA_RETENTION_LOGS - LGPD Compliance
      // ═══════════════════════════════════════════════════════════════════════════

      await queryInterface.createTable('data_retention_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        tenant_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        action: {
          type: Sequelize.ENUM(
            'data_export_requested',
            'data_export_completed',
            'data_deletion_requested',
            'data_deletion_completed',
            'data_anonymized',
            'consent_given',
            'consent_revoked',
            'retention_policy_applied'
          ),
          allowNull: false,
        },
        entity_type: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        entity_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        requested_by: {
          type: Sequelize.UUID,
          allowNull: true,
          comment: 'User who requested the action',
        },
        ip_address: {
          type: Sequelize.STRING(45),
          allowNull: true,
        },
        details: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addIndex('data_retention_logs', ['tenant_id'], {
        name: 'idx_data_retention_tenant',
        transaction,
      });

      await queryInterface.addIndex('data_retention_logs', ['user_id'], {
        name: 'idx_data_retention_user',
        transaction,
      });

      await queryInterface.addIndex('data_retention_logs', ['action', 'created_at'], {
        name: 'idx_data_retention_action',
        transaction,
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // 5. ADD COLUMNS TO USERS FOR SECURITY
      // ═══════════════════════════════════════════════════════════════════════════

      await queryInterface.addColumn('users', 'locked_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('users', 'lock_reason', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('users', 'failed_login_attempts', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      }, { transaction });

      await queryInterface.addColumn('users', 'last_failed_login_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('users', 'password_changed_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      // ═══════════════════════════════════════════════════════════════════════════
      // 6. ADD RETENTION COLUMNS TO TENANTS
      // ═══════════════════════════════════════════════════════════════════════════

      await queryInterface.addColumn('tenants', 'data_retention_days', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365,
        comment: 'Days to retain data after cancellation',
      }, { transaction });

      await queryInterface.addColumn('tenants', 'scheduled_deletion_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When tenant data will be permanently deleted',
      }, { transaction });

      await queryInterface.addColumn('tenants', 'data_exported_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove columns from tenants
      await queryInterface.removeColumn('tenants', 'data_retention_days', { transaction });
      await queryInterface.removeColumn('tenants', 'scheduled_deletion_at', { transaction });
      await queryInterface.removeColumn('tenants', 'data_exported_at', { transaction });

      // Remove columns from users
      await queryInterface.removeColumn('users', 'locked_at', { transaction });
      await queryInterface.removeColumn('users', 'lock_reason', { transaction });
      await queryInterface.removeColumn('users', 'failed_login_attempts', { transaction });
      await queryInterface.removeColumn('users', 'last_failed_login_at', { transaction });
      await queryInterface.removeColumn('users', 'password_changed_at', { transaction });

      // Drop tables
      await queryInterface.dropTable('data_retention_logs', { transaction });
      await queryInterface.dropTable('usage_counters', { transaction });
      await queryInterface.dropTable('login_attempts', { transaction });
      await queryInterface.dropTable('webhook_events', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
