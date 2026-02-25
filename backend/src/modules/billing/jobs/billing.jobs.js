/**
 * Billing Jobs
 * Scheduled tasks for billing automation
 * 
 * Prepared for BullMQ integration
 * Currently exports job definitions and processors
 */

const { Op } = require('sequelize');
const {
  SUBSCRIPTION_STATUS,
  BILLING_DEFAULTS,
  BILLING_AUDIT_ACTIONS,
} = require('../../../shared/constants');

/**
 * Job definitions for BullMQ
 */
const JOB_DEFINITIONS = {
  CHECK_TRIAL_EXPIRATION: {
    name: 'billing:check-trial-expiration',
    cron: '0 0 * * *', // Daily at midnight
    description: 'Check for expired trials and update status',
  },
  CHECK_SUBSCRIPTION_EXPIRATION: {
    name: 'billing:check-subscription-expiration',
    cron: '0 */6 * * *', // Every 6 hours
    description: 'Check for expired subscriptions and handle grace period',
  },
  SEND_RENEWAL_REMINDERS: {
    name: 'billing:send-renewal-reminders',
    cron: '0 9 * * *', // Daily at 9 AM
    description: 'Send renewal reminders X days before expiration',
  },
  AUTO_SUSPEND: {
    name: 'billing:auto-suspend',
    cron: '0 1 * * *', // Daily at 1 AM
    description: 'Automatically suspend subscriptions past grace period',
  },
  PROCESS_OVERDUE_INVOICES: {
    name: 'billing:process-overdue-invoices',
    cron: '0 */4 * * *', // Every 4 hours
    description: 'Mark overdue invoices and notify tenants',
  },
  CLEANUP_EXPIRED_PIX: {
    name: 'billing:cleanup-expired-pix',
    cron: '0 */2 * * *', // Every 2 hours
    description: 'Clean up expired PIX charges',
  },
  RESET_MONTHLY_USAGE: {
    name: 'billing:reset-monthly-usage',
    cron: '0 0 1 * *', // First day of each month at midnight
    description: 'Reset monthly usage counters (appointments)',
  },
  RETRY_FAILED_WEBHOOKS: {
    name: 'billing:retry-failed-webhooks',
    cron: '*/5 * * * *', // Every 5 minutes
    description: 'Retry failed webhook events',
  },
  CLEANUP_OLD_DATA: {
    name: 'billing:cleanup-old-data',
    cron: '0 3 * * 0', // Sundays at 3 AM
    description: 'Clean up old webhook events, login attempts, and audit logs',
  },
  APPLY_DATA_RETENTION: {
    name: 'billing:apply-data-retention',
    cron: '0 2 * * *', // Daily at 2 AM
    description: 'Apply LGPD data retention policies',
  },
};

/**
 * Job Processors
 */
class BillingJobProcessors {
  constructor(models, services, notificationService = null) {
    this.Subscription = models.Subscription;
    this.Invoice = models.Invoice;
    this.Tenant = models.Tenant;
    this.subscriptionService = services.subscriptionService;
    this.invoiceService = services.invoiceService;
    this.auditService = services.auditService;
    this.notificationService = notificationService;
  }

  /**
   * Check for expired trials
   */
  async processTrialExpiration() {
    const expiredTrials = await this.Subscription.findAll({
      where: {
        status: SUBSCRIPTION_STATUS.TRIAL,
        trial_ends_at: {
          [Op.lt]: new Date(),
        },
      },
      include: [{ model: this.Tenant, as: 'tenant' }],
    });

    console.log(`Found ${expiredTrials.length} expired trials`);

    const results = {
      processed: 0,
      failed: 0,
      errors: [],
    };

    for (const subscription of expiredTrials) {
      try {
        // Update to PAST_DUE (gives grace period to convert)
        await subscription.update({
          status: SUBSCRIPTION_STATUS.PAST_DUE,
        });

        // Log audit
        if (this.auditService) {
          await this.auditService.log({
            action: 'subscription.trial_expired',
            tenantId: subscription.tenant_id,
            entityType: 'subscription',
            entityId: subscription.id,
          });
        }

        // Send notification
        if (this.notificationService && subscription.tenant) {
          await this.notificationService.sendTrialExpiredNotification(subscription.tenant);
        }

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          subscriptionId: subscription.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Check for expired subscriptions (past grace period)
   */
  async processSubscriptionExpiration() {
    const pastDueSubscriptions = await this.Subscription.findAll({
      where: {
        status: SUBSCRIPTION_STATUS.PAST_DUE,
        current_period_end: {
          [Op.lt]: new Date(),
        },
      },
    });

    console.log(`Found ${pastDueSubscriptions.length} past due subscriptions`);

    const results = {
      processed: 0,
      suspended: 0,
      failed: 0,
    };

    for (const subscription of pastDueSubscriptions) {
      try {
        const gracePeriodDays = subscription.grace_period_days || BILLING_DEFAULTS.GRACE_PERIOD_DAYS;
        const gracePeriodEnd = new Date(subscription.current_period_end);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

        if (new Date() > gracePeriodEnd) {
          // Grace period exceeded - suspend
          await this.subscriptionService.suspendSubscription(
            subscription.id,
            'Automatic suspension: payment overdue'
          );
          results.suspended++;
        }

        results.processed++;
      } catch (error) {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Send renewal reminders
   */
  async processRenewalReminders() {
    const reminderDays = BILLING_DEFAULTS.REMINDER_DAYS_BEFORE;
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + reminderDays);

    // Find subscriptions expiring soon
    const expiringSubscriptions = await this.Subscription.findAll({
      where: {
        status: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL],
        [Op.or]: [
          {
            current_period_end: {
              [Op.between]: [new Date(), reminderDate],
            },
          },
          {
            trial_ends_at: {
              [Op.between]: [new Date(), reminderDate],
            },
          },
        ],
      },
      include: [{ model: this.Tenant, as: 'tenant' }],
    });

    console.log(`Found ${expiringSubscriptions.length} subscriptions expiring soon`);

    const results = {
      notified: 0,
      skipped: 0,
      failed: 0,
    };

    for (const subscription of expiringSubscriptions) {
      try {
        // Check if already notified recently
        const lastNotified = subscription.metadata?.last_renewal_reminder;
        if (lastNotified) {
          const daysSinceNotified = Math.floor(
            (new Date() - new Date(lastNotified)) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceNotified < 1) {
            results.skipped++;
            continue;
          }
        }

        // Send notification
        if (this.notificationService && subscription.tenant) {
          await this.notificationService.sendRenewalReminderNotification(
            subscription.tenant,
            subscription
          );
        }

        // Update last notified
        await subscription.update({
          metadata: {
            ...subscription.metadata,
            last_renewal_reminder: new Date(),
          },
        });

        results.notified++;
      } catch (error) {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Auto-suspend overdue subscriptions
   */
  async processAutoSuspension() {
    const suspensionDays = BILLING_DEFAULTS.SUSPENSION_DAYS;
    const suspensionThreshold = new Date();
    suspensionThreshold.setDate(suspensionThreshold.getDate() - suspensionDays);

    const overdueSubscriptions = await this.Subscription.findAll({
      where: {
        status: SUBSCRIPTION_STATUS.PAST_DUE,
        current_period_end: {
          [Op.lt]: suspensionThreshold,
        },
      },
    });

    console.log(`Found ${overdueSubscriptions.length} subscriptions for auto-suspension`);

    const results = {
      suspended: 0,
      failed: 0,
    };

    for (const subscription of overdueSubscriptions) {
      try {
        await this.subscriptionService.suspendSubscription(
          subscription.id,
          `Automatic suspension: ${suspensionDays} days without payment`
        );
        results.suspended++;
      } catch (error) {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Process overdue invoices
   */
  async processOverdueInvoices() {
    const overdueInvoices = await this.invoiceService.getOverdueInvoices();

    console.log(`Found ${overdueInvoices.length} overdue invoices`);

    const results = {
      processed: 0,
      failed: 0,
    };

    for (const invoice of overdueInvoices) {
      try {
        await this.invoiceService.markAsOverdue(invoice.id);
        results.processed++;
      } catch (error) {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Cleanup expired PIX charges
   */
  async processExpiredPixCharges() {
    const expiredCharges = await this.Invoice.findAll({
      where: {
        status: 'pending',
        payment_method: 'pix',
        pix_expiration: {
          [Op.lt]: new Date(),
        },
      },
    });

    console.log(`Found ${expiredCharges.length} expired PIX charges`);

    const results = {
      cancelled: 0,
      failed: 0,
    };

    for (const invoice of expiredCharges) {
      try {
        await invoice.update({
          status: 'cancelled',
          metadata: {
            ...invoice.metadata,
            cancelled_reason: 'PIX expired',
            cancelled_at: new Date(),
          },
        });
        results.cancelled++;
      } catch (error) {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Reset monthly usage counters
   */
  async processMonthlyUsageReset() {
    const sequelize = this.Subscription.sequelize;
    const currentPeriod = this._getCurrentPeriodKey();
    
    console.log(`[Jobs] Resetting monthly usage for period: ${currentPeriod}`);

    // Get all active tenants
    const tenants = await this.Tenant.findAll({
      where: { status: 'active' },
      attributes: ['id'],
    });

    const results = { processed: 0, errors: [] };

    for (const tenant of tenants) {
      try {
        // Create new monthly counters with 0
        await sequelize.query(`
          INSERT INTO usage_counters (id, tenant_id, metric, period_key, count, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, 'appointments', $2, 0, NOW(), NOW())
          ON CONFLICT (tenant_id, metric, period_key) DO NOTHING
        `, { bind: [tenant.id, currentPeriod] });

        results.processed++;
      } catch (error) {
        results.errors.push({ tenantId: tenant.id, error: error.message });
      }
    }

    return results;
  }

  /**
   * Retry failed webhook events
   */
  async processWebhookRetry() {
    const sequelize = this.Subscription.sequelize;
    
    // Get events ready for retry
    const [events] = await sequelize.query(`
      SELECT id, provider, event_id, event_type, payload, tenant_id, attempt_count
      FROM webhook_events
      WHERE status = 'failed'
        AND next_retry_at <= NOW()
        AND attempt_count < 5
      ORDER BY next_retry_at ASC
      LIMIT 50
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`[Jobs] Found ${events?.length || 0} webhooks to retry`);

    const results = { retried: 0, succeeded: 0, failed: 0 };

    for (const event of events || []) {
      try {
        // Mark as processing
        await sequelize.query(`
          UPDATE webhook_events
          SET status = 'processing', last_attempt_at = NOW(), attempt_count = attempt_count + 1
          WHERE id = $1
        `, { bind: [event.id] });

        // TODO: Implement actual webhook reprocessing via webhook controller
        // For now, just mark as needs manual review
        await sequelize.query(`
          UPDATE webhook_events
          SET status = 'failed', 
              error_message = 'Manual retry required',
              next_retry_at = NOW() + INTERVAL '1 hour'
          WHERE id = $1
        `, { bind: [event.id] });

        results.retried++;
      } catch (error) {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Cleanup old data
   */
  async processDataCleanup() {
    const sequelize = this.Subscription.sequelize;
    const results = { webhookEvents: 0, loginAttempts: 0, auditLogs: 0 };

    // Clean old completed webhook events (90 days)
    const [webhooks] = await sequelize.query(`
      DELETE FROM webhook_events
      WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '90 days'
      RETURNING id
    `);
    results.webhookEvents = webhooks?.length || 0;

    // Clean old login attempts (30 days)
    const [logins] = await sequelize.query(`
      DELETE FROM login_attempts
      WHERE created_at < NOW() - INTERVAL '30 days'
      RETURNING id
    `);
    results.loginAttempts = logins?.length || 0;

    console.log(`[Jobs] Cleanup complete:`, results);
    return results;
  }

  /**
   * Apply data retention policies (LGPD)
   */
  async processDataRetention() {
    const sequelize = this.Subscription.sequelize;
    
    // Get tenants scheduled for deletion
    const [tenants] = await sequelize.query(`
      SELECT id FROM tenants
      WHERE scheduled_deletion_at IS NOT NULL
        AND scheduled_deletion_at <= NOW()
        AND deleted_at IS NULL
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`[Jobs] Found ${tenants?.length || 0} tenants for data retention processing`);

    const results = { processed: 0, errors: [] };

    for (const tenant of tenants || []) {
      try {
        const anonymizedId = `anon_${tenant.id.substring(0, 8)}`;

        // Anonymize tenant data
        await sequelize.query(`
          UPDATE users SET name = $2, email = CONCAT($2, '@deleted.local'), password = 'DELETED'
          WHERE tenant_id = $1
        `, { bind: [tenant.id, anonymizedId] });

        await sequelize.query(`
          UPDATE clients SET name = $2, email = NULL, phone = NULL, cpf = NULL
          WHERE tenant_id = $1
        `, { bind: [tenant.id, anonymizedId] });

        await sequelize.query(`
          UPDATE tenants SET deleted_at = NOW(), name = $2, email = CONCAT($2, '@deleted.local')
          WHERE id = $1
        `, { bind: [tenant.id, anonymizedId] });

        // Log completion
        await sequelize.query(`
          INSERT INTO data_retention_logs (id, tenant_id, action, details, completed_at, created_at)
          VALUES (gen_random_uuid(), $1, 'data_anonymized', $2, NOW(), NOW())
        `, { bind: [tenant.id, JSON.stringify({ anonymizedId })] });

        results.processed++;
      } catch (error) {
        results.errors.push({ tenantId: tenant.id, error: error.message });
      }
    }

    return results;
  }

  _getCurrentPeriodKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Create job runner (for manual execution or simple cron)
 */
function createJobRunner(models, services, notificationService = null) {
  const processors = new BillingJobProcessors(models, services, notificationService);

  return {
    definitions: JOB_DEFINITIONS,
    
    async runJob(jobName) {
      console.log(`Running job: ${jobName}`);
      const startTime = Date.now();

      let result;
      switch (jobName) {
        case JOB_DEFINITIONS.CHECK_TRIAL_EXPIRATION.name:
          result = await processors.processTrialExpiration();
          break;
        case JOB_DEFINITIONS.CHECK_SUBSCRIPTION_EXPIRATION.name:
          result = await processors.processSubscriptionExpiration();
          break;
        case JOB_DEFINITIONS.SEND_RENEWAL_REMINDERS.name:
          result = await processors.processRenewalReminders();
          break;
        case JOB_DEFINITIONS.AUTO_SUSPEND.name:
          result = await processors.processAutoSuspension();
          break;
        case JOB_DEFINITIONS.PROCESS_OVERDUE_INVOICES.name:
          result = await processors.processOverdueInvoices();
          break;
        case JOB_DEFINITIONS.CLEANUP_EXPIRED_PIX.name:
          result = await processors.processExpiredPixCharges();
          break;
        case JOB_DEFINITIONS.RESET_MONTHLY_USAGE.name:
          result = await processors.processMonthlyUsageReset();
          break;
        case JOB_DEFINITIONS.RETRY_FAILED_WEBHOOKS.name:
          result = await processors.processWebhookRetry();
          break;
        case JOB_DEFINITIONS.CLEANUP_OLD_DATA.name:
          result = await processors.processDataCleanup();
          break;
        case JOB_DEFINITIONS.APPLY_DATA_RETENTION.name:
          result = await processors.processDataRetention();
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }

      const duration = Date.now() - startTime;
      console.log(`Job ${jobName} completed in ${duration}ms`, result);

      return { jobName, duration, result };
    },

    async runAllJobs() {
      const results = [];
      for (const job of Object.values(JOB_DEFINITIONS)) {
        try {
          const result = await this.runJob(job.name);
          results.push(result);
        } catch (error) {
          results.push({ jobName: job.name, error: error.message });
        }
      }
      return results;
    },
  };
}

/**
 * BullMQ Queue Setup (for future integration)
 */
const BULLMQ_CONFIG = {
  queueName: 'billing-jobs',
  
  // Job options
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 1000,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
  },

  // Worker options
  workerOptions: {
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
};

module.exports = {
  JOB_DEFINITIONS,
  BillingJobProcessors,
  createJobRunner,
  BULLMQ_CONFIG,
};
