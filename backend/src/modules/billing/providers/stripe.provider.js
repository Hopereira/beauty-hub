/**
 * Stripe Payment Provider
 * Implements PaymentProviderInterface for Stripe
 */

const PaymentProviderInterface = require('./paymentProvider.interface');

class StripePaymentProvider extends PaymentProviderInterface {
  constructor(config = {}) {
    super();
    
    const apiKey = config.secretKey || process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('Stripe API key is required');
    }
    
    this.stripe = require('stripe')(apiKey, {
      apiVersion: config.apiVersion || '2023-10-16',
    });
    
    this.webhookSecret = config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  }

  getProviderName() {
    return 'stripe';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createCustomer(data) {
    const customer = await this.stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        document: data.document,
        ...data.metadata,
      },
    });
    
    return {
      customerId: customer.id,
      raw: customer,
    };
  }

  async updateCustomer(customerId, data) {
    const customer = await this.stripe.customers.update(customerId, {
      email: data.email,
      name: data.name,
      metadata: data.metadata,
    });
    
    return {
      customerId: customer.id,
      raw: customer,
    };
  }

  async deleteCustomer(customerId) {
    const deleted = await this.stripe.customers.del(customerId);
    return deleted.deleted;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createSubscription(data) {
    const subscriptionData = {
      customer: data.customerId,
      items: [{ price: data.priceId }],
      metadata: {
        planId: data.planId,
        billingCycle: data.billingCycle,
        ...data.metadata,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    };

    if (data.paymentMethodData?.paymentMethodId) {
      subscriptionData.default_payment_method = data.paymentMethodData.paymentMethodId;
    }

    if (data.trialDays) {
      subscriptionData.trial_period_days = data.trialDays;
    }

    const subscription = await this.stripe.subscriptions.create(subscriptionData);
    
    return {
      subscriptionId: subscription.id,
      status: this._mapSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      raw: subscription,
    };
  }

  async updateSubscription(subscriptionId, data) {
    const updateData = {};
    
    if (data.priceId) {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      updateData.items = [{
        id: subscription.items.data[0].id,
        price: data.priceId,
      }];
    }
    
    if (data.paymentMethodId) {
      updateData.default_payment_method = data.paymentMethodId;
    }
    
    if (data.metadata) {
      updateData.metadata = data.metadata;
    }

    const subscription = await this.stripe.subscriptions.update(subscriptionId, updateData);
    
    return {
      subscriptionId: subscription.id,
      status: this._mapSubscriptionStatus(subscription.status),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      raw: subscription,
    };
  }

  async cancelSubscription(subscriptionId, options = {}) {
    let subscription;
    
    if (options.immediately) {
      subscription = await this.stripe.subscriptions.cancel(subscriptionId);
    } else {
      subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
    
    return {
      subscriptionId: subscription.id,
      status: this._mapSubscriptionStatus(subscription.status),
      cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      raw: subscription,
    };
  }

  async reactivateSubscription(subscriptionId) {
    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    
    return {
      subscriptionId: subscription.id,
      status: this._mapSubscriptionStatus(subscription.status),
      raw: subscription,
    };
  }

  async getSubscription(subscriptionId) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    
    return {
      subscriptionId: subscription.id,
      status: this._mapSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      raw: subscription,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createCheckoutSession(data) {
    const session = await this.stripe.checkout.sessions.create({
      customer: data.customerId,
      mode: 'subscription',
      line_items: [{
        price: data.priceId,
        quantity: 1,
      }],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: data.metadata,
      subscription_data: {
        metadata: {
          billingCycle: data.billingCycle,
          ...data.metadata,
        },
      },
    });
    
    return {
      sessionId: session.id,
      url: session.url,
      raw: session,
    };
  }

  async createPixCharge(data) {
    // Stripe doesn't natively support PIX
    // This would require Stripe + PIX integration via payment intents
    // For Brazil, consider using payment_method_types: ['pix']
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: data.amount,
      currency: 'brl',
      customer: data.customerId,
      payment_method_types: ['pix'],
      metadata: data.metadata,
    });

    // Note: PIX QR code generation requires confirming the payment intent
    // and extracting from payment_intent.next_action.pix_display_qr_code
    
    return {
      chargeId: paymentIntent.id,
      qrCode: paymentIntent.next_action?.pix_display_qr_code?.data || '',
      qrCodeBase64: paymentIntent.next_action?.pix_display_qr_code?.image_url_png || '',
      copyPaste: paymentIntent.next_action?.pix_display_qr_code?.data || '',
      expiresAt: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      raw: paymentIntent,
    };
  }

  async getPixChargeStatus(chargeId) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(chargeId);
    
    return {
      chargeId: paymentIntent.id,
      status: paymentIntent.status,
      paidAt: paymentIntent.status === 'succeeded' 
        ? new Date(paymentIntent.created * 1000) 
        : null,
      raw: paymentIntent,
    };
  }

  async attachPaymentMethod(customerId, paymentMethodToken) {
    const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodToken, {
      customer: customerId,
    });
    
    // Set as default payment method
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });
    
    return {
      paymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
      last4: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
      raw: paymentMethod,
    };
  }

  async detachPaymentMethod(paymentMethodId) {
    const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
    return !!paymentMethod.id;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createInvoice(data) {
    // Create invoice items first
    for (const item of data.items) {
      await this.stripe.invoiceItems.create({
        customer: data.customerId,
        amount: item.amount,
        currency: item.currency || 'brl',
        description: item.description,
      });
    }
    
    const invoice = await this.stripe.invoices.create({
      customer: data.customerId,
      collection_method: 'send_invoice',
      days_until_due: Math.ceil((new Date(data.dueDate) - new Date()) / (1000 * 60 * 60 * 24)),
      metadata: data.metadata,
    });
    
    return {
      invoiceId: invoice.id,
      status: invoice.status,
      url: invoice.hosted_invoice_url,
      raw: invoice,
    };
  }

  async getInvoice(invoiceId) {
    const invoice = await this.stripe.invoices.retrieve(invoiceId);
    
    return {
      invoiceId: invoice.id,
      status: invoice.status,
      amount: invoice.amount_due,
      paidAt: invoice.status_transitions?.paid_at 
        ? new Date(invoice.status_transitions.paid_at * 1000) 
        : null,
      raw: invoice,
    };
  }

  async finalizeInvoice(invoiceId) {
    const invoice = await this.stripe.invoices.finalizeInvoice(invoiceId);
    
    return {
      invoiceId: invoice.id,
      status: invoice.status,
      raw: invoice,
    };
  }

  async markInvoiceAsPaid(invoiceId, paymentData) {
    const invoice = await this.stripe.invoices.pay(invoiceId, {
      paid_out_of_band: true,
    });
    
    return {
      invoiceId: invoice.id,
      status: 'paid',
      paidAt: new Date(),
      raw: invoice,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async refund(paymentId, options = {}) {
    const refundData = {
      payment_intent: paymentId,
    };
    
    if (options.amount) {
      refundData.amount = options.amount;
    }
    
    if (options.reason) {
      refundData.reason = options.reason;
    }
    
    const refund = await this.stripe.refunds.create(refundData);
    
    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
      raw: refund,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  verifyWebhookSignature(payload, signature) {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch (err) {
      return false;
    }
  }

  async parseWebhookEvent(payload, signature) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    );
    
    return {
      type: this.mapWebhookEventType(event.type) || event.type,
      data: event.data.object,
      raw: event,
    };
  }

  mapWebhookEventType(stripeEventType) {
    const mapping = {
      'customer.subscription.created': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_CREATED,
      'customer.subscription.updated': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED,
      'customer.subscription.deleted': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_CANCELLED,
      'invoice.paid': PaymentProviderInterface.WEBHOOK_EVENTS.INVOICE_PAID,
      'invoice.payment_failed': PaymentProviderInterface.WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED,
      'payment_intent.succeeded': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_SUCCEEDED,
      'payment_intent.payment_failed': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_FAILED,
      'charge.refunded': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_REFUNDED,
    };
    
    return mapping[stripeEventType] || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT/PRICE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async syncProduct(data) {
    let product;
    
    try {
      // Try to retrieve existing product
      product = await this.stripe.products.retrieve(data.id);
      product = await this.stripe.products.update(data.id, {
        name: data.name,
        description: data.description,
      });
    } catch (err) {
      // Create new product
      product = await this.stripe.products.create({
        id: data.id,
        name: data.name,
        description: data.description,
      });
    }
    
    return {
      productId: product.id,
      raw: product,
    };
  }

  async syncPrice(data) {
    // Stripe prices are immutable, so we always create a new one
    const price = await this.stripe.prices.create({
      product: data.productId,
      unit_amount: data.amount,
      currency: data.currency || 'brl',
      recurring: {
        interval: data.interval === 'yearly' ? 'year' : 'month',
      },
    });
    
    return {
      priceId: price.id,
      raw: price,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  _mapSubscriptionStatus(stripeStatus) {
    const mapping = {
      'active': 'active',
      'trialing': 'trial',
      'past_due': 'past_due',
      'canceled': 'cancelled',
      'unpaid': 'past_due',
      'incomplete': 'pending',
      'incomplete_expired': 'expired',
    };
    
    return mapping[stripeStatus] || stripeStatus;
  }
}

module.exports = StripePaymentProvider;
