/**
 * Plan Service
 * Business logic for subscription plans management
 */

const { BILLING_CYCLE, BILLING_AUDIT_ACTIONS, BILLING_DEFAULTS } = require('../../../shared/constants');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../../shared/errors');

class PlanService {
  constructor(models, auditService = null) {
    this.SubscriptionPlan = models.SubscriptionPlan;
    this.Subscription = models.Subscription;
    this.auditService = auditService;
  }

  /**
   * Get public plans (for landing page)
   */
  async getPublicPlans() {
    const plans = await this.SubscriptionPlan.findAll({
      where: {
        is_active: true,
        is_public: true,
      },
      order: [['sort_order', 'ASC']],
    });

    return plans.map(plan => this._formatPlanResponse(plan, false));
  }

  /**
   * Get all active public plans
   */
  async getAllPublicPlans() {
    const plans = await this.SubscriptionPlan.findAll({
      where: {
        is_active: true,
        is_public: true,
      },
      order: [['sort_order', 'ASC']],
    });

    return plans.map(plan => this._formatPlanResponse(plan));
  }

  /**
   * Get all plans (MASTER only)
   */
  async getAllPlans(includeInactive = false) {
    const where = includeInactive ? {} : { is_active: true };
    
    const plans = await this.SubscriptionPlan.findAll({
      where,
      order: [['sort_order', 'ASC']],
    });

    return plans.map(plan => this._formatPlanResponse(plan, true));
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId) {
    const plan = await this.SubscriptionPlan.findByPk(planId);
    
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    return this._formatPlanResponse(plan, true);
  }

  /**
   * Get plan by slug
   */
  async getPlanBySlug(slug) {
    const plan = await this.SubscriptionPlan.findOne({
      where: { slug },
    });
    
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    return this._formatPlanResponse(plan, true);
  }

  /**
   * Create a new plan (MASTER only)
   */
  async createPlan(data, userId = null) {
    // Validate pricing
    this._validatePricing(data);

    // Calculate yearly price if not provided
    if (data.price_monthly && !data.price_yearly) {
      const discount = data.annual_discount_percentage || BILLING_DEFAULTS.DEFAULT_ANNUAL_DISCOUNT;
      data.price_yearly = this._calculateYearlyPrice(data.price_monthly, discount);
    }

    const plan = await this.SubscriptionPlan.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price_monthly || 0,
      price_monthly: data.price_monthly || 0,
      price_yearly: data.price_yearly || 0,
      annual_discount_percentage: data.annual_discount_percentage || BILLING_DEFAULTS.DEFAULT_ANNUAL_DISCOUNT,
      currency: data.currency || 'BRL',
      billing_interval: data.billing_interval || 'monthly',
      trial_days: data.trial_days || 0,
      limits: data.limits || {},
      features: data.features || [],
      max_users: data.max_users,
      max_professionals: data.max_professionals,
      max_appointments_per_month: data.max_appointments_per_month,
      is_active: data.is_active !== false,
      is_public: data.is_public !== false,
      is_highlighted: data.is_highlighted || false,
      sort_order: data.sort_order || 0,
      metadata: data.metadata || {},
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.PLAN_CREATED,
        entityType: 'subscription_plan',
        entityId: plan.id,
        newValues: plan.toJSON(),
        userId,
      });
    }

    return this._formatPlanResponse(plan, true);
  }

  /**
   * Update a plan (MASTER only)
   */
  async updatePlan(planId, data, userId = null) {
    const plan = await this.SubscriptionPlan.findByPk(planId);
    
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    const oldValues = plan.toJSON();

    // Validate pricing if changing
    if (data.price_monthly !== undefined || data.price_yearly !== undefined) {
      this._validatePricing(data);
    }

    // Recalculate yearly price if monthly changed
    if (data.price_monthly !== undefined && data.price_yearly === undefined) {
      const discount = data.annual_discount_percentage || plan.annual_discount_percentage;
      data.price_yearly = this._calculateYearlyPrice(data.price_monthly, discount);
      data.price = data.price_monthly;
    }

    // Update only provided fields
    const updateFields = [
      'name', 'description', 'price', 'price_monthly', 'price_yearly',
      'annual_discount_percentage', 'trial_days', 'limits', 'features',
      'max_users', 'max_professionals', 'max_appointments_per_month',
      'is_active', 'is_public', 'is_highlighted', 'sort_order', 'metadata',
    ];

    for (const field of updateFields) {
      if (data[field] !== undefined) {
        plan[field] = data[field];
      }
    }

    await plan.save();

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.PLAN_UPDATED,
        entityType: 'subscription_plan',
        entityId: plan.id,
        oldValues,
        newValues: plan.toJSON(),
        userId,
      });
    }

    return this._formatPlanResponse(plan, true);
  }

  /**
   * Activate a plan
   */
  async activatePlan(planId, userId = null) {
    return this.updatePlan(planId, { is_active: true }, userId);
  }

  /**
   * Deactivate a plan
   */
  async deactivatePlan(planId, userId = null) {
    // Check if any active subscriptions use this plan
    const activeCount = await this.Subscription.count({
      where: {
        plan_id: planId,
        status: ['trial', 'active'],
      },
    });

    if (activeCount > 0) {
      throw new ValidationError(
        `Cannot deactivate plan with ${activeCount} active subscriptions. ` +
        'Migrate subscriptions to another plan first.'
      );
    }

    const plan = await this.SubscriptionPlan.findByPk(planId);
    const oldValues = plan.toJSON();

    plan.is_active = false;
    await plan.save();

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.PLAN_DEACTIVATED,
        entityType: 'subscription_plan',
        entityId: plan.id,
        oldValues,
        newValues: plan.toJSON(),
        userId,
      });
    }

    return this._formatPlanResponse(plan, true);
  }

  /**
   * Get price for a billing cycle
   */
  getPriceForCycle(plan, billingCycle) {
    if (billingCycle === BILLING_CYCLE.YEARLY) {
      return parseFloat(plan.price_yearly || 0);
    }
    return parseFloat(plan.price_monthly || plan.price || 0);
  }

  /**
   * Calculate savings for annual plan
   */
  calculateAnnualSavings(plan) {
    const monthlyTotal = parseFloat(plan.price_monthly || 0) * 12;
    const yearlyPrice = parseFloat(plan.price_yearly || 0);
    
    if (monthlyTotal === 0 || yearlyPrice === 0) return 0;
    
    return monthlyTotal - yearlyPrice;
  }

  /**
   * Check if downgrade violates limits
   */
  async validateDowngrade(currentPlanId, targetPlanId, tenantId) {
    const targetPlan = await this.SubscriptionPlan.findByPk(targetPlanId);
    
    if (!targetPlan) {
      throw new NotFoundError('Target plan not found');
    }

    // Get current usage (this would need to be implemented based on your usage tracking)
    const currentUsage = await this._getTenantUsage(tenantId);
    const violations = [];

    // Check limits
    if (targetPlan.max_users && currentUsage.users > targetPlan.max_users) {
      violations.push({
        limit: 'users',
        current: currentUsage.users,
        allowed: targetPlan.max_users,
      });
    }

    if (targetPlan.max_professionals && currentUsage.professionals > targetPlan.max_professionals) {
      violations.push({
        limit: 'professionals',
        current: currentUsage.professionals,
        allowed: targetPlan.max_professionals,
      });
    }

    if (violations.length > 0) {
      throw new ValidationError('Downgrade violates current usage limits', { violations });
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  _validatePricing(data) {
    if (data.price_monthly !== undefined && data.price_monthly < 0) {
      throw new ValidationError('Monthly price cannot be negative');
    }
    if (data.price_yearly !== undefined && data.price_yearly < 0) {
      throw new ValidationError('Yearly price cannot be negative');
    }
    if (data.annual_discount_percentage !== undefined) {
      if (data.annual_discount_percentage < 0 || data.annual_discount_percentage > 100) {
        throw new ValidationError('Annual discount must be between 0 and 100');
      }
    }
  }

  _calculateYearlyPrice(monthlyPrice, discountPercentage) {
    const annual = monthlyPrice * 12;
    const discount = annual * (discountPercentage / 100);
    return Math.round((annual - discount) * 100) / 100;
  }

  _formatPlanResponse(plan, includeInternal = false) {
    const response = {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      pricing: {
        monthly: parseFloat(plan.price_monthly || plan.price || 0),
        yearly: parseFloat(plan.price_yearly || 0),
        currency: plan.currency,
        annual_discount_percentage: parseFloat(plan.annual_discount_percentage || 0),
        annual_savings: this.calculateAnnualSavings(plan),
      },
      trial_days: plan.trial_days,
      limits: plan.limits || {},
      features: plan.features || [],
      max_users: plan.max_users,
      max_professionals: plan.max_professionals,
      max_appointments_per_month: plan.max_appointments_per_month,
      is_highlighted: plan.is_highlighted,
      sort_order: plan.sort_order,
    };

    if (includeInternal) {
      response.is_active = plan.is_active;
      response.is_public = plan.is_public;
      response.stripe_price_id = plan.stripe_price_id;
      response.stripe_product_id = plan.stripe_product_id;
      response.metadata = plan.metadata;
      response.created_at = plan.created_at;
      response.updated_at = plan.updated_at;
    }

    return response;
  }

  async _getTenantUsage(tenantId) {
    // This should be implemented based on your models
    // For now, return empty usage
    return {
      users: 0,
      professionals: 0,
      clients: 0,
      appointments: 0,
    };
  }
}

module.exports = PlanService;
