/**
 * Schema Validation Script
 * Validates that all critical database columns and tables exist
 * Run: npm run validate-schema
 */

const { sequelize } = require('../src/models');
const logger = require('../src/utils/logger');

// Critical columns that MUST exist
const CRITICAL_SCHEMA = {
  services: ['id', 'name', 'category', 'price', 'establishment_id'],
  establishments: ['id', 'name', 'payment_settings', 'bank_account', 'pagarme_recipient_id'],
  service_categories: ['id', 'name', 'establishment_id', 'color', 'active'],
  products: ['id', 'name', 'category', 'stock_quantity', 'establishment_id'],
  suppliers: ['id', 'name', 'establishment_id'],
  purchases: ['id', 'supplier_id', 'establishment_id', 'total_amount'],
  tenants: ['id', 'slug', 'name', 'status', 'owner_id'],
  subscriptions: ['id', 'tenant_id', 'plan_id', 'status', 'trial_ends_at'],
  subscription_plans: ['id', 'name', 'price', 'limits', 'features'],
};

// Critical migrations that MUST be applied
const CRITICAL_MIGRATIONS = [
  '028_add_category_to_services.js',
  '029_add_payment_fields_to_establishments.js',
  '030_create_service_categories.js',
];

async function validateSchema() {
  console.log('\n🔍 Starting Schema Validation...\n');
  
  let errors = 0;
  let warnings = 0;

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Check SequelizeMeta for applied migrations
    console.log('📋 Checking applied migrations...');
    const [appliedMigrations] = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name'
    );

    const appliedMigrationNames = appliedMigrations.map(m => m.name);
    console.log(`   Found ${appliedMigrationNames.length} applied migrations\n`);

    // Validate critical migrations
    for (const migration of CRITICAL_MIGRATIONS) {
      if (!appliedMigrationNames.includes(migration)) {
        console.error(`❌ CRITICAL: Migration missing: ${migration}`);
        errors++;
      } else {
        console.log(`✅ Migration applied: ${migration}`);
      }
    }

    console.log('\n📊 Validating table schemas...\n');

    // Validate each critical table
    for (const [tableName, requiredColumns] of Object.entries(CRITICAL_SCHEMA)) {
      try {
        // Check if table exists
        const [tables] = await sequelize.query(
          `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name = '${tableName}'`
        );

        if (tables.length === 0) {
          console.error(`❌ CRITICAL: Table missing: ${tableName}`);
          errors++;
          continue;
        }

        // Check columns
        const [columns] = await sequelize.query(
          `SELECT column_name, data_type 
           FROM information_schema.columns 
           WHERE table_name = '${tableName}'`
        );

        const existingColumns = columns.map(c => c.column_name);

        console.log(`📋 Table: ${tableName}`);
        
        for (const column of requiredColumns) {
          if (!existingColumns.includes(column)) {
            console.error(`   ❌ CRITICAL: Column missing: ${tableName}.${column}`);
            errors++;
          } else {
            const columnInfo = columns.find(c => c.column_name === column);
            console.log(`   ✅ ${column} (${columnInfo.data_type})`);
          }
        }

        console.log('');
      } catch (error) {
        console.error(`❌ Error validating table ${tableName}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Errors: ${errors}`);
    console.log(`Total Warnings: ${warnings}`);
    
    if (errors === 0 && warnings === 0) {
      console.log('\n✅ Schema validation PASSED - All critical schema elements present');
      console.log('='.repeat(60) + '\n');
      process.exit(0);
    } else if (errors === 0) {
      console.log('\n⚠️  Schema validation PASSED with warnings');
      console.log('='.repeat(60) + '\n');
      process.exit(0);
    } else {
      console.log('\n❌ Schema validation FAILED - Critical schema elements missing');
      console.log('='.repeat(60) + '\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error during schema validation:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run validation
validateSchema();
