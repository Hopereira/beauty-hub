const { sequelize } = require('../src/shared/database');

async function createTables() {
    try {
        console.log('✅ Connected to database');

        // Create billing_audit_logs table
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
        console.log('✅ billing_audit_logs table created');

        // Create indexes for billing_audit_logs
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_tenant ON billing_audit_logs(tenant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_action ON billing_audit_logs(action);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_entity ON billing_audit_logs(entity_type, entity_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_created ON billing_audit_logs(created_at);`);
        console.log('✅ billing_audit_logs indexes created');

        // Create webhook_logs table
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
        console.log('✅ webhook_logs table created');

        // Create indexes for webhook_logs
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_tenant ON webhook_logs(tenant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);`);
        console.log('✅ webhook_logs indexes created');

        // Insert sample data
        await sequelize.query(`
            INSERT INTO billing_audit_logs (action, entity_type, metadata) VALUES
            ('plan_created', 'subscription_plan', '{"plan_name": "Starter"}'),
            ('subscription_created', 'subscription', '{"tenant": "test"}'),
            ('invoice_paid', 'invoice', '{"amount": 99.90}')
            ON CONFLICT DO NOTHING;
        `);

        await sequelize.query(`
            INSERT INTO webhook_logs (provider, event_type, status) VALUES
            ('stripe', 'payment_intent.succeeded', 'processed'),
            ('stripe', 'customer.subscription.updated', 'processed'),
            ('pagarme', 'charge.paid', 'received')
            ON CONFLICT DO NOTHING;
        `);
        console.log('✅ Sample data inserted');

        console.log('\n🎉 All tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createTables();
