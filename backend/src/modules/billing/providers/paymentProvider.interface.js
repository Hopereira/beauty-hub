/**
 * Payment Provider Interface
 * Abstract interface for payment gateway implementations
 * Allows swapping payment providers without changing business logic
 */

class PaymentProviderInterface {
  constructor() {
    if (new.target === PaymentProviderInterface) {
      throw new Error('PaymentProviderInterface is abstract and cannot be instantiated directly');
    }
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getProviderName() {
    throw new Error('Method getProviderName() must be implemented');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a customer in the payment gateway
   * @param {object} data - Customer data
   * @param {string} data.email - Customer email
   * @param {string} data.name - Customer name
   * @param {string} data.document - Customer document (CPF/CNPJ)
   * @param {object} data.metadata - Additional metadata
   * @returns {Promise<{customerId: string, raw: object}>}
   */
  async createCustomer(data) {
    throw new Error('Method createCustomer() must be implemented');
  }

  /**
   * Update customer in the payment gateway
   * @param {string} customerId - Gateway customer ID
   * @param {object} data - Updated customer data
   * @returns {Promise<{customerId: string, raw: object}>}
   */
  async updateCustomer(customerId, data) {
    throw new Error('Method updateCustomer() must be implemented');
  }

  /**
   * Delete customer from payment gateway
   * @param {string} customerId - Gateway customer ID
   * @returns {Promise<boolean>}
   */
  async deleteCustomer(customerId) {
    throw new Error('Method deleteCustomer() must be implemented');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a subscription
   * @param {object} data - Subscription data
   * @param {string} data.customerId - Gateway customer ID
   * @param {string} data.planId - Internal plan ID
   * @param {string} data.priceId - Gateway price/plan ID
   * @param {string} data.billingCycle - 'monthly' or 'yearly'
   * @param {string} data.paymentMethod - 'card' or 'pix'
   * @param {object} data.paymentMethodData - Payment method details (card token, etc)
   * @param {object} data.metadata - Additional metadata
   * @returns {Promise<{subscriptionId: string, status: string, currentPeriodEnd: Date, raw: object}>}
   */
  async createSubscription(data) {
    throw new Error('Method createSubscription() must be implemented');
  }

  /**
   * Update a subscription (change plan, payment method, etc)
   * @param {string} subscriptionId - Gateway subscription ID
   * @param {object} data - Updated subscription data
   * @returns {Promise<{subscriptionId: string, status: string, currentPeriodEnd: Date, raw: object}>}
   */
  async updateSubscription(subscriptionId, data) {
    throw new Error('Method updateSubscription() must be implemented');
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Gateway subscription ID
   * @param {object} options - Cancellation options
   * @param {boolean} options.immediately - Cancel immediately or at period end
   * @returns {Promise<{subscriptionId: string, status: string, cancelledAt: Date, raw: object}>}
   */
  async cancelSubscription(subscriptionId, options = {}) {
    throw new Error('Method cancelSubscription() must be implemented');
  }

  /**
   * Reactivate a cancelled subscription
   * @param {string} subscriptionId - Gateway subscription ID
   * @returns {Promise<{subscriptionId: string, status: string, raw: object}>}
   */
  async reactivateSubscription(subscriptionId) {
    throw new Error('Method reactivateSubscription() must be implemented');
  }

  /**
   * Get subscription details
   * @param {string} subscriptionId - Gateway subscription ID
   * @returns {Promise<{subscriptionId: string, status: string, currentPeriodStart: Date, currentPeriodEnd: Date, raw: object}>}
   */
  async getSubscription(subscriptionId) {
    throw new Error('Method getSubscription() must be implemented');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a checkout session for card payment
   * @param {object} data - Checkout data
   * @param {string} data.customerId - Gateway customer ID
   * @param {string} data.priceId - Gateway price ID
   * @param {string} data.billingCycle - 'monthly' or 'yearly'
   * @param {string} data.successUrl - Redirect URL on success
   * @param {string} data.cancelUrl - Redirect URL on cancel
   * @param {object} data.metadata - Additional metadata
   * @returns {Promise<{sessionId: string, url: string, raw: object}>}
   */
  async createCheckoutSession(data) {
    throw new Error('Method createCheckoutSession() must be implemented');
  }

  /**
   * Create a PIX charge
   * @param {object} data - PIX charge data
   * @param {string} data.customerId - Gateway customer ID
   * @param {number} data.amount - Amount in cents
   * @param {string} data.description - Charge description
   * @param {Date} data.expiresAt - Expiration date
   * @param {object} data.metadata - Additional metadata
   * @returns {Promise<{chargeId: string, qrCode: string, qrCodeBase64: string, copyPaste: string, expiresAt: Date, raw: object}>}
   */
  async createPixCharge(data) {
    throw new Error('Method createPixCharge() must be implemented');
  }

  /**
   * Get PIX charge status
   * @param {string} chargeId - Gateway charge ID
   * @returns {Promise<{chargeId: string, status: string, paidAt: Date|null, raw: object}>}
   */
  async getPixChargeStatus(chargeId) {
    throw new Error('Method getPixChargeStatus() must be implemented');
  }

  /**
   * Attach payment method to customer
   * @param {string} customerId - Gateway customer ID
   * @param {string} paymentMethodToken - Payment method token
   * @returns {Promise<{paymentMethodId: string, type: string, last4: string, brand: string, raw: object}>}
   */
  async attachPaymentMethod(customerId, paymentMethodToken) {
    throw new Error('Method attachPaymentMethod() must be implemented');
  }

  /**
   * Detach payment method from customer
   * @param {string} paymentMethodId - Gateway payment method ID
   * @returns {Promise<boolean>}
   */
  async detachPaymentMethod(paymentMethodId) {
    throw new Error('Method detachPaymentMethod() must be implemented');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create an invoice
   * @param {object} data - Invoice data
   * @param {string} data.customerId - Gateway customer ID
   * @param {Array} data.items - Invoice items
   * @param {Date} data.dueDate - Due date
   * @param {object} data.metadata - Additional metadata
   * @returns {Promise<{invoiceId: string, status: string, url: string, raw: object}>}
   */
  async createInvoice(data) {
    throw new Error('Method createInvoice() must be implemented');
  }

  /**
   * Get invoice details
   * @param {string} invoiceId - Gateway invoice ID
   * @returns {Promise<{invoiceId: string, status: string, amount: number, paidAt: Date|null, raw: object}>}
   */
  async getInvoice(invoiceId) {
    throw new Error('Method getInvoice() must be implemented');
  }

  /**
   * Finalize and send invoice
   * @param {string} invoiceId - Gateway invoice ID
   * @returns {Promise<{invoiceId: string, status: string, raw: object}>}
   */
  async finalizeInvoice(invoiceId) {
    throw new Error('Method finalizeInvoice() must be implemented');
  }

  /**
   * Mark invoice as paid (for PIX/Boleto)
   * @param {string} invoiceId - Gateway invoice ID
   * @param {object} paymentData - Payment confirmation data
   * @returns {Promise<{invoiceId: string, status: string, paidAt: Date, raw: object}>}
   */
  async markInvoiceAsPaid(invoiceId, paymentData) {
    throw new Error('Method markInvoiceAsPaid() must be implemented');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Refund a payment
   * @param {string} paymentId - Gateway payment/charge ID
   * @param {object} options - Refund options
   * @param {number} options.amount - Amount to refund (null for full refund)
   * @param {string} options.reason - Refund reason
   * @returns {Promise<{refundId: string, status: string, amount: number, raw: object}>}
   */
  async refund(paymentId, options = {}) {
    throw new Error('Method refund() must be implemented');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verify webhook signature
   * @param {string|Buffer} payload - Raw webhook payload
   * @param {string} signature - Webhook signature header
   * @returns {boolean}
   */
  verifyWebhookSignature(payload, signature) {
    throw new Error('Method verifyWebhookSignature() must be implemented');
  }

  /**
   * Parse webhook event
   * @param {string|Buffer} payload - Raw webhook payload
   * @param {string} signature - Webhook signature header
   * @returns {Promise<{type: string, data: object, raw: object}>}
   */
  async parseWebhookEvent(payload, signature) {
    throw new Error('Method parseWebhookEvent() must be implemented');
  }

  /**
   * Map gateway event type to internal event type
   * @param {string} gatewayEventType - Gateway-specific event type
   * @returns {string|null} - Internal event type or null if not mapped
   */
  mapWebhookEventType(gatewayEventType) {
    throw new Error('Method mapWebhookEventType() must be implemented');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT/PRICE METHODS (for syncing plans)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create or update a product in the gateway
   * @param {object} data - Product data
   * @param {string} data.id - Internal product/plan ID
   * @param {string} data.name - Product name
   * @param {string} data.description - Product description
   * @returns {Promise<{productId: string, raw: object}>}
   */
  async syncProduct(data) {
    throw new Error('Method syncProduct() must be implemented');
  }

  /**
   * Create or update a price in the gateway
   * @param {object} data - Price data
   * @param {string} data.productId - Gateway product ID
   * @param {number} data.amount - Price in cents
   * @param {string} data.currency - Currency code
   * @param {string} data.interval - Billing interval ('month' or 'year')
   * @returns {Promise<{priceId: string, raw: object}>}
   */
  async syncPrice(data) {
    throw new Error('Method syncPrice() must be implemented');
  }
}

// Webhook event types (internal mapping)
PaymentProviderInterface.WEBHOOK_EVENTS = {
  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  
  // Payment events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  
  // PIX events
  PIX_RECEIVED: 'pix.received',
  PIX_EXPIRED: 'pix.expired',
  
  // Customer events
  CUSTOMER_UPDATED: 'customer.updated',
  PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
  PAYMENT_METHOD_DETACHED: 'payment_method.detached',
};

module.exports = PaymentProviderInterface;
