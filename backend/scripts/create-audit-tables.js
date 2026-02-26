/**
 * Script to create audit and webhook log tables
 */
const { sequelize } = require('../src/shared/database');

async function createTables() {
  try {
    console.log('Creating billing_audit_logs table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS billing_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        metadata JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Creating indexes for billing_audit_logs...');
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_tenant ON billing_audit_logs(tenant_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_action ON billing_audit_logs(action);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_created ON billing_audit_logs(created_at);`);

    console.log('Creating webhook_logs table...');
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE webhook_status AS ENUM ('received', 'processing', 'processed', 'failed', 'ignored');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
        event_type VARCHAR(100) NOT NULL,
        event_id VARCHAR(255),
        tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
        payload JSONB,
        status VARCHAR(20) DEFAULT 'received',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Creating indexes for webhook_logs...');
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);`);

    console.log('✅ Tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  }
}

createTables();
