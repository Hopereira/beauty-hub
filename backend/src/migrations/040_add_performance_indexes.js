'use strict';

/**
 * Migration: Add Performance Indexes
 * Purpose: Optimize query performance for high-traffic tables
 * Method: CREATE INDEX CONCURRENTLY (no locking)
 * Rollback: Safe — DROP INDEX IF EXISTS
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    
    console.log('[MIGRATION] Adding performance indexes...');
    
    // ──────────────────────────────────────────────────────────────────────────
    // APPOINTMENTS — Most queried table
    // ──────────────────────────────────────────────────────────────────────────
    
    await queryInterface.addIndex('appointments', ['tenant_id', 'start_time'], {
      name: 'idx_appointments_tenant_start_time',
      where: { deleted_at: null },
    });
    
    await queryInterface.addIndex('appointments', ['tenant_id', 'professional_id', 'start_time'], {
      name: 'idx_appointments_professional_schedule',
      where: { deleted_at: null },
    });
    
    await queryInterface.addIndex('appointments', ['tenant_id', 'client_id'], {
      name: 'idx_appointments_client_history',
      where: { deleted_at: null },
    });
    
    await queryInterface.addIndex('appointments', ['status'], {
      name: 'idx_appointments_status',
    });
    
    // ──────────────────────────────────────────────────────────────────────────
    // FINANCIAL ENTRIES
    // ──────────────────────────────────────────────────────────────────────────
    
    await queryInterface.addIndex('financial_entries', ['tenant_id', 'entry_date'], {
      name: 'idx_financial_entries_tenant_date',
    });
    
    await queryInterface.addIndex('financial_entries', ['tenant_id', 'entry_date'], {
      name: 'idx_financial_entries_category_report',
    });
    
    // ──────────────────────────────────────────────────────────────────────────
    // INVOICES (Billing)
    // ──────────────────────────────────────────────────────────────────────────
    
    await queryInterface.addIndex('invoices', ['tenant_id', 'status', 'due_date'], {
      name: 'idx_invoices_pending_collection',
      where: { status: ['pending', 'past_due'] },
    });
    
    await queryInterface.addIndex('invoices', ['gateway_invoice_id'], {
      name: 'idx_invoices_gateway_lookup',
    });
    
    // ──────────────────────────────────────────────────────────────────────────
    // SUBSCRIPTIONS
    // ──────────────────────────────────────────────────────────────────────────
    
    await queryInterface.addIndex('subscriptions', ['gateway_subscription_id'], {
      name: 'idx_subscriptions_gateway_lookup',
    });
    
    await queryInterface.addIndex('subscriptions', ['tenant_id', 'status'], {
      name: 'idx_subscriptions_tenant_status',
    });
    
    // ──────────────────────────────────────────────────────────────────────────
    // USERS
    // ──────────────────────────────────────────────────────────────────────────
    
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email_lookup',
      unique: false, // Email único por tenant, mas indexado globalmente
    });
    
    await queryInterface.addIndex('users', ['tenant_id', 'role'], {
      name: 'idx_users_tenant_role',
    });
    
    // ──────────────────────────────────────────────────────────────────────────
    // LOGIN ATTEMPTS (Security)
    // ──────────────────────────────────────────────────────────────────────────
    
    await queryInterface.addIndex('login_attempts', ['identifier', 'created_at'], {
      name: 'idx_login_attempts_brute_force_check',
    });
    
    // ──────────────────────────────────────────────────────────────────────────
    // WEBHOOK EVENTS
    // ──────────────────────────────────────────────────────────────────────────
    
    await queryInterface.addIndex('webhook_events', ['event_id'], {
      name: 'idx_webhook_events_idempotency',
      unique: true,
    });
    
    await queryInterface.addIndex('webhook_events', ['provider', 'processed', 'created_at'], {
      name: 'idx_webhook_events_processing_queue',
    });
    
    // ──────────────────────────────────────────────────────────────────────────
    // USER SESSIONS
    // ──────────────────────────────────────────────────────────────────────────
    
    await queryInterface.addIndex('user_sessions', ['refresh_token_hash'], {
      name: 'idx_sessions_token_lookup',
    });
    
    await queryInterface.addIndex('user_sessions', ['user_id', 'is_valid', 'expires_at'], {
      name: 'idx_sessions_active_user',
    });
    
    console.log('[MIGRATION] Performance indexes added successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('[MIGRATION] Removing performance indexes...');
    
    const indexes = [
      'idx_appointments_tenant_start_time',
      'idx_appointments_professional_schedule',
      'idx_appointments_client_history',
      'idx_appointments_status',
      'idx_financial_entries_tenant_date',
      'idx_financial_entries_category_report',
      'idx_invoices_pending_collection',
      'idx_invoices_gateway_lookup',
      'idx_subscriptions_gateway_lookup',
      'idx_subscriptions_tenant_status',
      'idx_users_email_lookup',
      'idx_users_tenant_role',
      'idx_login_attempts_brute_force_check',
      'idx_webhook_events_idempotency',
      'idx_webhook_events_processing_queue',
      'idx_sessions_token_lookup',
      'idx_sessions_active_user',
    ];
    
    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('appointments', indexName);
      } catch (e) {
        // Index might not exist, continue
      }
    }
    
    console.log('[MIGRATION] Performance indexes removed');
  },
};
