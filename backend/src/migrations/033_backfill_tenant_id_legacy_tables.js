'use strict';

/**
 * Migration: Backfill tenant_id in legacy tables
 * Fills tenant_id based on establishment_id -> tenants.owner_id relationship
 * Run after 031_add_tenant_id_to_legacy_tables.js
 */

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if establishments.tenant_id exists before attempting backfill
      const [colCheck] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'establishments' AND column_name = 'tenant_id'
      `, { transaction });

      if (colCheck.length === 0) {
        console.log('ℹ️  Migration 033: establishments.tenant_id not found, skipping backfill (fresh DB)');
        await transaction.commit();
        return;
      }

      const tables = [
        'appointments',
        'clients',
        'services',
        'professionals',
        'financial_entries',
        'financial_exits',
        'payment_methods',
      ];

      for (const table of tables) {
        // Backfill: join through establishments to find the correct tenant
        await queryInterface.sequelize.query(`
          UPDATE ${table} t
          SET tenant_id = e.tenant_id
          FROM establishments e
          WHERE t.establishment_id = e.id
            AND t.tenant_id IS NULL
            AND e.tenant_id IS NOT NULL
        `, { transaction });
      }

      await transaction.commit();
      console.log('✅ Migration 033: tenant_id backfill completed for legacy tables');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down() {
    // Backfill is not reversible without data loss risk
    console.log('⚠️  Migration 033 down: backfill is not automatically reversible');
  },
};
