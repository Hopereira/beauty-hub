/**
 * Subscription Service
 * Business logic for subscription management
 */

const { Op } = require('sequelize');
const {
  SUBSCRIPTION_STATUS,
  BILLING_CYCLE,
  PAYMENT_METHOD_TYPE,
  BILLING_AUDIT_ACTIONS,
  BILLING_DEFAULTS,
  TENANT_STATUS,
} = require('../../../shared/constants');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../../shared/errors');

class SubscriptionService {
  constructor(models, paymentProvider, auditService = null) {
    this.Subscription = models.Subscription;
    this.SubscriptionPlan = models.SubscriptionPlan;
    this.Tenant = models.Tenant;
    this.Invoice = models.Invoice;
    this.paymentProvider = paymentProvider;
    this.auditService = auditService;
  }

  /**
   * Get subscription by tenant ID
   */
  async getByTenantId(tenantId) {
    const subscription = await this.Subscription.findOne({
      where: { tenant_id: tenantId },
      include: [{ model: this.SubscriptionPlan, as: 'plan' }],
      order: [['created_at', 'DESC']],
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Get subscription by ID
   */
  async getById(subscriptionId) {
    const subscription = await this.Subscription.findByPk(subscriptionId, {
      include: [{ model: this.SubscriptionPlan, as: 'plan' }],
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Create a new subscription (trial)
   */
  async createTrialSubscription(tenantId, planId, options = {}) {
    const plan = await this.SubscriptionPlan.findByPk(planId);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    // Check if tenant already has subscription
    const existing = await this.Subscription.findOne({
      where: { tenant_id: tenantId },
    });

    if (existing) {
      throw new ValidationError('Tenant already has a subscription');
    }

    const trialDays = plan.trial_days || BILLING_DEFAULTS.DEFAULT_TRIAL_DAYS;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const subscription = await this.Subscription.create({
      tenant_id: tenantId,
      plan_id: planId,
      status: SUBSCRIPTION_STATUS.TRIAL,
      billing_cycle: BILLING_CYCLE.MONTHLY,
      started_at: now,
      trial_ends_at: trialEndsAt,
      current_period_start: now,
      current_period_end: trialEndsAt,
      grace_period_days: BILLING_DEFAULTS.GRACE_PERIOD_DAYS,
      plan_snapshot: plan.toJSON(),
      metadata: options.metadata || {},
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
        tenantId,
        entityType: 'subscription',
        entityId: subscription.id,
        newValues: { status: SUBSCRIPTION_STATUS.TRIAL, planId },
      });
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Activate subscription with payment
   */
  async activateSubscription(tenantId, data) {
    const { planId, billingCycle, paymentMethod, paymentData } = data;

    const subscription = await this.Subscription.findOne({
      where: { tenant_id: tenantId },
      include: [{ model: this.SubscriptionPlan, as: 'plan' }],
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const plan = planId ? await this.SubscriptionPlan.findByPk(planId) : subscription.plan;
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    const oldValues = subscription.toJSON();

    // Calculate amount
    const amount = billingCycle === BILLING_CYCLE.YEARLY
      ? parseFloat(plan.price_yearly || 0)
      : parseFloat(plan.price_monthly || plan.price || 0);

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === BILLING_CYCLE.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create gateway subscription if card payment
    let gatewayData = {};
    if (paymentMethod === PAYMENT_METHOD_TYPE.CARD && this.paymentProvider) {
      const tenant = await this.Tenant.findByPk(tenantId);
      
      // Create/get customer
      let customerId = subscription.gateway_customer_id;
      if (!customerId) {
        const customer = await this.paymentProvider.createCustomer({
          email: tenant.owner_email || tenant.email,
          name: tenant.name,
          metadata: { tenantId },
        });
        customerId = customer.customerId;
      }

      // Create subscription in gateway
      const gatewaySubscription = await this.paymentProvider.createSubscription({
        customerId,
        planId: plan.id,
        priceId: plan.stripe_price_id,
        billingCycle,
        paymentMethod,
        paymentMethodData: paymentData,
        metadata: { tenantId, subscriptionId: subscription.id },
      });

      gatewayData = {
        gateway_provider: this.paymentProvider.getProviderName(),
        gateway_customer_id: customerId,
        gateway_subscription_id: gatewaySubscription.subscriptionId,
      };
    }

    // Update subscription
    await subscription.update({
      plan_id: plan.id,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      billing_cycle: billingCycle,
      payment_method: paymentMethod,
      amount,
      current_period_start: now,
      current_period_end: periodEnd,
      next_billing_at: periodEnd,
      last_payment_at: now,
      trial_ends_at: null,
      plan_snapshot: plan.toJSON(),
      ...gatewayData,
    });

    // Update tenant status
    await this.Tenant.update(
      { status: TENANT_STATUS.ACTIVE },
      { where: { id: tenantId } }
    );

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.SUBSCRIPTION_ACTIVATED,
        tenantId,
        entityType: 'subscription',
        entityId: subscription.id,
        oldValues,
        newValues: subscription.toJSON(),
      });
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Process PIX payment activation
   */
  async createPixPayment(tenantId, data) {
    const { planId, billingCycle } = data;

    const subscription = await this.Subscription.findOne({
      where: { tenant_id: tenantId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const plan = await this.SubscriptionPlan.findByPk(planId || subscription.plan_id);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    // Calculate amount
    const amount = billingCycle === BILLING_CYCLE.YEARLY
      ? Math.round(parseFloat(plan.price_yearly || 0) * 100)
      : Math.round(parseFloat(plan.price_monthly || plan.price || 0) * 100);

    const tenant = await this.Tenant.findByPk(tenantId);

    // Create PIX charge
    let customerId = subscription.gateway_customer_id;
    if (!customerId && this.paymentProvider) {
      const customer = await this.paymentProvider.createCustomer({
        email: tenant.owner_email || tenant.email,
        name: tenant.name,
        metadata: { tenantId },
      });
      customerId = customer.customerId;
      
      await subscription.update({ gateway_customer_id: customerId });
    }

    const expiresAt = new Date(Date.now() + BILLING_DEFAULTS.PIX_EXPIRATION_HOURS * 60 * 60 * 1000);

    const pixCharge = await this.paymentProvider.createPixCharge({
      customerId,
      amount,
      description: `${plan.name} - ${billingCycle === BILLING_CYCLE.YEARLY ? 'Anual' : 'Mensal'}`,
      expiresAt,
      metadata: {
        tenantId,
        subscriptionId: subscription.id,
        planId: plan.id,
        billingCycle,
      },
    });

    // Create pending invoice
    const invoice = await this.Invoice.create({
      tenant_id: tenantId,
      subscription_id: subscription.id,
      number: this._generateInvoiceNumber(),
      status: 'pending',
      subtotal: amount / 100,
      total: amount / 100,
      amount_due: amount / 100,
      currency: 'BRL',
      billing_cycle: billingCycle,
      payment_method: PAYMENT_METHOD_TYPE.PIX,
      issue_date: new Date(),
      due_date: expiresAt,
      gateway_provider: this.paymentProvider.getProviderName(),
      gateway_invoice_id: pixCharge.chargeId,
      pix_qr_code: pixCharge.qrCode,
      pix_qr_code_base64: pixCharge.qrCodeBase64,
      pix_expiration: expiresAt,
      items: [{
        description: `Assinatura ${plan.name}`,
        quantity: 1,
        unit_price: amount / 100,
        amount: amount / 100,
      }],
    });

    return {
      invoiceId: invoice.id,
      chargeId: pixCharge.chargeId,
      qrCode: pixCharge.qrCode,
      qrCodeBase64: pixCharge.qrCodeBase64,
      copyPaste: pixCharge.copyPaste,
      expiresAt,
      amount: amount / 100,
    };
  }

  /**
   * Confirm PIX payment (called by webhook or manually)
   */
  async confirmPixPayment(chargeId, paymentData = {}) {
    const invoice = await this.Invoice.findOne({
      where: { gateway_invoice_id: chargeId },
      include: [{ model: this.Subscription, as: 'subscription' }],
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found for this charge');
    }

    const subscription = invoice.subscription;
    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const oldValues = subscription.toJSON();

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (invoice.billing_cycle === BILLING_CYCLE.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update invoice
    await invoice.update({
      status: 'paid',
      paid_at: now,
      amount_paid: invoice.total,
      amount_due: 0,
      gateway_payment_id: paymentData.paymentId,
    });

    // Update subscription
    await subscription.update({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      payment_method: PAYMENT_METHOD_TYPE.PIX,
      billing_cycle: invoice.billing_cycle,
      current_period_start: now,
      current_period_end: periodEnd,
      next_billing_at: periodEnd,
      last_payment_at: now,
      trial_ends_at: null,
      suspended_at: null,
    });

    // Update tenant status
    await this.Tenant.update(
      { status: TENANT_STATUS.ACTIVE },
      { where: { id: subscription.tenant_id } }
    );

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.PAYMENT_RECEIVED,
        tenantId: subscription.tenant_id,
        entityType: 'subscription',
        entityId: subscription.id,
        oldValues,
        newValues: subscription.toJSON(),
        metadata: { chargeId, paymentMethod: PAYMENT_METHOD_TYPE.PIX },
      });
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  async changePlan(tenantId, newPlanId, userId = null) {
    const subscription = await this.Subscription.findOne({
      where: { tenant_id: tenantId },
      include: [{ model: this.SubscriptionPlan, as: 'plan' }],
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const currentPlan = subscription.plan;
    const newPlan = await this.SubscriptionPlan.findByPk(newPlanId);

    if (!newPlan) {
      throw new NotFoundError('New plan not found');
    }

    if (!newPlan.is_active) {
      throw new ValidationError('Cannot change to inactive plan');
    }

    const oldValues = subscription.toJSON();
    const isUpgrade = parseFloat(newPlan.price_monthly) > parseFloat(currentPlan.price_monthly);

    // Update subscription
    const amount = subscription.billing_cycle === BILLING_CYCLE.YEARLY
      ? parseFloat(newPlan.price_yearly || 0)
      : parseFloat(newPlan.price_monthly || 0);

    await subscription.update({
      plan_id: newPlanId,
      amount,
      plan_snapshot: newPlan.toJSON(),
    });

    // Update gateway subscription if exists
    if (subscription.gateway_subscription_id && this.paymentProvider) {
      await this.paymentProvider.updateSubscription(subscription.gateway_subscription_id, {
        priceId: newPlan.stripe_price_id,
        metadata: { planId: newPlanId },
      });
    }

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: isUpgrade 
          ? BILLING_AUDIT_ACTIONS.SUBSCRIPTION_UPGRADED 
          : BILLING_AUDIT_ACTIONS.SUBSCRIPTION_DOWNGRADED,
        tenantId,
        entityType: 'subscription',
        entityId: subscription.id,
        oldValues,
        newValues: subscription.toJSON(),
        userId,
        metadata: { 
          fromPlan: currentPlan.slug, 
          toPlan: newPlan.slug,
          isUpgrade,
        },
      });
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId, options = {}, userId = null) {
    const subscription = await this.Subscription.findOne({
      where: { tenant_id: tenantId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const oldValues = subscription.toJSON();

    // Cancel in gateway if exists
    if (subscription.gateway_subscription_id && this.paymentProvider) {
      await this.paymentProvider.cancelSubscription(
        subscription.gateway_subscription_id,
        { immediately: options.immediately }
      );
    }

    // Update subscription
    const updateData = {
      cancelled_at: new Date(),
    };

    if (options.immediately) {
      updateData.status = SUBSCRIPTION_STATUS.CANCELLED;
      updateData.ends_at = new Date();
    } else {
      // Cancel at period end
      updateData.ends_at = subscription.current_period_end;
    }

    await subscription.update(updateData);

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
        tenantId,
        entityType: 'subscription',
        entityId: subscription.id,
        oldValues,
        newValues: subscription.toJSON(),
        userId,
        metadata: { reason: options.reason, immediately: options.immediately },
      });
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Suspend subscription (due to non-payment)
   */
  async suspendSubscription(subscriptionId, reason = null) {
    const subscription = await this.Subscription.findByPk(subscriptionId);

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const oldValues = subscription.toJSON();

    await subscription.update({
      status: SUBSCRIPTION_STATUS.SUSPENDED,
      suspended_at: new Date(),
      metadata: {
        ...subscription.metadata,
        suspension_reason: reason,
      },
    });

    // Update tenant status
    await this.Tenant.update(
      { status: TENANT_STATUS.SUSPENDED },
      { where: { id: subscription.tenant_id } }
    );

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.SUBSCRIPTION_SUSPENDED,
        tenantId: subscription.tenant_id,
        entityType: 'subscription',
        entityId: subscription.id,
        oldValues,
        newValues: subscription.toJSON(),
        metadata: { reason },
      });
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(subscriptionId, failureData = {}) {
    const subscription = await this.Subscription.findByPk(subscriptionId);

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const oldValues = subscription.toJSON();

    await subscription.update({
      status: SUBSCRIPTION_STATUS.PAST_DUE,
      metadata: {
        ...subscription.metadata,
        last_failure: {
          date: new Date(),
          reason: failureData.reason,
        },
      },
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.PAYMENT_FAILED,
        tenantId: subscription.tenant_id,
        entityType: 'subscription',
        entityId: subscription.id,
        oldValues,
        newValues: subscription.toJSON(),
        metadata: failureData,
      });
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Renew subscription (for successful recurring payment)
   */
  async renewSubscription(subscriptionId, paymentData = {}) {
    const subscription = await this.Subscription.findByPk(subscriptionId, {
      include: [{ model: this.SubscriptionPlan, as: 'plan' }],
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const oldValues = subscription.toJSON();

    // Calculate new period
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    
    if (subscription.billing_cycle === BILLING_CYCLE.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await subscription.update({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      current_period_start: subscription.current_period_end,
      current_period_end: periodEnd,
      next_billing_at: periodEnd,
      last_payment_at: now,
      suspended_at: null,
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.SUBSCRIPTION_RENEWED,
        tenantId: subscription.tenant_id,
        entityType: 'subscription',
        entityId: subscription.id,
        oldValues,
        newValues: subscription.toJSON(),
        metadata: paymentData,
      });
    }

    return this._formatSubscriptionResponse(subscription);
  }

  /**
   * Check if subscription is active
   */
  async isActive(tenantId) {
    const subscription = await this.Subscription.findOne({
      where: { tenant_id: tenantId },
    });

    if (!subscription) return false;

    return [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(subscription.status);
  }

  /**
   * Get subscriptions for MASTER admin
   */
  async getAllSubscriptions(filters = {}) {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.planId) {
      where.plan_id = filters.planId;
    }

    if (filters.billingCycle) {
      where.billing_cycle = filters.billingCycle;
    }

    const subscriptions = await this.Subscription.findAll({
      where,
      include: [
        { model: this.SubscriptionPlan, as: 'plan' },
        { model: this.Tenant, as: 'tenant', attributes: ['id', 'name', 'slug'] },
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    });

    return subscriptions.map(s => this._formatSubscriptionResponse(s, true));
  }

  /**
   * Get MRR (Monthly Recurring Revenue)
   */
  async getMRR() {
    const activeSubscriptions = await this.Subscription.findAll({
      where: {
        status: [SUBSCRIPTION_STATUS.ACTIVE],
      },
      include: [{ model: this.SubscriptionPlan, as: 'plan' }],
    });

    let mrr = 0;

    for (const sub of activeSubscriptions) {
      if (sub.billing_cycle === BILLING_CYCLE.YEARLY) {
        // Convert yearly to monthly
        mrr += parseFloat(sub.amount || sub.plan.price_yearly || 0) / 12;
      } else {
        mrr += parseFloat(sub.amount || sub.plan.price_monthly || sub.plan.price || 0);
      }
    }

    return {
      mrr: Math.round(mrr * 100) / 100,
      currency: 'BRL',
      activeSubscriptions: activeSubscriptions.length,
    };
  }

  /**
   * Get revenue summary
   */
  async getRevenueSummary(startDate, endDate) {
    const invoices = await this.Invoice.findAll({
      where: {
        status: 'paid',
        paid_at: {
          [Op.between]: [startDate, endDate],
        },
      },
    });

    const summary = {
      totalRevenue: 0,
      invoiceCount: invoices.length,
      byBillingCycle: {
        monthly: 0,
        yearly: 0,
      },
      byPaymentMethod: {
        card: 0,
        pix: 0,
      },
    };

    for (const invoice of invoices) {
      summary.totalRevenue += parseFloat(invoice.total);
      
      if (invoice.billing_cycle === BILLING_CYCLE.YEARLY) {
        summary.byBillingCycle.yearly += parseFloat(invoice.total);
      } else {
        summary.byBillingCycle.monthly += parseFloat(invoice.total);
      }

      if (invoice.payment_method === PAYMENT_METHOD_TYPE.PIX) {
        summary.byPaymentMethod.pix += parseFloat(invoice.total);
      } else {
        summary.byPaymentMethod.card += parseFloat(invoice.total);
      }
    }

    return summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  _formatSubscriptionResponse(subscription, includeInternal = false) {
    const plan = subscription.plan || subscription.plan_snapshot;

    const response = {
      id: subscription.id,
      tenantId: subscription.tenant_id,
      status: subscription.status,
      billingCycle: subscription.billing_cycle,
      paymentMethod: subscription.payment_method,
      amount: parseFloat(subscription.amount || 0),
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
      } : null,
      dates: {
        startedAt: subscription.started_at,
        trialEndsAt: subscription.trial_ends_at,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        nextBillingAt: subscription.next_billing_at,
        cancelledAt: subscription.cancelled_at,
        endsAt: subscription.ends_at,
        suspendedAt: subscription.suspended_at,
      },
      isActive: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(subscription.status),
      isTrial: subscription.status === SUBSCRIPTION_STATUS.TRIAL,
      daysRemaining: this._calculateDaysRemaining(subscription),
    };

    if (includeInternal) {
      response.gatewayProvider = subscription.gateway_provider;
      response.gatewaySubscriptionId = subscription.gateway_subscription_id;
      response.gatewayCustomerId = subscription.gateway_customer_id;
      response.gracePeriodDays = subscription.grace_period_days;
      response.lastPaymentAt = subscription.last_payment_at;
      response.metadata = subscription.metadata;
      response.createdAt = subscription.created_at;
      response.updatedAt = subscription.updated_at;
      
      if (subscription.tenant) {
        response.tenant = {
          id: subscription.tenant.id,
          name: subscription.tenant.name,
          slug: subscription.tenant.slug,
        };
      }
    }

    return response;
  }

  _calculateDaysRemaining(subscription) {
    const endDate = subscription.ends_at || 
                    subscription.trial_ends_at || 
                    subscription.current_period_end;
    
    if (!endDate) return null;

    const diff = new Date(endDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  _generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${year}${month}-${random}`;
  }
}

module.exports = SubscriptionService;
