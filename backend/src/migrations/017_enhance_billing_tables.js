'use strict';

/**
 * Migration: Enhance Billing Tables
 * Adds new columns for complete billing system:
 * - subscription_plans: price_monthly, price_yearly, annual_discount_percentage
 * - subscriptions: billing_cycle, payment_method, grace_period_days, suspended_at
 * - invoices: billing_cycle, payment_method enhancements
 */

const BILLING_CYCLE = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

const PAYMENT_METHOD_TYPE = {
  CARD: 'card',
  PIX: 'pix',
  BOLETO: 'boleto',
};

const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ═══════════════════════════════════════════════════════════════════════════
      // 1. SUBSCRIPTION_PLANS - Add pricing columns
      // ═══════════════════════════════════════════════════════════════════════════
      
      // Add price_monthly (rename existing 'price' concept)
      await queryInterface.addColumn('subscription_plans', 'price_monthly', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      // Add price_yearly
      await queryInterface.addColumn('subscription_plans', 'price_yearly', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      // Add annual_discount_percentage
      await queryInterface.addColumn('subscription_plans', 'annual_discount_percentage', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 15.00,
      }, { transaction });

      // Add max_users limit
      await queryInterface.addColumn('subscription_plans', 'max_users', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }, { transaction });

      // Add max_professionals limit
      await queryInterface.addColumn('subscription_plans', 'max_professionals', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }, { transaction });

      // Add max_appointments_per_month
      await queryInterface.addColumn('subscription_plans', 'max_appointments_per_month', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }, { transaction });

      // Add highlight flag for featured plans
      await queryInterface.addColumn('subscription_plans', 'is_highlighted', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      }, { transaction });

      // Migrate existing price to price_monthly
      await queryInterface.sequelize.query(`
        UPDATE subscription_plans 
        SET price_monthly = price 
        WHERE price_monthly IS NULL
      `, { transaction });

      // Calculate price_yearly based on discount
      await queryInterface.sequelize.query(`
        UPDATE subscription_plans 
        SET price_yearly = ROUND(price_monthly * 12 * (1 - annual_discount_percentage / 100), 2)
        WHERE price_yearly IS NULL AND price_monthly > 0
      `, { transaction });

      // ═══════════════════════════════════════════════════════════════════════════
      // 2. SUBSCRIPTIONS - Add billing columns
      // ═══════════════════════════════════════════════════════════════════════════

      // Create billing_cycle enum
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE billing_cycle_enum AS ENUM ('monthly', 'yearly');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });

      // Create payment_method_type enum
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE payment_method_type_enum AS ENUM ('card', 'pix', 'boleto');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });

      // Add billing_cycle
      await queryInterface.addColumn('subscriptions', 'billing_cycle', {
        type: Sequelize.ENUM(...Object.values(BILLING_CYCLE)),
        allowNull: false,
        defaultValue: BILLING_CYCLE.MONTHLY,
      }, { transaction });

      // Add payment_method
      await queryInterface.addColumn('subscriptions', 'payment_method', {
        type: Sequelize.ENUM(...Object.values(PAYMENT_METHOD_TYPE)),
        allowNull: true,
      }, { transaction });

      // Add grace_period_days
      await queryInterface.addColumn('subscriptions', 'grace_period_days', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 7,
      }, { transaction });

      // Add suspended_at
      await queryInterface.addColumn('subscriptions', 'suspended_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      // Add gateway_subscription_id (generic, not stripe-specific)
      await queryInterface.addColumn('subscriptions', 'gateway_subscription_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      // Add gateway_customer_id (generic)
      await queryInterface.addColumn('subscriptions', 'gateway_customer_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      // Add gateway_provider
      await queryInterface.addColumn('subscriptions', 'gateway_provider', {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });

      // Add last_payment_at
      await queryInterface.addColumn('subscriptions', 'last_payment_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      // Add next_billing_at
      await queryInterface.addColumn('subscriptions', 'next_billing_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      // Add amount (current subscription amount)
      await queryInterface.addColumn('subscriptions', 'amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      // Update status enum to include 'suspended'
      // First check if 'suspended' exists
      const [statusCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'suspended' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_subscriptions_status')
        ) as exists
      `, { transaction });

      if (!statusCheck[0].exists) {
        await queryInterface.sequelize.query(`
          ALTER TYPE enum_subscriptions_status ADD VALUE IF NOT EXISTS 'suspended';
        `, { transaction });
      }

      // Add indexes
      await queryInterface.addIndex('subscriptions', ['billing_cycle'], {
        name: 'idx_subscriptions_billing_cycle',
        transaction,
      });

      await queryInterface.addIndex('subscriptions', ['payment_method'], {
        name: 'idx_subscriptions_payment_method',
        transaction,
      });

      await queryInterface.addIndex('subscriptions', ['next_billing_at'], {
        name: 'idx_subscriptions_next_billing_at',
        transaction,
      });

      await queryInterface.addIndex('subscriptions', ['gateway_provider', 'gateway_subscription_id'], {
        name: 'idx_subscriptions_gateway',
        transaction,
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // 3. INVOICES - Add billing columns
      // ═══════════════════════════════════════════════════════════════════════════

      // Add billing_cycle to invoices
      await queryInterface.addColumn('invoices', 'billing_cycle', {
        type: Sequelize.ENUM(...Object.values(BILLING_CYCLE)),
        allowNull: true,
      }, { transaction });

      // Add gateway_invoice_id
      await queryInterface.addColumn('invoices', 'gateway_invoice_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      // Add gateway_payment_id
      await queryInterface.addColumn('invoices', 'gateway_payment_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      // Add gateway_provider
      await queryInterface.addColumn('invoices', 'gateway_provider', {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });

      // Add pix_qr_code
      await queryInterface.addColumn('invoices', 'pix_qr_code', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      // Add pix_qr_code_base64
      await queryInterface.addColumn('invoices', 'pix_qr_code_base64', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      // Add pix_expiration
      await queryInterface.addColumn('invoices', 'pix_expiration', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      // Add attempt_count
      await queryInterface.addColumn('invoices', 'attempt_count', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      }, { transaction });

      // Add last_attempt_at
      await queryInterface.addColumn('invoices', 'last_attempt_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      // Add failure_reason
      await queryInterface.addColumn('invoices', 'failure_reason', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      // Add indexes
      await queryInterface.addIndex('invoices', ['gateway_provider', 'gateway_invoice_id'], {
        name: 'idx_invoices_gateway',
        transaction,
      });

      await queryInterface.addIndex('invoices', ['billing_cycle'], {
        name: 'idx_invoices_billing_cycle',
        transaction,
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // 4. CREATE PAYMENT_TRANSACTIONS TABLE
      // ═══════════════════════════════════════════════════════════════════════════

      await queryInterface.createTable('payment_transactions', {
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
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        subscription_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'subscriptions',
            key: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        invoice_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'invoices',
            key: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        type: {
          type: Sequelize.ENUM('payment', 'refund', 'chargeback'),
          allowNull: false,
          defaultValue: 'payment',
        },
        status: {
          type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending',
        },
        payment_method: {
          type: Sequelize.ENUM('card', 'pix', 'boleto'),
          allowNull: false,
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        currency: {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: 'BRL',
        },
        gateway_provider: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        gateway_transaction_id: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        gateway_response: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        card_last_four: {
          type: Sequelize.STRING(4),
          allowNull: true,
        },
        card_brand: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        pix_qr_code: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        pix_expiration: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        processed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        failure_reason: {
          type: Sequelize.TEXT,
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
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      }, { transaction });

      await queryInterface.addIndex('payment_transactions', ['tenant_id'], {
        name: 'idx_payment_transactions_tenant',
        transaction,
      });

      await queryInterface.addIndex('payment_transactions', ['subscription_id'], {
        name: 'idx_payment_transactions_subscription',
        transaction,
      });

      await queryInterface.addIndex('payment_transactions', ['invoice_id'], {
        name: 'idx_payment_transactions_invoice',
        transaction,
      });

      await queryInterface.addIndex('payment_transactions', ['status'], {
        name: 'idx_payment_transactions_status',
        transaction,
      });

      await queryInterface.addIndex('payment_transactions', ['gateway_provider', 'gateway_transaction_id'], {
        name: 'idx_payment_transactions_gateway',
        transaction,
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // 5. CREATE BILLING_AUDIT_LOG TABLE
      // ═══════════════════════════════════════════════════════════════════════════

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
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
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
        ip_address: {
          type: Sequelize.STRING(45),
          allowNull: true,
        },
        user_agent: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addIndex('billing_audit_logs', ['tenant_id'], {
        name: 'idx_billing_audit_logs_tenant',
        transaction,
      });

      await queryInterface.addIndex('billing_audit_logs', ['action'], {
        name: 'idx_billing_audit_logs_action',
        transaction,
      });

      await queryInterface.addIndex('billing_audit_logs', ['entity_type', 'entity_id'], {
        name: 'idx_billing_audit_logs_entity',
        transaction,
      });

      await queryInterface.addIndex('billing_audit_logs', ['created_at'], {
        name: 'idx_billing_audit_logs_created',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop new tables
      await queryInterface.dropTable('billing_audit_logs', { transaction });
      await queryInterface.dropTable('payment_transactions', { transaction });

      // Remove columns from invoices
      await queryInterface.removeColumn('invoices', 'billing_cycle', { transaction });
      await queryInterface.removeColumn('invoices', 'gateway_invoice_id', { transaction });
      await queryInterface.removeColumn('invoices', 'gateway_payment_id', { transaction });
      await queryInterface.removeColumn('invoices', 'gateway_provider', { transaction });
      await queryInterface.removeColumn('invoices', 'pix_qr_code', { transaction });
      await queryInterface.removeColumn('invoices', 'pix_qr_code_base64', { transaction });
      await queryInterface.removeColumn('invoices', 'pix_expiration', { transaction });
      await queryInterface.removeColumn('invoices', 'attempt_count', { transaction });
      await queryInterface.removeColumn('invoices', 'last_attempt_at', { transaction });
      await queryInterface.removeColumn('invoices', 'failure_reason', { transaction });

      // Remove columns from subscriptions
      await queryInterface.removeColumn('subscriptions', 'billing_cycle', { transaction });
      await queryInterface.removeColumn('subscriptions', 'payment_method', { transaction });
      await queryInterface.removeColumn('subscriptions', 'grace_period_days', { transaction });
      await queryInterface.removeColumn('subscriptions', 'suspended_at', { transaction });
      await queryInterface.removeColumn('subscriptions', 'gateway_subscription_id', { transaction });
      await queryInterface.removeColumn('subscriptions', 'gateway_customer_id', { transaction });
      await queryInterface.removeColumn('subscriptions', 'gateway_provider', { transaction });
      await queryInterface.removeColumn('subscriptions', 'last_payment_at', { transaction });
      await queryInterface.removeColumn('subscriptions', 'next_billing_at', { transaction });
      await queryInterface.removeColumn('subscriptions', 'amount', { transaction });

      // Remove columns from subscription_plans
      await queryInterface.removeColumn('subscription_plans', 'price_monthly', { transaction });
      await queryInterface.removeColumn('subscription_plans', 'price_yearly', { transaction });
      await queryInterface.removeColumn('subscription_plans', 'annual_discount_percentage', { transaction });
      await queryInterface.removeColumn('subscription_plans', 'max_users', { transaction });
      await queryInterface.removeColumn('subscription_plans', 'max_professionals', { transaction });
      await queryInterface.removeColumn('subscription_plans', 'max_appointments_per_month', { transaction });
      await queryInterface.removeColumn('subscription_plans', 'is_highlighted', { transaction });

      // Drop enums
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS billing_cycle_enum CASCADE;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS payment_method_type_enum CASCADE;', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
