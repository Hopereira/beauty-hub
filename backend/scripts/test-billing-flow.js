#!/usr/bin/env node
/**
 * Billing Flow Test Script
 * Tests subscription state transitions using mock endpoints
 * 
 * Usage:
 *   node scripts/test-billing-flow.js [tenantSlug]
 *   
 * Examples:
 *   node scripts/test-billing-flow.js beleza-pura
 *   node scripts/test-billing-flow.js
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:8080';
const TENANT_SLUG = process.argv[2] || 'beleza-pura';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}`),
};

async function request(method, path, body = null) {
  const url = new URL(path, BASE_URL);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function getTenantId(slug) {
  // Try to get tenant ID from subscription endpoint
  const res = await request('GET', `/api/billing/mock/subscription/${slug}`);
  
  if (res.status === 200 && res.data.data?.subscription?.id) {
    return res.data.data.tenant?.id || slug;
  }
  
  // Fallback: try to find in subscriptions
  log.warn(`Could not find tenant by slug '${slug}', using slug as tenantId`);
  return slug;
}

async function testHealthCheck() {
  log.title('Health Check');
  
  const res = await request('GET', '/api/health');
  
  if (res.status === 200 && res.data.success) {
    log.success(`API is running (uptime: ${Math.round(res.data.data.uptime)}s)`);
    return true;
  }
  
  log.error('API health check failed');
  return false;
}

async function testListEvents() {
  log.title('List Supported Events');
  
  const res = await request('GET', '/api/billing/mock/events');
  
  if (res.status === 200 && res.data.success) {
    log.success('Mock events endpoint available');
    console.log('  Supported events:');
    Object.entries(res.data.data.description).forEach(([event, desc]) => {
      console.log(`    - ${colors.cyan}${event}${colors.reset}: ${desc}`);
    });
    return true;
  }
  
  log.error(`Failed to list events: ${res.data.message}`);
  return false;
}

async function testSubscriptionStatus(tenantId) {
  log.title('Get Subscription Status');
  
  const res = await request('GET', `/api/billing/mock/subscription/${tenantId}`);
  
  if (res.status === 200 && res.data.success) {
    const { subscription, dates, statusChecks, tenant } = res.data.data;
    log.success(`Found subscription for tenant: ${tenant?.name || tenantId}`);
    console.log(`  Status: ${colors.yellow}${subscription.status}${colors.reset}`);
    console.log(`  Plan: ${subscription.plan?.name || 'N/A'}`);
    console.log(`  Should Block: ${statusChecks.shouldBlock ? colors.red + 'YES' : colors.green + 'NO'}${colors.reset}`);
    console.log(`  Trial Ends: ${dates.trialEndsAt || 'N/A'}`);
    console.log(`  Period End: ${dates.currentPeriodEnd || 'N/A'}`);
    return res.data.data;
  }
  
  log.error(`Failed to get subscription: ${res.data.message}`);
  return null;
}

async function testResetToTrial(tenantId) {
  log.title('Reset Subscription to Trial');
  
  const res = await request('POST', `/api/billing/mock/reset/${tenantId}`, {
    planSlug: 'starter',
    trialDays: 30,
  });
  
  if (res.status === 200 && res.data.success) {
    log.success(`Subscription reset to trial (${res.data.data.trialDays} days)`);
    console.log(`  New Status: ${colors.green}${res.data.data.status}${colors.reset}`);
    console.log(`  Trial Ends: ${res.data.data.trialEndsAt}`);
    return true;
  }
  
  log.error(`Failed to reset: ${res.data.message}`);
  return false;
}

async function testTrialExpiration(tenantId) {
  log.title('Simulate Trial Expiration');
  
  const res = await request('POST', '/api/billing/mock/simulate/trial-expiration', {
    tenantId,
  });
  
  if (res.status === 200 && res.data.success) {
    const { statusTransition } = res.data.data;
    log.success(`Trial expired: ${statusTransition.from} → ${statusTransition.to}`);
    return true;
  }
  
  log.error(`Failed: ${res.data.message}`);
  return false;
}

async function testPaymentSuccess(tenantId) {
  log.title('Simulate Payment Success');
  
  const res = await request('POST', '/api/billing/mock/trigger', {
    event: 'payment_success',
    tenantId,
    data: {
      billingCycle: 'monthly',
      paymentMethod: 'card',
    },
  });
  
  if (res.status === 200 && res.data.success) {
    const { statusTransition } = res.data.data;
    log.success(`Payment processed: ${statusTransition.from} → ${statusTransition.to}`);
    console.log(`  Period End: ${res.data.data.subscription.currentPeriodEnd}`);
    return true;
  }
  
  log.error(`Failed: ${res.data.message}`);
  return false;
}

async function testPaymentFailed(tenantId) {
  log.title('Simulate Payment Failed');
  
  const res = await request('POST', '/api/billing/mock/trigger', {
    event: 'payment_failed',
    tenantId,
    data: {
      reason: 'card_declined',
    },
  });
  
  if (res.status === 200 && res.data.success) {
    const { statusTransition } = res.data.data;
    log.success(`Payment failed: ${statusTransition.from} → ${statusTransition.to}`);
    return true;
  }
  
  log.error(`Failed: ${res.data.message}`);
  return false;
}

async function testGracePeriodExpiration(tenantId) {
  log.title('Simulate Grace Period Expiration');
  
  const res = await request('POST', '/api/billing/mock/simulate/grace-period-expiration', {
    tenantId,
  });
  
  if (res.status === 200 && res.data.success) {
    const { statusTransition } = res.data.data;
    log.success(`Grace period expired: ${statusTransition.from} → ${statusTransition.to}`);
    console.log(`  Note: ${res.data.data.note}`);
    return true;
  }
  
  log.error(`Failed: ${res.data.message}`);
  return false;
}

async function testRunJob(jobName, dryRun = true) {
  log.title(`Run Job: ${jobName}${dryRun ? ' (dry-run)' : ''}`);
  
  const res = await request('POST', `/api/billing/mock/job/${jobName}`, {
    dryRun,
  });
  
  if (res.status === 200 && res.data.success) {
    log.success(`Job ${dryRun ? 'simulated' : 'executed'}: ${res.data.data.affectedCount} affected`);
    if (res.data.data.affected.length > 0) {
      console.log('  Affected subscriptions:');
      res.data.data.affected.forEach(a => {
        console.log(`    - ${a.subscriptionId}: ${a.action}`);
      });
    }
    return true;
  }
  
  log.error(`Failed: ${res.data.message}`);
  return false;
}

async function runFullFlow() {
  console.log(`\n${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║         BeautyHub Billing Flow Test                          ║${colors.reset}`);
  console.log(`${colors.cyan}║         Tenant: ${TENANT_SLUG.padEnd(44)}║${colors.reset}`);
  console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}`);

  // 1. Health check
  if (!await testHealthCheck()) {
    log.error('Cannot proceed without healthy API');
    process.exit(1);
  }

  // 2. List events
  await testListEvents();

  // 3. Get initial status
  const initialStatus = await testSubscriptionStatus(TENANT_SLUG);
  if (!initialStatus) {
    log.error('No subscription found');
    process.exit(1);
  }

  const tenantId = initialStatus.tenant?.id || TENANT_SLUG;
  log.info(`Using tenantId: ${tenantId}`);

  // 4. Reset to trial
  await testResetToTrial(tenantId);
  await testSubscriptionStatus(tenantId);

  // 5. Test trial expiration
  await testTrialExpiration(tenantId);
  await testSubscriptionStatus(tenantId);

  // 6. Reactivate with payment
  await testPaymentSuccess(tenantId);
  await testSubscriptionStatus(tenantId);

  // 7. Test payment failure
  await testPaymentFailed(tenantId);
  await testSubscriptionStatus(tenantId);

  // 8. Test grace period expiration
  await testGracePeriodExpiration(tenantId);
  await testSubscriptionStatus(tenantId);

  // 9. Recover with payment
  await testPaymentSuccess(tenantId);
  await testSubscriptionStatus(tenantId);

  // 10. Test jobs (dry run)
  await testRunJob('check_trial_expirations', true);
  await testRunJob('check_subscription_expirations', true);
  await testRunJob('auto_suspend_subscriptions', true);
  await testRunJob('send_renewal_reminders', true);

  log.title('Test Complete');
  log.success('All billing flow tests executed');
  console.log('\nStatus transition flow tested:');
  console.log('  trial → expired → active → past_due → suspended → active');
}

// Run tests
runFullFlow().catch(err => {
  log.error(`Test failed: ${err.message}`);
  process.exit(1);
});
