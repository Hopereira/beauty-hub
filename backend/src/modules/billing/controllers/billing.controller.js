/**
 * Billing Controller
 * Handles billing-related HTTP requests
 */

const { HTTP_STATUS } = require('../../../shared/constants');

class BillingController {
  constructor(services) {
    this.planService = services.planService;
    this.subscriptionService = services.subscriptionService;
    this.invoiceService = services.invoiceService;

    // Bind methods
    this.getPlans = this.getPlans.bind(this);
    this.getPlanBySlug = this.getPlanBySlug.bind(this);
    this.getSubscription = this.getSubscription.bind(this);
    this.activateSubscription = this.activateSubscription.bind(this);
    this.createPixPayment = this.createPixPayment.bind(this);
    this.changePlan = this.changePlan.bind(this);
    this.cancelSubscription = this.cancelSubscription.bind(this);
    this.getInvoices = this.getInvoices.bind(this);
    this.getInvoice = this.getInvoice.bind(this);
  }

  /**
   * GET /api/billing/plans
   * Get all public plans
   */
  async getPlans(req, res, next) {
    try {
      const plans = await this.planService.getPublicPlans();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/billing/plans/:slug
   * Get plan by slug
   */
  async getPlanBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const plan = await this.planService.getPlanBySlug(slug);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/billing/subscription
   * Get current tenant subscription
   */
  async getSubscription(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      
      if (!tenantId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: { message: 'Tenant context required' },
        });
      }

      const subscription = await this.subscriptionService.getByTenantId(tenantId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/billing/subscription/activate
   * Activate subscription with payment
   */
  async activateSubscription(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      const { planId, billingCycle, paymentMethod, paymentData } = req.body;

      const subscription = await this.subscriptionService.activateSubscription(tenantId, {
        planId,
        billingCycle,
        paymentMethod,
        paymentData,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: subscription,
        message: 'Subscription activated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/billing/subscription/pix
   * Create PIX payment for subscription
   */
  async createPixPayment(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      const { planId, billingCycle } = req.body;

      const pixData = await this.subscriptionService.createPixPayment(tenantId, {
        planId,
        billingCycle,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: pixData,
        message: 'PIX payment created. Scan QR code to pay.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/billing/subscription/plan
   * Change subscription plan
   */
  async changePlan(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      const userId = req.user?.id;
      const { planId } = req.body;

      const subscription = await this.subscriptionService.changePlan(tenantId, planId, userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: subscription,
        message: 'Plan changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/billing/subscription/cancel
   * Cancel subscription
   */
  async cancelSubscription(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      const userId = req.user?.id;
      const { immediately, reason } = req.body;

      const subscription = await this.subscriptionService.cancelSubscription(
        tenantId,
        { immediately, reason },
        userId
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: subscription,
        message: immediately 
          ? 'Subscription cancelled immediately' 
          : 'Subscription will be cancelled at period end',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/billing/invoices
   * Get tenant invoices
   */
  async getInvoices(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      const { status, startDate, endDate, limit, offset } = req.query;

      const invoices = await this.invoiceService.getByTenantId(tenantId, {
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/billing/invoices/:id
   * Get invoice by ID
   */
  async getInvoice(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      const { id } = req.params;

      const invoice = await this.invoiceService.getById(id, tenantId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BillingController;
