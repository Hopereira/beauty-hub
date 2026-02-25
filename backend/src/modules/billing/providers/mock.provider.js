/**
 * Mock Payment Provider
 * Simulates payment gateway for development and testing
 */

const { v4: uuidv4 } = require('uuid');
const PaymentProviderInterface = require('./paymentProvider.interface');

class MockPaymentProvider extends PaymentProviderInterface {
  constructor() {
    super();
    this.customers = new Map();
    this.subscriptions = new Map();
    this.invoices = new Map();
    this.charges = new Map();
    this.paymentMethods = new Map();
  }

  getProviderName() {
    return 'mock';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createCustomer(data) {
    const customerId = `cus_mock_${uuidv4().substring(0, 8)}`;
    const customer = {
      id: customerId,
      email: data.email,
      name: data.name,
      document: data.document,
      metadata: data.metadata || {},
      createdAt: new Date(),
    };
    this.customers.set(customerId, customer);
    
    return {
      customerId,
      raw: customer,
    };
  }

  async updateCustomer(customerId, data) {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }
    
    Object.assign(customer, data, { updatedAt: new Date() });
    this.customers.set(customerId, customer);
    
    return {
      customerId,
      raw: customer,
    };
  }

  async deleteCustomer(customerId) {
    return this.customers.delete(customerId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createSubscription(data) {
    const subscriptionId = `sub_mock_${uuidv4().substring(0, 8)}`;
    const now = new Date();
    const periodEnd = new Date(now);
    
    if (data.billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const subscription = {
      id: subscriptionId,
      customerId: data.customerId,
      planId: data.planId,
      priceId: data.priceId,
      billingCycle: data.billingCycle,
      paymentMethod: data.paymentMethod,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      metadata: data.metadata || {},
      createdAt: now,
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    return {
      subscriptionId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      raw: subscription,
    };
  }

  async updateSubscription(subscriptionId, data) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    
    Object.assign(subscription, data, { updatedAt: new Date() });
    this.subscriptions.set(subscriptionId, subscription);
    
    return {
      subscriptionId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      raw: subscription,
    };
  }

  async cancelSubscription(subscriptionId, options = {}) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    
    const cancelledAt = new Date();
    subscription.status = options.immediately ? 'cancelled' : 'active';
    subscription.cancelledAt = cancelledAt;
    subscription.cancelAtPeriodEnd = !options.immediately;
    
    this.subscriptions.set(subscriptionId, subscription);
    
    return {
      subscriptionId,
      status: subscription.status,
      cancelledAt,
      raw: subscription,
    };
  }

  async reactivateSubscription(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    
    subscription.status = 'active';
    subscription.cancelledAt = null;
    subscription.cancelAtPeriodEnd = false;
    
    this.subscriptions.set(subscriptionId, subscription);
    
    return {
      subscriptionId,
      status: 'active',
      raw: subscription,
    };
  }

  async getSubscription(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    
    return {
      subscriptionId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      raw: subscription,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createCheckoutSession(data) {
    const sessionId = `cs_mock_${uuidv4().substring(0, 8)}`;
    
    return {
      sessionId,
      url: `https://mock-checkout.local/pay/${sessionId}?success=${encodeURIComponent(data.successUrl)}&cancel=${encodeURIComponent(data.cancelUrl)}`,
      raw: {
        id: sessionId,
        customerId: data.customerId,
        priceId: data.priceId,
        metadata: data.metadata,
      },
    };
  }

  async createPixCharge(data) {
    const chargeId = `pix_mock_${uuidv4().substring(0, 8)}`;
    const expiresAt = data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const pixCode = `00020126580014br.gov.bcb.pix0136${uuidv4()}5204000053039865406${(data.amount / 100).toFixed(2)}5802BR5913BeautyHub SaaS6009SAO PAULO62070503***6304`;
    
    const charge = {
      id: chargeId,
      customerId: data.customerId,
      amount: data.amount,
      description: data.description,
      status: 'pending',
      qrCode: pixCode,
      expiresAt,
      metadata: data.metadata || {},
      createdAt: new Date(),
    };
    
    this.charges.set(chargeId, charge);
    
    return {
      chargeId,
      qrCode: pixCode,
      qrCodeBase64: Buffer.from(pixCode).toString('base64'),
      copyPaste: pixCode,
      expiresAt,
      raw: charge,
    };
  }

  async getPixChargeStatus(chargeId) {
    const charge = this.charges.get(chargeId);
    if (!charge) {
      throw new Error(`Charge ${chargeId} not found`);
    }
    
    return {
      chargeId,
      status: charge.status,
      paidAt: charge.paidAt || null,
      raw: charge,
    };
  }

  async attachPaymentMethod(customerId, paymentMethodToken) {
    const paymentMethodId = `pm_mock_${uuidv4().substring(0, 8)}`;
    
    const paymentMethod = {
      id: paymentMethodId,
      customerId,
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2030,
      createdAt: new Date(),
    };
    
    this.paymentMethods.set(paymentMethodId, paymentMethod);
    
    return {
      paymentMethodId,
      type: 'card',
      last4: '4242',
      brand: 'visa',
      raw: paymentMethod,
    };
  }

  async detachPaymentMethod(paymentMethodId) {
    return this.paymentMethods.delete(paymentMethodId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createInvoice(data) {
    const invoiceId = `inv_mock_${uuidv4().substring(0, 8)}`;
    
    const invoice = {
      id: invoiceId,
      customerId: data.customerId,
      items: data.items,
      amount: data.items.reduce((sum, item) => sum + item.amount, 0),
      dueDate: data.dueDate,
      status: 'draft',
      metadata: data.metadata || {},
      createdAt: new Date(),
    };
    
    this.invoices.set(invoiceId, invoice);
    
    return {
      invoiceId,
      status: 'draft',
      url: `https://mock-invoice.local/view/${invoiceId}`,
      raw: invoice,
    };
  }

  async getInvoice(invoiceId) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    
    return {
      invoiceId,
      status: invoice.status,
      amount: invoice.amount,
      paidAt: invoice.paidAt || null,
      raw: invoice,
    };
  }

  async finalizeInvoice(invoiceId) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    
    invoice.status = 'pending';
    invoice.finalizedAt = new Date();
    this.invoices.set(invoiceId, invoice);
    
    return {
      invoiceId,
      status: 'pending',
      raw: invoice,
    };
  }

  async markInvoiceAsPaid(invoiceId, paymentData) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    
    const paidAt = new Date();
    invoice.status = 'paid';
    invoice.paidAt = paidAt;
    invoice.paymentData = paymentData;
    this.invoices.set(invoiceId, invoice);
    
    return {
      invoiceId,
      status: 'paid',
      paidAt,
      raw: invoice,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async refund(paymentId, options = {}) {
    const refundId = `ref_mock_${uuidv4().substring(0, 8)}`;
    
    return {
      refundId,
      status: 'completed',
      amount: options.amount || 0,
      raw: {
        id: refundId,
        paymentId,
        amount: options.amount,
        reason: options.reason,
        createdAt: new Date(),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  verifyWebhookSignature(payload, signature) {
    // Mock always returns true for testing
    return signature === 'mock_signature' || process.env.NODE_ENV === 'development';
  }

  async parseWebhookEvent(payload, signature) {
    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    return {
      type: this.mapWebhookEventType(event.type) || event.type,
      data: event.data,
      raw: event,
    };
  }

  mapWebhookEventType(gatewayEventType) {
    const mapping = {
      'mock.subscription.created': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_CREATED,
      'mock.subscription.updated': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED,
      'mock.subscription.cancelled': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_CANCELLED,
      'mock.payment.succeeded': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_SUCCEEDED,
      'mock.payment.failed': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_FAILED,
      'mock.invoice.paid': PaymentProviderInterface.WEBHOOK_EVENTS.INVOICE_PAID,
      'mock.pix.received': PaymentProviderInterface.WEBHOOK_EVENTS.PIX_RECEIVED,
    };
    
    return mapping[gatewayEventType] || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT/PRICE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async syncProduct(data) {
    const productId = `prod_mock_${data.id}`;
    
    return {
      productId,
      raw: {
        id: productId,
        name: data.name,
        description: data.description,
      },
    };
  }

  async syncPrice(data) {
    const priceId = `price_mock_${uuidv4().substring(0, 8)}`;
    
    return {
      priceId,
      raw: {
        id: priceId,
        productId: data.productId,
        amount: data.amount,
        currency: data.currency,
        interval: data.interval,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK HELPERS (for testing)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Simulate PIX payment received (for testing)
   */
  simulatePixPayment(chargeId) {
    const charge = this.charges.get(chargeId);
    if (charge) {
      charge.status = 'paid';
      charge.paidAt = new Date();
      this.charges.set(chargeId, charge);
      return true;
    }
    return false;
  }

  /**
   * Simulate subscription renewal (for testing)
   */
  simulateSubscriptionRenewal(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      const now = new Date();
      subscription.currentPeriodStart = now;
      
      if (subscription.billingCycle === 'yearly') {
        subscription.currentPeriodEnd = new Date(now.setFullYear(now.getFullYear() + 1));
      } else {
        subscription.currentPeriodEnd = new Date(now.setMonth(now.getMonth() + 1));
      }
      
      this.subscriptions.set(subscriptionId, subscription);
      return subscription;
    }
    return null;
  }

  /**
   * Simulate payment failure (for testing)
   */
  simulatePaymentFailure(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.status = 'past_due';
      this.subscriptions.set(subscriptionId, subscription);
      return subscription;
    }
    return null;
  }

  /**
   * Clear all mock data (for testing)
   */
  clearAll() {
    this.customers.clear();
    this.subscriptions.clear();
    this.invoices.clear();
    this.charges.clear();
    this.paymentMethods.clear();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK TRIGGER (for testing subscription state changes)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Supported mock events:
   * - payment_success: Simulates successful payment, activates subscription
   * - payment_failed: Simulates failed payment, sets subscription to past_due
   * - subscription_expired: Expires the subscription
   * - invoice_overdue: Creates overdue invoice scenario
   * - trial_expired: Simulates trial expiration
   * - subscription_suspended: Suspends subscription after grace period
   * - pix_received: Simulates PIX payment confirmation
   * - subscription_renewed: Simulates successful renewal
   */
  static MOCK_EVENTS = {
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    SUBSCRIPTION_EXPIRED: 'subscription_expired',
    INVOICE_OVERDUE: 'invoice_overdue',
    TRIAL_EXPIRED: 'trial_expired',
    SUBSCRIPTION_SUSPENDED: 'subscription_suspended',
    PIX_RECEIVED: 'pix_received',
    SUBSCRIPTION_RENEWED: 'subscription_renewed',
  };

  /**
   * Generate mock webhook payload
   */
  generateWebhookPayload(event, data) {
    return {
      id: `evt_mock_${uuidv4().substring(0, 8)}`,
      type: event,
      data,
      created: new Date().toISOString(),
      provider: 'mock',
    };
  }

  /**
   * Get all supported mock events
   */
  static getSupportedEvents() {
    return Object.values(MockPaymentProvider.MOCK_EVENTS);
  }
}

module.exports = MockPaymentProvider;
