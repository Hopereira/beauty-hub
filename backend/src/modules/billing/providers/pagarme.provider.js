/**
 * Pagar.me Payment Provider
 * Production-ready payment gateway integration for Brazil
 * 
 * API Documentation: https://docs.pagar.me/reference
 * Supports: Credit Card, PIX, Boleto
 */

const crypto = require('crypto');
const PaymentProviderInterface = require('./paymentProvider.interface');

class PagarmePaymentProvider extends PaymentProviderInterface {
  constructor(config = {}) {
    super();
    
    this.apiKey = config.apiKey || process.env.PAGARME_API_KEY;
    this.secretKey = config.secretKey || process.env.PAGARME_SECRET_KEY;
    this.webhookSecret = config.webhookSecret || process.env.PAGARME_WEBHOOK_SECRET;
    this.environment = config.environment || process.env.PAGARME_ENVIRONMENT || 'sandbox';
    
    // API Base URLs
    this.baseUrl = this.environment === 'production'
      ? 'https://api.pagar.me/core/v5'
      : 'https://api.pagar.me/core/v5'; // Same URL, different keys
    
    // Validate required config
    if (!this.secretKey) {
      console.warn('[Pagarme] Warning: PAGARME_SECRET_KEY not configured');
    }

    // Idempotency cache (in production, use Redis)
    this.idempotencyCache = new Map();
    this.IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  getProviderName() {
    return 'pagarme';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HTTP HELPER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Make authenticated request to Pagar.me API
   */
  async _request(method, endpoint, data = null, idempotencyKey = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Base64 encode secret key for Basic Auth
    const authToken = Buffer.from(`${this.secretKey}:`).toString('base64');
    
    const headers = {
      'Authorization': `Basic ${authToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add idempotency key if provided
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    const options = {
      method,
      headers,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(responseData.message || `Pagar.me API error: ${response.status}`);
        error.status = response.status;
        error.code = responseData.errors?.[0]?.code || 'PAGARME_ERROR';
        error.details = responseData.errors || responseData;
        throw error;
      }

      return responseData;
    } catch (error) {
      if (error.status) throw error;
      
      // Network error
      const networkError = new Error(`Pagar.me connection failed: ${error.message}`);
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }
  }

  /**
   * Generate idempotency key
   */
  _generateIdempotencyKey(prefix, ...parts) {
    const data = parts.filter(Boolean).join(':');
    return `${prefix}_${crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
  }

  /**
   * Check idempotency cache
   */
  _checkIdempotency(key) {
    const cached = this.idempotencyCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.IDEMPOTENCY_TTL) {
      return cached.result;
    }
    return null;
  }

  /**
   * Store in idempotency cache
   */
  _storeIdempotency(key, result) {
    this.idempotencyCache.set(key, {
      result,
      timestamp: Date.now(),
    });
    
    // Cleanup old entries periodically
    if (this.idempotencyCache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.idempotencyCache.entries()) {
        if (now - v.timestamp > this.IDEMPOTENCY_TTL) {
          this.idempotencyCache.delete(k);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createCustomer(data) {
    const idempotencyKey = this._generateIdempotencyKey('cus', data.email, data.document);
    
    // Check idempotency
    const cached = this._checkIdempotency(idempotencyKey);
    if (cached) return cached;

    // Format document (CPF/CNPJ)
    const document = data.document?.replace(/\D/g, '');
    const documentType = document?.length === 11 ? 'CPF' : 'CNPJ';

    const customerData = {
      name: data.name,
      email: data.email,
      document: document,
      document_type: documentType,
      type: documentType === 'CPF' ? 'individual' : 'company',
      phones: data.phone ? {
        mobile_phone: {
          country_code: '55',
          area_code: data.phone.substring(0, 2),
          number: data.phone.substring(2),
        }
      } : undefined,
      metadata: data.metadata || {},
    };

    const response = await this._request('POST', '/customers', customerData, idempotencyKey);

    const result = {
      customerId: response.id,
      raw: response,
    };

    this._storeIdempotency(idempotencyKey, result);
    return result;
  }

  async updateCustomer(customerId, data) {
    const updateData = {};
    
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.metadata) updateData.metadata = data.metadata;

    const response = await this._request('PUT', `/customers/${customerId}`, updateData);

    return {
      customerId: response.id,
      raw: response,
    };
  }

  async deleteCustomer(customerId) {
    // Pagar.me doesn't support customer deletion, just deactivate
    try {
      await this._request('DELETE', `/customers/${customerId}`);
      return true;
    } catch (error) {
      console.warn(`[Pagarme] Customer deletion not supported: ${customerId}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createSubscription(data) {
    const idempotencyKey = this._generateIdempotencyKey(
      'sub', 
      data.customerId, 
      data.planId, 
      data.billingCycle
    );

    const cached = this._checkIdempotency(idempotencyKey);
    if (cached) return cached;

    // Calculate billing interval
    const intervalMap = {
      monthly: { interval: 'month', interval_count: 1 },
      yearly: { interval: 'year', interval_count: 1 },
    };
    const billing = intervalMap[data.billingCycle] || intervalMap.monthly;

    // Build subscription payload
    const subscriptionData = {
      customer_id: data.customerId,
      plan_id: data.priceId, // Pagar.me plan ID
      payment_method: data.paymentMethod === 'pix' ? 'pix' : 'credit_card',
      metadata: {
        ...data.metadata,
        internal_plan_id: data.planId,
        billing_cycle: data.billingCycle,
      },
    };

    // Add card info if credit card payment
    if (data.paymentMethod === 'card' && data.paymentMethodData) {
      if (data.paymentMethodData.cardId) {
        // Existing card
        subscriptionData.card_id = data.paymentMethodData.cardId;
      } else if (data.paymentMethodData.cardToken) {
        // Card token from frontend
        subscriptionData.card_token = data.paymentMethodData.cardToken;
      } else if (data.paymentMethodData.card) {
        // Raw card data (not recommended for PCI compliance)
        subscriptionData.card = {
          number: data.paymentMethodData.card.number,
          holder_name: data.paymentMethodData.card.holderName,
          exp_month: data.paymentMethodData.card.expMonth,
          exp_year: data.paymentMethodData.card.expYear,
          cvv: data.paymentMethodData.card.cvv,
          billing_address: data.paymentMethodData.card.billingAddress,
        };
      }
    }

    const response = await this._request('POST', '/subscriptions', subscriptionData, idempotencyKey);

    // Calculate period end
    const now = new Date();
    const periodEnd = new Date(now);
    if (data.billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const result = {
      subscriptionId: response.id,
      status: this._mapSubscriptionStatus(response.status),
      currentPeriodStart: new Date(response.current_cycle?.start_at || now),
      currentPeriodEnd: new Date(response.current_cycle?.end_at || periodEnd),
      raw: response,
    };

    this._storeIdempotency(idempotencyKey, result);
    return result;
  }

  async updateSubscription(subscriptionId, data) {
    const updateData = {};

    if (data.planId) updateData.plan_id = data.planId;
    if (data.paymentMethodId) updateData.card_id = data.paymentMethodId;
    if (data.metadata) updateData.metadata = data.metadata;

    const response = await this._request('PATCH', `/subscriptions/${subscriptionId}`, updateData);

    return {
      subscriptionId: response.id,
      status: this._mapSubscriptionStatus(response.status),
      currentPeriodEnd: response.current_cycle?.end_at 
        ? new Date(response.current_cycle.end_at) 
        : null,
      raw: response,
    };
  }

  async cancelSubscription(subscriptionId, options = {}) {
    const endpoint = options.immediately 
      ? `/subscriptions/${subscriptionId}`
      : `/subscriptions/${subscriptionId}/cancel`;

    const response = await this._request(
      options.immediately ? 'DELETE' : 'POST',
      endpoint,
      options.immediately ? null : { cancel_pending_invoices: true }
    );

    return {
      subscriptionId: response.id || subscriptionId,
      status: 'cancelled',
      cancelledAt: new Date(),
      raw: response,
    };
  }

  async reactivateSubscription(subscriptionId) {
    // Pagar.me doesn't have direct reactivation - need to create new subscription
    // or use the "activate" endpoint if subscription is paused
    try {
      const response = await this._request('POST', `/subscriptions/${subscriptionId}/activate`);
      
      return {
        subscriptionId: response.id,
        status: this._mapSubscriptionStatus(response.status),
        raw: response,
      };
    } catch (error) {
      throw new Error(`Cannot reactivate subscription ${subscriptionId}: ${error.message}`);
    }
  }

  async getSubscription(subscriptionId) {
    const response = await this._request('GET', `/subscriptions/${subscriptionId}`);

    return {
      subscriptionId: response.id,
      status: this._mapSubscriptionStatus(response.status),
      currentPeriodStart: response.current_cycle?.start_at 
        ? new Date(response.current_cycle.start_at) 
        : null,
      currentPeriodEnd: response.current_cycle?.end_at 
        ? new Date(response.current_cycle.end_at) 
        : null,
      raw: response,
    };
  }

  /**
   * Map Pagar.me subscription status to internal status
   */
  _mapSubscriptionStatus(pagarmeStatus) {
    const statusMap = {
      'active': 'active',
      'pending': 'pending',
      'canceled': 'cancelled',
      'expired': 'expired',
      'failed': 'past_due',
      'future': 'pending',
    };
    return statusMap[pagarmeStatus] || pagarmeStatus;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT METHODS - PIX
  // ═══════════════════════════════════════════════════════════════════════════

  async createPixCharge(data) {
    const idempotencyKey = this._generateIdempotencyKey(
      'pix',
      data.customerId,
      data.amount,
      data.metadata?.subscriptionId || Date.now()
    );

    const cached = this._checkIdempotency(idempotencyKey);
    if (cached) return cached;

    // PIX expiration (default 24 hours)
    const expiresAt = data.expiresAt || new Date(Date.now() + 
      (parseInt(process.env.BILLING_PIX_EXPIRATION_HOURS) || 24) * 60 * 60 * 1000
    );

    const orderData = {
      customer_id: data.customerId,
      items: [{
        amount: data.amount, // Amount in cents
        description: data.description || 'Assinatura BeautyHub',
        quantity: 1,
      }],
      payments: [{
        payment_method: 'pix',
        pix: {
          expires_at: expiresAt.toISOString(),
          additional_information: [
            {
              name: 'Referência',
              value: data.metadata?.subscriptionId || 'beautyhub',
            }
          ],
        },
      }],
      metadata: data.metadata || {},
    };

    const response = await this._request('POST', '/orders', orderData, idempotencyKey);

    // Extract PIX data from response
    const pixCharge = response.charges?.[0];
    const pixTransaction = pixCharge?.last_transaction;

    if (!pixTransaction?.qr_code) {
      throw new Error('PIX QR Code not generated');
    }

    const result = {
      chargeId: pixCharge?.id || response.id,
      orderId: response.id,
      qrCode: pixTransaction.qr_code,
      qrCodeBase64: pixTransaction.qr_code_url || null,
      copyPaste: pixTransaction.qr_code,
      expiresAt: new Date(pixTransaction.expires_at || expiresAt),
      raw: response,
    };

    this._storeIdempotency(idempotencyKey, result);
    return result;
  }

  async getPixChargeStatus(chargeId) {
    const response = await this._request('GET', `/charges/${chargeId}`);

    const isPaid = response.status === 'paid';

    return {
      chargeId: response.id,
      status: response.status,
      paidAt: isPaid && response.paid_at ? new Date(response.paid_at) : null,
      raw: response,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT METHODS - CARD
  // ═══════════════════════════════════════════════════════════════════════════

  async createCheckoutSession(data) {
    // Pagar.me doesn't have checkout sessions like Stripe
    // Instead, create an order with payment link
    const orderData = {
      customer_id: data.customerId,
      items: [{
        amount: data.amount || 0,
        description: data.description || 'Assinatura BeautyHub',
        quantity: 1,
      }],
      payments: [{
        payment_method: 'checkout',
        checkout: {
          expires_in: 3600, // 1 hour
          billing_address_editable: false,
          customer_editable: false,
          accepted_payment_methods: ['credit_card', 'pix'],
          success_url: data.successUrl,
          skip_checkout_success_page: false,
        },
      }],
      metadata: {
        ...data.metadata,
        price_id: data.priceId,
        billing_cycle: data.billingCycle,
      },
    };

    const response = await this._request('POST', '/orders', orderData);

    const checkoutUrl = response.checkouts?.[0]?.payment_url || 
                        response.charges?.[0]?.last_transaction?.checkout_url;

    return {
      sessionId: response.id,
      url: checkoutUrl,
      raw: response,
    };
  }

  async attachPaymentMethod(customerId, paymentMethodToken) {
    // Create card for customer
    const cardData = {
      customer_id: customerId,
      token: paymentMethodToken,
    };

    const response = await this._request('POST', '/cards', cardData);

    return {
      paymentMethodId: response.id,
      type: 'card',
      last4: response.last_four_digits,
      brand: response.brand,
      raw: response,
    };
  }

  async detachPaymentMethod(paymentMethodId) {
    try {
      await this._request('DELETE', `/cards/${paymentMethodId}`);
      return true;
    } catch (error) {
      console.error(`[Pagarme] Failed to detach payment method: ${error.message}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createInvoice(data) {
    // Pagar.me uses orders/charges, not invoices in the same way
    // This creates an order that acts as an invoice
    const orderData = {
      customer_id: data.customerId,
      items: data.items.map(item => ({
        amount: item.amount,
        description: item.description,
        quantity: item.quantity || 1,
      })),
      payments: [{
        payment_method: 'pix', // Default to PIX for invoices
        pix: {
          expires_at: data.dueDate?.toISOString() || 
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }],
      metadata: data.metadata || {},
    };

    const response = await this._request('POST', '/orders', orderData);

    return {
      invoiceId: response.id,
      status: response.status,
      url: response.checkouts?.[0]?.payment_url || null,
      raw: response,
    };
  }

  async getInvoice(invoiceId) {
    const response = await this._request('GET', `/orders/${invoiceId}`);

    return {
      invoiceId: response.id,
      status: response.status,
      amount: response.amount,
      paidAt: response.status === 'paid' && response.closed_at 
        ? new Date(response.closed_at) 
        : null,
      raw: response,
    };
  }

  async finalizeInvoice(invoiceId) {
    // In Pagar.me, orders are created already "finalized"
    const response = await this._request('GET', `/orders/${invoiceId}`);
    
    return {
      invoiceId: response.id,
      status: response.status,
      raw: response,
    };
  }

  async markInvoiceAsPaid(invoiceId, paymentData) {
    // This would typically be handled via webhook when payment is confirmed
    // Manual marking is not directly supported
    const response = await this._request('GET', `/orders/${invoiceId}`);
    
    return {
      invoiceId: response.id,
      status: response.status,
      paidAt: response.status === 'paid' ? new Date() : null,
      raw: response,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async refund(chargeId, options = {}) {
    const refundData = {};
    
    if (options.amount) {
      refundData.amount = options.amount;
    }
    if (options.reason) {
      refundData.code = options.reason;
    }

    const response = await this._request('POST', `/charges/${chargeId}/refund`, refundData);

    return {
      refundId: response.id,
      status: response.status,
      amount: response.refunded_amount || options.amount,
      raw: response,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verify Pagar.me webhook signature
   * Pagar.me uses HMAC-SHA256 for webhook validation
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('[Pagarme] Webhook secret not configured, skipping signature verification');
      return process.env.NODE_ENV === 'development';
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString)
        .digest('hex');

      // Compare signatures (timing-safe)
      const signatureBuffer = Buffer.from(signature || '', 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      console.error('[Pagarme] Webhook signature verification failed:', error.message);
      return false;
    }
  }

  /**
   * Parse and validate webhook event
   */
  async parseWebhookEvent(payload, signature) {
    // Verify signature first
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const mappedType = this.mapWebhookEventType(event.type);

    return {
      type: mappedType || event.type,
      data: event.data,
      raw: event,
    };
  }

  /**
   * Map Pagar.me webhook event types to internal event types
   */
  mapWebhookEventType(pagarmeEventType) {
    const mapping = {
      // Subscription events
      'subscription.created': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_CREATED,
      'subscription.updated': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED,
      'subscription.canceled': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_CANCELLED,
      'subscription.renewed': PaymentProviderInterface.WEBHOOK_EVENTS.SUBSCRIPTION_RENEWED,
      
      // Charge/Payment events
      'charge.paid': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_SUCCEEDED,
      'charge.payment_failed': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_FAILED,
      'charge.refunded': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_REFUNDED,
      'charge.underpaid': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_FAILED,
      'charge.overpaid': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_SUCCEEDED,
      
      // Order events
      'order.paid': PaymentProviderInterface.WEBHOOK_EVENTS.INVOICE_PAID,
      'order.payment_failed': PaymentProviderInterface.WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED,
      'order.created': PaymentProviderInterface.WEBHOOK_EVENTS.INVOICE_CREATED,
      
      // PIX specific
      'charge.pending': null, // PIX pending
      'charge.processing': null, // Processing
      
      // Customer events
      'customer.created': PaymentProviderInterface.WEBHOOK_EVENTS.CUSTOMER_UPDATED,
      'customer.updated': PaymentProviderInterface.WEBHOOK_EVENTS.CUSTOMER_UPDATED,
      
      // Card events
      'card.created': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_METHOD_ATTACHED,
      'card.deleted': PaymentProviderInterface.WEBHOOK_EVENTS.PAYMENT_METHOD_DETACHED,
    };

    return mapping[pagarmeEventType] || null;
  }

  /**
   * Extract subscription data from webhook for database update
   */
  extractSubscriptionDataFromWebhook(webhookData) {
    const charge = webhookData.data?.charge || webhookData.data;
    const subscription = webhookData.data?.subscription || charge?.subscription;
    const order = webhookData.data?.order || webhookData.data;

    // Try to get tenant/subscription ID from metadata
    const metadata = charge?.metadata || order?.metadata || subscription?.metadata || {};
    
    return {
      subscriptionId: subscription?.id,
      externalSubscriptionId: subscription?.id,
      chargeId: charge?.id,
      orderId: order?.id,
      status: this._mapChargeStatusToSubscription(charge?.status),
      amount: charge?.amount || order?.amount,
      paidAt: charge?.paid_at ? new Date(charge.paid_at) : null,
      currentPeriodEnd: subscription?.current_cycle?.end_at 
        ? new Date(subscription.current_cycle.end_at) 
        : null,
      tenantId: metadata.tenant_id,
      internalSubscriptionId: metadata.subscription_id,
      metadata,
    };
  }

  /**
   * Map charge status to subscription status
   */
  _mapChargeStatusToSubscription(chargeStatus) {
    const mapping = {
      'paid': 'active',
      'pending': 'pending',
      'processing': 'pending',
      'failed': 'past_due',
      'canceled': 'cancelled',
      'refunded': 'cancelled',
    };
    return mapping[chargeStatus] || chargeStatus;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT/PRICE METHODS (Plan Sync)
  // ═══════════════════════════════════════════════════════════════════════════

  async syncProduct(data) {
    // Check if product exists
    try {
      const existing = await this._request('GET', `/plans?code=${data.id}`);
      if (existing.data?.length > 0) {
        return {
          productId: existing.data[0].id,
          raw: existing.data[0],
        };
      }
    } catch (e) {
      // Product doesn't exist, create it
    }

    // Create plan in Pagar.me
    const planData = {
      name: data.name,
      description: data.description || data.name,
      currency: 'BRL',
      interval: 'month',
      interval_count: 1,
      billing_type: 'prepaid',
      minimum_price: 0,
      payment_methods: ['credit_card', 'pix'],
      metadata: {
        internal_id: data.id,
      },
    };

    const response = await this._request('POST', '/plans', planData);

    return {
      productId: response.id,
      raw: response,
    };
  }

  async syncPrice(data) {
    // In Pagar.me, price is part of plan items
    // Update plan with price information
    const planItem = {
      name: data.description || 'Assinatura',
      quantity: 1,
      pricing_scheme: {
        scheme_type: 'unit',
        price: data.amount,
      },
    };

    try {
      const response = await this._request(
        'POST', 
        `/plans/${data.productId}/items`, 
        planItem
      );

      return {
        priceId: response.id,
        raw: response,
      };
    } catch (error) {
      // If item exists, return the plan ID as price ID
      return {
        priceId: data.productId,
        raw: { plan_id: data.productId, amount: data.amount },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List customer's cards
   */
  async listCustomerCards(customerId) {
    const response = await this._request('GET', `/customers/${customerId}/cards`);
    
    return response.data?.map(card => ({
      id: card.id,
      last4: card.last_four_digits,
      brand: card.brand,
      expMonth: card.exp_month,
      expYear: card.exp_year,
      isDefault: card.default || false,
    })) || [];
  }

  /**
   * Get customer's active subscriptions
   */
  async listCustomerSubscriptions(customerId) {
    const response = await this._request('GET', `/subscriptions?customer_id=${customerId}`);
    
    return response.data?.map(sub => ({
      id: sub.id,
      status: this._mapSubscriptionStatus(sub.status),
      planId: sub.plan?.id,
      currentPeriodEnd: sub.current_cycle?.end_at 
        ? new Date(sub.current_cycle.end_at) 
        : null,
    })) || [];
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck() {
    try {
      await this._request('GET', '/customers?page=1&size=1');
      return {
        status: 'healthy',
        provider: 'pagarme',
        environment: this.environment,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: 'pagarme',
        error: error.message,
      };
    }
  }
}

module.exports = PagarmePaymentProvider;
