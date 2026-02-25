/**
 * Webhook Controller
 * Handles payment gateway webhooks
 */

const { HTTP_STATUS } = require('../../../shared/constants');
const { PaymentProviderInterface } = require('../providers');

class WebhookController {
  constructor(services, paymentProvider) {
    this.subscriptionService = services.subscriptionService;
    this.invoiceService = services.invoiceService;
    this.paymentProvider = paymentProvider;

    // Bind methods
    this.handleWebhook = this.handleWebhook.bind(this);
  }

  /**
   * POST /api/webhooks/billing/:provider
   * Handle incoming webhooks from payment providers
   */
  async handleWebhook(req, res, next) {
    try {
      const { provider } = req.params;
      const signature = req.headers['stripe-signature'] || 
                       req.headers['x-hub-signature'] ||
                       req.headers['x-webhook-signature'] ||
                       req.headers['x-signature'];

      // Verify signature
      if (!this.paymentProvider.verifyWebhookSignature(req.rawBody || req.body, signature)) {
        console.warn('Webhook signature verification failed', { provider });
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: { message: 'Invalid webhook signature' },
        });
      }

      // Parse event
      const event = await this.paymentProvider.parseWebhookEvent(
        req.rawBody || req.body,
        signature
      );

      console.log('Webhook received', { provider, type: event.type });

      // Process event
      await this._processEvent(event);

      // Acknowledge receipt
      res.status(HTTP_STATUS.OK).json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      
      // Still return 200 to prevent retries for non-retryable errors
      res.status(HTTP_STATUS.OK).json({
        received: true,
        error: error.message,
      });
    }
  }

  /**
   * Process webhook event
   */
  async _processEvent(event) {
    const { type, data, raw } = event;
    const EVENTS = PaymentProviderInterface.WEBHOOK_EVENTS;

    switch (type) {
      // ─────────────────────────────────────────────────────────────────────────
      // Subscription Events
      // ─────────────────────────────────────────────────────────────────────────
      
      case EVENTS.SUBSCRIPTION_CREATED:
        await this._handleSubscriptionCreated(data, raw);
        break;

      case EVENTS.SUBSCRIPTION_UPDATED:
        await this._handleSubscriptionUpdated(data, raw);
        break;

      case EVENTS.SUBSCRIPTION_CANCELLED:
        await this._handleSubscriptionCancelled(data, raw);
        break;

      case EVENTS.SUBSCRIPTION_RENEWED:
        await this._handleSubscriptionRenewed(data, raw);
        break;

      // ─────────────────────────────────────────────────────────────────────────
      // Payment Events
      // ─────────────────────────────────────────────────────────────────────────

      case EVENTS.PAYMENT_SUCCEEDED:
        await this._handlePaymentSucceeded(data, raw);
        break;

      case EVENTS.PAYMENT_FAILED:
        await this._handlePaymentFailed(data, raw);
        break;

      case EVENTS.PAYMENT_REFUNDED:
        await this._handlePaymentRefunded(data, raw);
        break;

      // ─────────────────────────────────────────────────────────────────────────
      // Invoice Events
      // ─────────────────────────────────────────────────────────────────────────

      case EVENTS.INVOICE_PAID:
        await this._handleInvoicePaid(data, raw);
        break;

      case EVENTS.INVOICE_PAYMENT_FAILED:
        await this._handleInvoicePaymentFailed(data, raw);
        break;

      // ─────────────────────────────────────────────────────────────────────────
      // PIX Events
      // ─────────────────────────────────────────────────────────────────────────

      case EVENTS.PIX_RECEIVED:
        await this._handlePixReceived(data, raw);
        break;

      case EVENTS.PIX_EXPIRED:
        await this._handlePixExpired(data, raw);
        break;

      default:
        console.log('Unhandled webhook event type:', type);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Event Handlers
  // ═══════════════════════════════════════════════════════════════════════════

  async _handleSubscriptionCreated(data, raw) {
    // Usually handled during checkout, but log for tracking
    console.log('Subscription created in gateway', {
      subscriptionId: data.id,
      customerId: data.customer,
    });
  }

  async _handleSubscriptionUpdated(data, raw) {
    const subscriptionId = this._extractSubscriptionId(data, raw);
    if (!subscriptionId) return;

    // Update local subscription based on gateway status
    const gatewayStatus = data.status;
    
    if (gatewayStatus === 'active') {
      // Subscription became active (e.g., trial ended, payment succeeded)
      const subscription = await this._findSubscriptionByGatewayId(data.id);
      if (subscription) {
        await this.subscriptionService.renewSubscription(subscription.id, {
          gatewayData: data,
        });
      }
    }
  }

  async _handleSubscriptionCancelled(data, raw) {
    const subscription = await this._findSubscriptionByGatewayId(data.id);
    if (!subscription) return;

    await this.subscriptionService.cancelSubscription(
      subscription.tenant_id,
      { immediately: true, reason: 'Cancelled via payment provider' }
    );
  }

  async _handleSubscriptionRenewed(data, raw) {
    const subscription = await this._findSubscriptionByGatewayId(data.id);
    if (!subscription) return;

    await this.subscriptionService.renewSubscription(subscription.id, {
      gatewayData: data,
    });
  }

  async _handlePaymentSucceeded(data, raw) {
    // Extract metadata from different provider formats
    const metadata = data.metadata || 
                    data.charge?.metadata || 
                    raw?.data?.metadata || 
                    {};
    
    // Extract subscription ID from metadata or nested data (Pagar.me format)
    const subscriptionId = metadata.subscription_id || 
                          metadata.subscriptionId ||
                          data.subscription?.metadata?.subscription_id;
    
    // Extract current period end from Pagar.me subscription data
    const currentPeriodEnd = data.subscription?.current_cycle?.end_at
      ? new Date(data.subscription.current_cycle.end_at)
      : null;

    // If this is a subscription payment
    if (subscriptionId) {
      const subscription = await this.subscriptionService.getById(subscriptionId);
      if (subscription) {
        await this.subscriptionService.renewSubscription(subscriptionId, {
          paymentId: data.id,
          amount: data.amount / 100,
          currentPeriodEnd,
        });
      }
    }

    // If this is an invoice payment
    const invoiceId = metadata.invoice_id || metadata.invoiceId;
    if (invoiceId) {
      await this.invoiceService.markAsPaid(invoiceId, {
        gatewayPaymentId: data.id,
        paidAt: new Date(data.paid_at || Date.now()),
      });
    }
  }

  async _handlePaymentFailed(data, raw) {
    // Extract metadata from different provider formats
    const metadata = data.metadata || 
                    data.charge?.metadata || 
                    raw?.data?.metadata || 
                    {};

    // Support both camelCase and snake_case
    const subscriptionId = metadata.subscription_id || metadata.subscriptionId;
    const invoiceId = metadata.invoice_id || metadata.invoiceId;
    
    // Extract failure reason (Pagar.me uses different structure)
    const failureReason = data.failure_message || 
                         data.last_payment_error?.message ||
                         data.last_transaction?.gateway_response?.message ||
                         'Payment failed';

    if (subscriptionId) {
      await this.subscriptionService.handlePaymentFailure(subscriptionId, {
        reason: failureReason,
        gatewayData: data,
      });
    }

    if (invoiceId) {
      await this.invoiceService.recordPaymentAttempt(invoiceId, {
        success: false,
        reason: failureReason,
      });
    }
  }

  async _handlePaymentRefunded(data, raw) {
    console.log('Payment refunded', {
      paymentId: data.payment_intent || data.id,
      amount: data.amount,
    });
    // Handle refund logic if needed
  }

  async _handleInvoicePaid(data, raw) {
    const metadata = data.metadata || {};
    
    // Find invoice by gateway ID
    const invoice = await this._findInvoiceByGatewayId(data.id);
    
    if (invoice) {
      await this.invoiceService.markAsPaid(invoice.id, {
        gatewayPaymentId: data.payment_intent,
        paidAt: new Date(data.status_transitions?.paid_at * 1000 || Date.now()),
      });

      // Also update subscription if linked
      if (invoice.subscription_id) {
        await this.subscriptionService.renewSubscription(invoice.subscription_id, {
          invoiceId: invoice.id,
        });
      }
    }
  }

  async _handleInvoicePaymentFailed(data, raw) {
    const invoice = await this._findInvoiceByGatewayId(data.id);
    
    if (invoice) {
      await this.invoiceService.recordPaymentAttempt(invoice.id, {
        success: false,
        reason: data.last_payment_error?.message || 'Payment failed',
      });

      // Update subscription status if linked
      if (invoice.subscription_id) {
        await this.subscriptionService.handlePaymentFailure(invoice.subscription_id, {
          reason: 'Invoice payment failed',
          invoiceId: invoice.id,
        });
      }
    }
  }

  async _handlePixReceived(data, raw) {
    const chargeId = data.id || data.charge_id || data.charge?.id;
    
    // Extract metadata (Pagar.me format)
    const metadata = data.metadata || 
                    data.charge?.metadata || 
                    raw?.data?.metadata || 
                    {};
    
    const subscriptionId = metadata.subscription_id || metadata.subscriptionId;
    
    // Extract current period end if available
    const currentPeriodEnd = data.subscription?.current_cycle?.end_at
      ? new Date(data.subscription.current_cycle.end_at)
      : null;
    
    // Confirm PIX payment
    await this.subscriptionService.confirmPixPayment(chargeId, {
      paymentId: data.payment_id || data.id,
      paidAt: new Date(data.paid_at || Date.now()),
      subscriptionId,
      currentPeriodEnd,
      amount: data.amount,
    });
  }

  async _handlePixExpired(data, raw) {
    console.log('PIX charge expired', { chargeId: data.id });
    // Mark invoice as expired if needed
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  _extractSubscriptionId(data, raw) {
    return data.metadata?.subscriptionId || 
           raw?.data?.object?.metadata?.subscriptionId;
  }

  async _findSubscriptionByGatewayId(gatewaySubscriptionId) {
    // This would need access to the Subscription model
    // For now, return null - should be implemented with proper model access
    return null;
  }

  async _findInvoiceByGatewayId(gatewayInvoiceId) {
    // This would need access to the Invoice model
    // For now, return null - should be implemented with proper model access
    return null;
  }
}

module.exports = WebhookController;
