/**
 * Mock Billing Controller
 * Endpoints for testing billing flows in development
 * ONLY available when PAYMENT_PROVIDER=mock
 */

const { Op } = require('sequelize');
const {
  SUBSCRIPTION_STATUS,
  TENANT_STATUS,
  BILLING_CYCLE,
  PAYMENT_METHOD_TYPE,
} = require('../../../shared/constants');

class MockBillingController {
  constructor(models, subscriptionService, paymentProvider) {
    this.Subscription = models.Subscription;
    this.SubscriptionPlan = models.SubscriptionPlan;
    this.Invoice = models.Invoice;
    this.Tenant = models.Tenant;
    this.subscriptionService = subscriptionService;
    this.paymentProvider = paymentProvider;

    // Bind methods
    this.triggerEvent = this.triggerEvent.bind(this);
    this.listEvents = this.listEvents.bind(this);
    this.simulateTrialExpiration = this.simulateTrialExpiration.bind(this);
    this.simulateGracePeriodExpiration = this.simulateGracePeriodExpiration.bind(this);
    this.getSubscriptionStatus = this.getSubscriptionStatus.bind(this);
    this.resetSubscription = this.resetSubscription.bind(this);
    this.runBillingJob = this.runBillingJob.bind(this);
  }

  /**
   * GET /api/billing/mock/events
   * List all supported mock events
   */
  async listEvents(req, res) {
    const MockPaymentProvider = require('../providers/mock.provider');
    
    res.json({
      success: true,
      data: {
        events: MockPaymentProvider.getSupportedEvents(),
        description: {
          payment_success: 'Simulates successful payment, activates subscription',
          payment_failed: 'Simulates failed payment, sets subscription to past_due',
          subscription_expired: 'Expires the subscription immediately',
          invoice_overdue: 'Creates overdue invoice and sets past_due status',
          trial_expired: 'Simulates trial expiration, requires payment',
          subscription_suspended: 'Suspends subscription (blocked access)',
          pix_received: 'Simulates PIX payment confirmation',
          subscription_renewed: 'Simulates successful subscription renewal',
        },
      },
    });
  }

  /**
   * POST /api/billing/mock/trigger
   * Trigger a mock billing event
   * Body: { event: string, tenantId?: string, subscriptionId?: string, data?: object }
   */
  async triggerEvent(req, res) {
    const { event, tenantId, subscriptionId, data = {} } = req.body;

    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'Event type is required',
      });
    }

    // Find subscription
    let subscription;
    if (subscriptionId) {
      subscription = await this.Subscription.findByPk(subscriptionId);
    } else if (tenantId) {
      subscription = await this.Subscription.findOne({
        where: { tenant_id: tenantId },
      });
    }

    if (!subscription && event !== 'list_subscriptions') {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found. Provide tenantId or subscriptionId.',
      });
    }

    let result;
    const oldStatus = subscription?.status;

    try {
      switch (event) {
        case 'payment_success':
          result = await this._handlePaymentSuccess(subscription, data);
          break;

        case 'payment_failed':
          result = await this._handlePaymentFailed(subscription, data);
          break;

        case 'subscription_expired':
          result = await this._handleSubscriptionExpired(subscription, data);
          break;

        case 'invoice_overdue':
          result = await this._handleInvoiceOverdue(subscription, data);
          break;

        case 'trial_expired':
          result = await this._handleTrialExpired(subscription, data);
          break;

        case 'subscription_suspended':
          result = await this._handleSubscriptionSuspended(subscription, data);
          break;

        case 'pix_received':
          result = await this._handlePixReceived(subscription, data);
          break;

        case 'subscription_renewed':
          result = await this._handleSubscriptionRenewed(subscription, data);
          break;

        default:
          return res.status(400).json({
            success: false,
            message: `Unknown event: ${event}`,
            supportedEvents: require('../providers/mock.provider').getSupportedEvents(),
          });
      }

      // Reload subscription
      await subscription.reload();

      res.json({
        success: true,
        message: `Event '${event}' processed successfully`,
        data: {
          event,
          subscriptionId: subscription.id,
          tenantId: subscription.tenant_id,
          statusTransition: {
            from: oldStatus,
            to: subscription.status,
          },
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            trialEndsAt: subscription.trial_ends_at,
            suspendedAt: subscription.suspended_at,
          },
          additionalData: result,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: { code: 'MOCK_EVENT_ERROR', details: error.stack },
      });
    }
  }

  /**
   * POST /api/billing/mock/simulate/trial-expiration
   * Simulate trial expiration for a tenant
   */
  async simulateTrialExpiration(req, res) {
    const { tenantId, subscriptionId } = req.body;

    let subscription;
    if (subscriptionId) {
      subscription = await this.Subscription.findByPk(subscriptionId);
    } else if (tenantId) {
      subscription = await this.Subscription.findOne({
        where: { tenant_id: tenantId },
      });
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    if (subscription.status !== SUBSCRIPTION_STATUS.TRIAL) {
      return res.status(400).json({
        success: false,
        message: `Subscription is not in trial. Current status: ${subscription.status}`,
      });
    }

    const oldStatus = subscription.status;

    // Set trial_ends_at to past
    const expiredDate = new Date(Date.now() - 1000);
    await subscription.update({
      trial_ends_at: expiredDate,
      current_period_end: expiredDate,
      status: SUBSCRIPTION_STATUS.EXPIRED,
    });

    // Update tenant status
    await this.Tenant.update(
      { status: TENANT_STATUS.SUSPENDED },
      { where: { id: subscription.tenant_id } }
    );

    res.json({
      success: true,
      message: 'Trial expiration simulated',
      data: {
        subscriptionId: subscription.id,
        tenantId: subscription.tenant_id,
        statusTransition: {
          from: oldStatus,
          to: SUBSCRIPTION_STATUS.EXPIRED,
        },
        trialEndsAt: expiredDate,
        note: 'Tenant is now blocked. Use payment_success to reactivate.',
      },
    });
  }

  /**
   * POST /api/billing/mock/simulate/grace-period-expiration
   * Simulate grace period expiration (past_due -> suspended)
   */
  async simulateGracePeriodExpiration(req, res) {
    const { tenantId, subscriptionId } = req.body;

    let subscription;
    if (subscriptionId) {
      subscription = await this.Subscription.findByPk(subscriptionId);
    } else if (tenantId) {
      subscription = await this.Subscription.findOne({
        where: { tenant_id: tenantId },
      });
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    const oldStatus = subscription.status;

    // Set to past_due first, then suspend
    await subscription.update({
      status: SUBSCRIPTION_STATUS.SUSPENDED,
      suspended_at: new Date(),
      metadata: {
        ...subscription.metadata,
        suspension_reason: 'grace_period_expired',
        simulated: true,
      },
    });

    // Update tenant status
    await this.Tenant.update(
      { status: TENANT_STATUS.SUSPENDED },
      { where: { id: subscription.tenant_id } }
    );

    res.json({
      success: true,
      message: 'Grace period expiration simulated',
      data: {
        subscriptionId: subscription.id,
        tenantId: subscription.tenant_id,
        statusTransition: {
          from: oldStatus,
          to: SUBSCRIPTION_STATUS.SUSPENDED,
        },
        suspendedAt: subscription.suspended_at,
        note: 'Tenant is now SUSPENDED. All API calls should be blocked.',
      },
    });
  }

  /**
   * GET /api/billing/mock/subscription/:tenantId
   * Get detailed subscription status for testing
   */
  async getSubscriptionStatus(req, res) {
    const { tenantId } = req.params;

    let subscription = null;
    let tenant = null;

    // Try to find tenant by slug first (most common case)
    tenant = await this.Tenant.findOne({
      where: { slug: tenantId },
    });

    if (tenant) {
      subscription = await this.Subscription.findOne({
        where: { tenant_id: tenant.id },
      });
    } else {
      // Try as UUID (if it looks like a valid UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(tenantId)) {
        subscription = await this.Subscription.findOne({
          where: { tenant_id: tenantId },
        });
        if (subscription) {
          tenant = await this.Tenant.findByPk(subscription.tenant_id);
        }
      }
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found. Use tenant slug (e.g., beleza-pura) or tenant UUID.',
      });
    }

    // Get plan separately (no association needed)
    const plan = subscription.plan_id 
      ? await this.SubscriptionPlan.findByPk(subscription.plan_id)
      : null;
    const invoices = await this.Invoice.findAll({
      where: { subscription_id: subscription.id },
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    // Calculate status details
    const now = new Date();
    const isTrialExpired = subscription.trial_ends_at && new Date(subscription.trial_ends_at) < now;
    const isPeriodExpired = subscription.current_period_end && new Date(subscription.current_period_end) < now;
    const gracePeriodEndsAt = subscription.current_period_end 
      ? new Date(new Date(subscription.current_period_end).getTime() + (subscription.grace_period_days || 7) * 24 * 60 * 60 * 1000)
      : null;
    const isGracePeriodExpired = gracePeriodEndsAt && gracePeriodEndsAt < now;

    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          billingCycle: subscription.billing_cycle,
          paymentMethod: subscription.payment_method,
          amount: subscription.amount,
          plan: plan ? {
            id: plan.id,
            name: plan.name,
            slug: plan.slug,
          } : null,
        },
        dates: {
          startedAt: subscription.started_at,
          trialEndsAt: subscription.trial_ends_at,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          nextBillingAt: subscription.next_billing_at,
          suspendedAt: subscription.suspended_at,
          cancelledAt: subscription.cancelled_at,
        },
        statusChecks: {
          isTrialExpired,
          isPeriodExpired,
          isGracePeriodExpired,
          gracePeriodEndsAt,
          shouldBlock: [SUBSCRIPTION_STATUS.SUSPENDED, SUBSCRIPTION_STATUS.CANCELLED, SUBSCRIPTION_STATUS.EXPIRED].includes(subscription.status),
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
        } : null,
        recentInvoices: invoices.map(inv => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          total: inv.total,
          dueDate: inv.due_date,
          paidAt: inv.paid_at,
        })),
        gateway: {
          provider: subscription.gateway_provider,
          customerId: subscription.gateway_customer_id,
          subscriptionId: subscription.gateway_subscription_id,
        },
      },
    });
  }

  /**
   * POST /api/billing/mock/reset/:tenantId
   * Reset subscription to initial trial state
   */
  async resetSubscription(req, res) {
    const { tenantId } = req.params;
    const { planSlug = 'starter', trialDays = 30 } = req.body;

    const subscription = await this.Subscription.findOne({
      where: { tenant_id: tenantId },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    const plan = await this.SubscriptionPlan.findOne({
      where: { slug: planSlug },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: `Plan '${planSlug}' not found`,
      });
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    await subscription.update({
      plan_id: plan.id,
      status: SUBSCRIPTION_STATUS.TRIAL,
      billing_cycle: BILLING_CYCLE.MONTHLY,
      payment_method: null,
      amount: 0,
      started_at: now,
      trial_ends_at: trialEndsAt,
      current_period_start: now,
      current_period_end: trialEndsAt,
      next_billing_at: null,
      last_payment_at: null,
      suspended_at: null,
      cancelled_at: null,
      ends_at: null,
      gateway_subscription_id: null,
      plan_snapshot: plan.toJSON(),
      metadata: { reset_at: now.toISOString() },
    });

    // Reset tenant status
    await this.Tenant.update(
      { status: TENANT_STATUS.ACTIVE },
      { where: { id: tenantId } }
    );

    res.json({
      success: true,
      message: 'Subscription reset to trial',
      data: {
        subscriptionId: subscription.id,
        tenantId,
        status: SUBSCRIPTION_STATUS.TRIAL,
        plan: plan.name,
        trialEndsAt,
        trialDays,
      },
    });
  }

  /**
   * POST /api/billing/mock/job/:jobName
   * Manually run a billing job for testing
   */
  async runBillingJob(req, res) {
    const { jobName } = req.params;
    const { dryRun = false } = req.body;

    const supportedJobs = [
      'check_trial_expirations',
      'check_subscription_expirations',
      'auto_suspend_subscriptions',
      'send_renewal_reminders',
    ];

    if (!supportedJobs.includes(jobName)) {
      return res.status(400).json({
        success: false,
        message: `Unknown job: ${jobName}`,
        supportedJobs,
      });
    }

    const results = { affected: [], dryRun };

    try {
      switch (jobName) {
        case 'check_trial_expirations': {
          const expired = await this.Subscription.findAll({
            where: {
              status: SUBSCRIPTION_STATUS.TRIAL,
              trial_ends_at: { [Op.lt]: new Date() },
            },
          });

          for (const sub of expired) {
            if (!dryRun) {
              await sub.update({ status: SUBSCRIPTION_STATUS.EXPIRED });
              await this.Tenant.update(
                { status: TENANT_STATUS.SUSPENDED },
                { where: { id: sub.tenant_id } }
              );
            }
            results.affected.push({
              subscriptionId: sub.id,
              tenantId: sub.tenant_id,
              action: 'expired_trial',
            });
          }
          break;
        }

        case 'check_subscription_expirations': {
          const expired = await this.Subscription.findAll({
            where: {
              status: SUBSCRIPTION_STATUS.ACTIVE,
              current_period_end: { [Op.lt]: new Date() },
            },
          });

          for (const sub of expired) {
            if (!dryRun) {
              await sub.update({ status: SUBSCRIPTION_STATUS.PAST_DUE });
            }
            results.affected.push({
              subscriptionId: sub.id,
              tenantId: sub.tenant_id,
              action: 'set_past_due',
            });
          }
          break;
        }

        case 'auto_suspend_subscriptions': {
          const gracePeriodDays = 7;
          const suspendAfter = new Date(Date.now() - gracePeriodDays * 24 * 60 * 60 * 1000);

          const toSuspend = await this.Subscription.findAll({
            where: {
              status: SUBSCRIPTION_STATUS.PAST_DUE,
              current_period_end: { [Op.lt]: suspendAfter },
            },
          });

          for (const sub of toSuspend) {
            if (!dryRun) {
              await sub.update({
                status: SUBSCRIPTION_STATUS.SUSPENDED,
                suspended_at: new Date(),
              });
              await this.Tenant.update(
                { status: TENANT_STATUS.SUSPENDED },
                { where: { id: sub.tenant_id } }
              );
            }
            results.affected.push({
              subscriptionId: sub.id,
              tenantId: sub.tenant_id,
              action: 'suspended',
            });
          }
          break;
        }

        case 'send_renewal_reminders': {
          const reminderDays = 3;
          const reminderDate = new Date(Date.now() + reminderDays * 24 * 60 * 60 * 1000);

          const upcoming = await this.Subscription.findAll({
            where: {
              status: SUBSCRIPTION_STATUS.ACTIVE,
              current_period_end: {
                [Op.between]: [new Date(), reminderDate],
              },
            },
          });

          for (const sub of upcoming) {
            results.affected.push({
              subscriptionId: sub.id,
              tenantId: sub.tenant_id,
              action: 'would_send_reminder',
              renewsAt: sub.current_period_end,
            });
          }
          break;
        }
      }

      res.json({
        success: true,
        message: `Job '${jobName}' ${dryRun ? 'simulated' : 'executed'}`,
        data: {
          job: jobName,
          dryRun,
          affectedCount: results.affected.length,
          affected: results.affected,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        error: { code: 'JOB_ERROR', details: error.stack },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  async _handlePaymentSuccess(subscription, data) {
    const billingCycle = data.billingCycle || subscription.billing_cycle || BILLING_CYCLE.MONTHLY;
    
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === BILLING_CYCLE.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await subscription.update({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      billing_cycle: billingCycle,
      payment_method: data.paymentMethod || PAYMENT_METHOD_TYPE.CARD,
      current_period_start: now,
      current_period_end: periodEnd,
      next_billing_at: periodEnd,
      last_payment_at: now,
      trial_ends_at: null,
      suspended_at: null,
    });

    await this.Tenant.update(
      { status: TENANT_STATUS.ACTIVE },
      { where: { id: subscription.tenant_id } }
    );

    return { periodEnd, billingCycle };
  }

  async _handlePaymentFailed(subscription, data) {
    await subscription.update({
      status: SUBSCRIPTION_STATUS.PAST_DUE,
      metadata: {
        ...subscription.metadata,
        last_failure: {
          date: new Date().toISOString(),
          reason: data.reason || 'card_declined',
        },
      },
    });

    return { reason: data.reason || 'card_declined' };
  }

  async _handleSubscriptionExpired(subscription, data) {
    await subscription.update({
      status: SUBSCRIPTION_STATUS.EXPIRED,
      ends_at: new Date(),
    });

    await this.Tenant.update(
      { status: TENANT_STATUS.SUSPENDED },
      { where: { id: subscription.tenant_id } }
    );

    return { expiredAt: new Date() };
  }

  async _handleInvoiceOverdue(subscription, data) {
    // Create overdue invoice
    const invoice = await this.Invoice.create({
      tenant_id: subscription.tenant_id,
      subscription_id: subscription.id,
      number: `INV-MOCK-${Date.now()}`,
      status: 'overdue',
      subtotal: data.amount || subscription.amount || 59.90,
      total: data.amount || subscription.amount || 59.90,
      amount_due: data.amount || subscription.amount || 59.90,
      currency: 'BRL',
      billing_cycle: subscription.billing_cycle,
      payment_method: subscription.payment_method,
      issue_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });

    await subscription.update({
      status: SUBSCRIPTION_STATUS.PAST_DUE,
    });

    return { invoiceId: invoice.id, invoiceNumber: invoice.number };
  }

  async _handleTrialExpired(subscription, data) {
    await subscription.update({
      status: SUBSCRIPTION_STATUS.EXPIRED,
      trial_ends_at: new Date(Date.now() - 1000),
      current_period_end: new Date(Date.now() - 1000),
    });

    await this.Tenant.update(
      { status: TENANT_STATUS.SUSPENDED },
      { where: { id: subscription.tenant_id } }
    );

    return { message: 'Trial expired, payment required to continue' };
  }

  async _handleSubscriptionSuspended(subscription, data) {
    await subscription.update({
      status: SUBSCRIPTION_STATUS.SUSPENDED,
      suspended_at: new Date(),
      metadata: {
        ...subscription.metadata,
        suspension_reason: data.reason || 'non_payment',
      },
    });

    await this.Tenant.update(
      { status: TENANT_STATUS.SUSPENDED },
      { where: { id: subscription.tenant_id } }
    );

    return { reason: data.reason || 'non_payment' };
  }

  async _handlePixReceived(subscription, data) {
    // Find pending PIX invoice
    const invoice = await this.Invoice.findOne({
      where: {
        subscription_id: subscription.id,
        payment_method: PAYMENT_METHOD_TYPE.PIX,
        status: 'pending',
      },
      order: [['created_at', 'DESC']],
    });

    if (invoice) {
      await invoice.update({
        status: 'paid',
        paid_at: new Date(),
        amount_paid: invoice.total,
        amount_due: 0,
      });
    }

    const billingCycle = invoice?.billing_cycle || subscription.billing_cycle || BILLING_CYCLE.MONTHLY;
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === BILLING_CYCLE.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await subscription.update({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      payment_method: PAYMENT_METHOD_TYPE.PIX,
      billing_cycle: billingCycle,
      current_period_start: now,
      current_period_end: periodEnd,
      next_billing_at: periodEnd,
      last_payment_at: now,
      trial_ends_at: null,
      suspended_at: null,
    });

    await this.Tenant.update(
      { status: TENANT_STATUS.ACTIVE },
      { where: { id: subscription.tenant_id } }
    );

    return { invoiceId: invoice?.id, periodEnd };
  }

  async _handleSubscriptionRenewed(subscription, data) {
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end || now);
    
    if (subscription.billing_cycle === BILLING_CYCLE.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await subscription.update({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      current_period_start: subscription.current_period_end || now,
      current_period_end: periodEnd,
      next_billing_at: periodEnd,
      last_payment_at: now,
      suspended_at: null,
    });

    return { periodEnd };
  }
}

module.exports = MockBillingController;
