/**
 * Seed sample data for audit and webhook logs
 * Run this after backend starts to populate test data
 */

const http = require('http');

const sampleAuditLogs = [
    {
        action: 'plan_created',
        entity_type: 'subscription_plan',
        metadata: { plan_name: 'Starter', price: 49.90 }
    },
    {
        action: 'subscription_created',
        entity_type: 'subscription',
        metadata: { tenant: 'salon-demo', plan: 'starter' }
    },
    {
        action: 'invoice_paid',
        entity_type: 'invoice',
        metadata: { amount: 99.90, method: 'credit_card' }
    },
    {
        action: 'plan_updated',
        entity_type: 'subscription_plan',
        metadata: { plan_name: 'Professional', old_price: 99.90, new_price: 89.90 }
    }
];

const sampleWebhookLogs = [
    {
        provider: 'stripe',
        event_type: 'payment_intent.succeeded',
        status: 'processed',
        event_id: 'evt_test_123'
    },
    {
        provider: 'stripe',
        event_type: 'customer.subscription.updated',
        status: 'processed',
        event_id: 'evt_test_456'
    },
    {
        provider: 'pagarme',
        event_type: 'charge.paid',
        status: 'received',
        event_id: 'evt_pagarme_789'
    },
    {
        provider: 'stripe',
        event_type: 'invoice.payment_failed',
        status: 'failed',
        error_message: 'Insufficient funds',
        retry_count: 3
    }
];

console.log('📊 Sample Audit & Webhook Logs Data');
console.log('=====================================\n');
console.log('Audit Logs:', JSON.stringify(sampleAuditLogs, null, 2));
console.log('\nWebhook Logs:', JSON.stringify(sampleWebhookLogs, null, 2));
console.log('\n✅ Data ready for manual insertion or API seeding');
console.log('\nNote: Tables will be auto-created when backend starts');
console.log('Access logs via:');
console.log('  - GET /api/master/billing/audit-logs');
console.log('  - GET /api/master/billing/webhook-logs');
