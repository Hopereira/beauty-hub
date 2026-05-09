'use strict';

/**
 * Migration: Fix Performance Indexes
 * Purpose: Recreate indexes with IF NOT EXISTS after partial migration 040
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('[MIGRATION] Fixing performance indexes...');
    
    // Drop all indexes first (safe to drop if exists)
    const indexesToDrop = [
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
    
    for (const indexName of indexesToDrop) {
      try {
        await queryInterface.sequelize.query(
          `DROP INDEX IF EXISTS ${indexName}`
        );
        console.log(`[MIGRATION] Dropped index: ${indexName}`);
      } catch (e) {
        // Index might not exist, continue
      }
    }
    
    // Recreate all indexes with IF NOT EXISTS
    
    // APPOINTMENTS
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_start_time 
      ON appointments (tenant_id, start_time) 
      WHERE deleted_at IS NULL
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_professional_schedule 
      ON appointments (tenant_id, professional_id, start_time) 
      WHERE deleted_at IS NULL
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_client_history 
      ON appointments (tenant_id, client_id) 
      WHERE deleted_at IS NULL
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_status 
      ON appointments (status)
    `);
    
    // FINANCIAL ENTRIES
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_entries_tenant_date 
      ON financial_entries (tenant_id, entry_date)
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_entries_category_report 
      ON financial_entries (tenant_id, entry_date)
    `);
    
    // INVOICES
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_pending_collection 
      ON invoices (tenant_id, status, due_date) 
      WHERE status IN ('pending', 'overdue')
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_gateway_lookup 
      ON invoices (gateway_invoice_id)
    `);
    
    // SUBSCRIPTIONS
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_lookup 
      ON subscriptions (gateway_subscription_id)
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status 
      ON subscriptions (tenant_id, status)
    `);
    
    // USERS
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_lookup 
      ON users (email)
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_tenant_role 
      ON users (tenant_id, role)
    `);
    
    // LOGIN ATTEMPTS
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_brute_force_check 
      ON login_attempts (identifier, created_at)
    `);
    
    // WEBHOOK EVENTS
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_idempotency 
      ON webhook_events (event_id)
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_queue 
      ON webhook_events (provider, processed, created_at)
    `);
    
    // USER SESSIONS
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token_lookup 
      ON user_sessions (refresh_token_hash)
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_active_user 
      ON user_sessions (user_id, is_valid, expires_at)
    `);
    
    console.log('[MIGRATION] Performance indexes fixed successfully');
  },

  async down(queryInterface, Sequelize) {
    // Indexes dropped in up(), nothing to do here
    console.log('[MIGRATION] Indexes already dropped in up()');
  },
};
