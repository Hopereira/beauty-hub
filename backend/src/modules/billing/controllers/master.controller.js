/**
 * Master Billing Controller
 * MASTER-only endpoints for billing management
 */

const { HTTP_STATUS } = require('../../../shared/constants');

class MasterBillingController {
  constructor(services) {
    this.planService = services.planService;
    this.subscriptionService = services.subscriptionService;
    this.invoiceService = services.invoiceService;
    this.auditService = services.auditService;

    // Bind methods
    this.getAllPlans = this.getAllPlans.bind(this);
    this.createPlan = this.createPlan.bind(this);
    this.updatePlan = this.updatePlan.bind(this);
    this.activatePlan = this.activatePlan.bind(this);
    this.deactivatePlan = this.deactivatePlan.bind(this);
    this.getAllSubscriptions = this.getAllSubscriptions.bind(this);
    this.getSubscription = this.getSubscription.bind(this);
    this.suspendSubscription = this.suspendSubscription.bind(this);
    this.getMRR = this.getMRR.bind(this);
    this.getRevenueSummary = this.getRevenueSummary.bind(this);
    this.getAllInvoices = this.getAllInvoices.bind(this);
    this.getAuditLogs = this.getAuditLogs.bind(this);
    this.getWebhookLogs = this.getWebhookLogs.bind(this);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/master/plans
   * Get all plans including inactive
   */
  async getAllPlans(req, res, next) {
    try {
      const { includeInactive } = req.query;
      const plans = await this.planService.getAllPlans(includeInactive === 'true');

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/master/plans
   * Create a new plan
   */
  async createPlan(req, res, next) {
    try {
      const userId = req.user?.id;
      const plan = await this.planService.createPlan(req.body, userId);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: plan,
        message: 'Plan created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/master/plans/:id
   * Update a plan
   */
  async updatePlan(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const plan = await this.planService.updatePlan(id, req.body, userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: plan,
        message: 'Plan updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/master/plans/:id/activate
   * Activate a plan
   */
  async activatePlan(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const plan = await this.planService.activatePlan(id, userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: plan,
        message: 'Plan activated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/master/plans/:id/deactivate
   * Deactivate a plan
   */
  async deactivatePlan(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const plan = await this.planService.deactivatePlan(id, userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: plan,
        message: 'Plan deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/master/subscriptions
   * Get all subscriptions
   */
  async getAllSubscriptions(req, res, next) {
    try {
      const { status, planId, billingCycle, limit, offset } = req.query;

      const subscriptions = await this.subscriptionService.getAllSubscriptions({
        status,
        planId,
        billingCycle,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: subscriptions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/master/subscriptions/:id
   * Get subscription by ID
   */
  async getSubscription(req, res, next) {
    try {
      const { id } = req.params;
      const subscription = await this.subscriptionService.getById(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/master/subscriptions/:id/suspend
   * Suspend a subscription
   */
  async suspendSubscription(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const subscription = await this.subscriptionService.suspendSubscription(id, reason);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: subscription,
        message: 'Subscription suspended successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVENUE & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/master/mrr
   * Get Monthly Recurring Revenue
   */
  async getMRR(req, res, next) {
    try {
      const mrr = await this.subscriptionService.getMRR();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: mrr,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/master/revenue-summary
   * Get revenue summary for a period
   */
  async getRevenueSummary(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      // Default to current month
      const start = startDate 
        ? new Date(startDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      const end = endDate 
        ? new Date(endDate) 
        : new Date();

      const summary = await this.subscriptionService.getRevenueSummary(start, end);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          ...summary,
          period: { start, end },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/master/invoices
   * Get all invoices
   */
  async getAllInvoices(req, res, next) {
    try {
      const { status, tenantId, startDate, endDate, limit, offset } = req.query;

      const invoices = await this.invoiceService.getAllInvoices({
        status,
        tenantId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit) || 100,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/master/billing/audit-logs
   * Get billing audit logs
   */
  async getAuditLogs(req, res, next) {
    try {
      const { action, tenantId, entityType, startDate, endDate, limit, offset } = req.query;

      const logs = await this.auditService.getAll({
        action,
        tenantId,
        entityType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/master/billing/webhook-logs
   * Get webhook logs
   */
  async getWebhookLogs(req, res, next) {
    try {
      const { provider, eventType, status, tenantId, startDate, endDate, limit, offset } = req.query;

      const whereClause = [];
      const binds = [];
      let bindIndex = 1;

      if (provider) {
        whereClause.push(`provider = $${bindIndex}`);
        binds.push(provider);
        bindIndex++;
      }

      if (eventType) {
        whereClause.push(`event_type = $${bindIndex}`);
        binds.push(eventType);
        bindIndex++;
      }

      if (status) {
        whereClause.push(`status = $${bindIndex}`);
        binds.push(status);
        bindIndex++;
      }

      if (tenantId) {
        whereClause.push(`tenant_id = $${bindIndex}`);
        binds.push(tenantId);
        bindIndex++;
      }

      if (startDate) {
        whereClause.push(`created_at >= $${bindIndex}`);
        binds.push(new Date(startDate));
        bindIndex++;
      }

      if (endDate) {
        whereClause.push(`created_at <= $${bindIndex}`);
        binds.push(new Date(endDate));
        bindIndex++;
      }

      const limitVal = parseInt(limit) || 100;
      const offsetVal = parseInt(offset) || 0;
      binds.push(limitVal);
      binds.push(offsetVal);

      const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      const { sequelize } = require('../../../shared/database');
      
      // Check if table exists first
      let logs = [];
      try {
        [logs] = await sequelize.query(`
          SELECT id, provider, event_type, event_id, tenant_id, status, error_message, retry_count, processed_at, created_at
          FROM webhook_logs
          ${whereStr}
          ORDER BY created_at DESC
          LIMIT $${bindIndex} OFFSET $${bindIndex + 1}
        `, {
          bind: binds,
          type: sequelize.QueryTypes.SELECT,
        });
      } catch (tableError) {
        // Table might not exist yet
        console.warn('webhook_logs table not found:', tableError.message);
        logs = [];
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { rows: logs, count: logs.length },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MasterBillingController;
