/**
 * Usage Service
 * Real-time usage tracking and limit enforcement
 */

const { Op } = require('sequelize');

class UsageService {
  constructor(sequelize, models) {
    this.sequelize = sequelize;
    this.Tenant = models.Tenant;
    this.Subscription = models.Subscription;
    this.SubscriptionPlan = models.SubscriptionPlan;
    this.UsageLog = models.UsageLog;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USAGE METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  static METRICS = {
    USERS: 'users',
    PROFESSIONALS: 'professionals',
    CLIENTS: 'clients',
    APPOINTMENTS: 'appointments',
    STORAGE_MB: 'storage_mb',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL-TIME USAGE COUNTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current usage for a tenant (real-time from database)
   */
  async getTenantUsage(tenantId) {
    const [results] = await this.sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND deleted_at IS NULL) as users,
        (SELECT COUNT(*) FROM professionals WHERE tenant_id = $1 AND deleted_at IS NULL) as professionals,
        (SELECT COUNT(*) FROM clients WHERE tenant_id = $1 AND deleted_at IS NULL) as clients,
        (SELECT COUNT(*) FROM appointments 
         WHERE tenant_id = $1 
         AND deleted_at IS NULL
         AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
        ) as appointments_this_month
    `, {
      bind: [tenantId],
      type: this.sequelize.QueryTypes.SELECT,
    });

    return {
      users: parseInt(results.users || 0, 10),
      professionals: parseInt(results.professionals || 0, 10),
      clients: parseInt(results.clients || 0, 10),
      appointments: parseInt(results.appointments_this_month || 0, 10),
    };
  }

  /**
   * Get usage with plan limits for comparison
   */
  async getTenantUsageWithLimits(tenantId) {
    const usage = await this.getTenantUsage(tenantId);
    
    // Get current subscription and plan
    const subscription = await this.Subscription.findOne({
      where: { tenant_id: tenantId },
      include: [{ model: this.SubscriptionPlan, as: 'plan' }],
      order: [['created_at', 'DESC']],
    });

    if (!subscription?.plan) {
      return { usage, limits: null, violations: [] };
    }

    const plan = subscription.plan;
    const limits = {
      users: plan.limits?.users || plan.max_users || null,
      professionals: plan.limits?.professionals || plan.max_professionals || null,
      clients: plan.limits?.clients || null,
      appointments: plan.limits?.appointments_per_month || plan.max_appointments_per_month || null,
    };

    // Check for violations
    const violations = [];
    for (const [metric, current] of Object.entries(usage)) {
      const limit = limits[metric];
      if (limit && current >= limit) {
        violations.push({
          metric,
          current,
          limit,
          percentage: Math.round((current / limit) * 100),
        });
      }
    }

    return {
      usage,
      limits,
      violations,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
      },
    };
  }

  /**
   * Check if a specific metric is within limits
   */
  async checkLimit(tenantId, metric) {
    const { usage, limits, violations } = await this.getTenantUsageWithLimits(tenantId);
    
    const current = usage[metric] || 0;
    const limit = limits?.[metric];

    if (!limit) {
      return { allowed: true, current, limit: null };
    }

    const allowed = current < limit;
    const remaining = Math.max(0, limit - current);
    const percentage = Math.round((current / limit) * 100);

    return {
      allowed,
      current,
      limit,
      remaining,
      percentage,
    };
  }

  /**
   * Increment usage counter (for tracking purposes)
   */
  async incrementUsage(tenantId, metric, quantity = 1, metadata = {}) {
    const periodKey = this._getCurrentPeriodKey();

    // Upsert usage counter
    await this.sequelize.query(`
      INSERT INTO usage_counters (id, tenant_id, metric, period_key, count, last_updated_at, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW(), NOW())
      ON CONFLICT (tenant_id, metric, period_key)
      DO UPDATE SET 
        count = usage_counters.count + $4,
        last_updated_at = NOW(),
        updated_at = NOW()
    `, {
      bind: [tenantId, metric, periodKey, quantity],
    });

    // Also log in usage_logs for detailed tracking
    if (this.UsageLog) {
      await this.UsageLog.recordUsage(tenantId, metric, quantity, metadata);
    }

    return true;
  }

  /**
   * Decrement usage counter
   */
  async decrementUsage(tenantId, metric, quantity = 1) {
    const periodKey = this._getCurrentPeriodKey();

    await this.sequelize.query(`
      UPDATE usage_counters
      SET count = GREATEST(0, count - $4),
          last_updated_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = $1 AND metric = $2 AND period_key = $3
    `, {
      bind: [tenantId, metric, periodKey, quantity],
    });

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MONTHLY RESET
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reset monthly usage counters (run via cron job)
   */
  async resetMonthlyCounters() {
    const previousPeriod = this._getPreviousPeriodKey();
    const currentPeriod = this._getCurrentPeriodKey();

    console.log(`[UsageService] Resetting monthly counters. Previous: ${previousPeriod}, Current: ${currentPeriod}`);

    // Get all active tenants
    const tenants = await this.Tenant.findAll({
      where: { status: 'active' },
      attributes: ['id'],
    });

    const results = {
      processed: 0,
      created: 0,
      errors: [],
    };

    for (const tenant of tenants) {
      try {
        // Create new counters for the current period with 0 count
        const metricsToReset = ['appointments']; // Only reset monthly metrics

        for (const metric of metricsToReset) {
          await this.sequelize.query(`
            INSERT INTO usage_counters (id, tenant_id, metric, period_key, count, last_updated_at, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, 0, NOW(), NOW(), NOW())
            ON CONFLICT (tenant_id, metric, period_key) DO NOTHING
          `, {
            bind: [tenant.id, metric, currentPeriod],
          });
        }

        results.processed++;
        results.created++;
      } catch (error) {
        results.errors.push({ tenantId: tenant.id, error: error.message });
      }
    }

    console.log(`[UsageService] Monthly reset complete:`, results);
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNGRADE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate if tenant can downgrade to a specific plan
   */
  async validateDowngrade(tenantId, targetPlanId) {
    const usage = await this.getTenantUsage(tenantId);
    
    const targetPlan = await this.SubscriptionPlan.findByPk(targetPlanId);
    if (!targetPlan) {
      throw new Error('Target plan not found');
    }

    const violations = [];
    const limits = targetPlan.limits || {};

    // Check each metric
    if (limits.users && usage.users > limits.users) {
      violations.push({
        metric: 'users',
        current: usage.users,
        limit: limits.users,
        excess: usage.users - limits.users,
        action: `Remova ${usage.users - limits.users} usuário(s) antes do downgrade`,
      });
    }

    if (limits.professionals && usage.professionals > limits.professionals) {
      violations.push({
        metric: 'professionals',
        current: usage.professionals,
        limit: limits.professionals,
        excess: usage.professionals - limits.professionals,
        action: `Remova ${usage.professionals - limits.professionals} profissional(is) antes do downgrade`,
      });
    }

    if (limits.clients && usage.clients > limits.clients) {
      violations.push({
        metric: 'clients',
        current: usage.clients,
        limit: limits.clients,
        excess: usage.clients - limits.clients,
        action: `Remova ${usage.clients - limits.clients} cliente(s) antes do downgrade`,
      });
    }

    return {
      canDowngrade: violations.length === 0,
      violations,
      currentUsage: usage,
      targetLimits: limits,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USAGE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get usage summary for a period
   */
  async getUsageSummary(tenantId, startDate, endDate) {
    const [results] = await this.sequelize.query(`
      SELECT 
        metric,
        SUM(quantity) as total,
        COUNT(*) as entry_count,
        MIN(recorded_at) as first_record,
        MAX(recorded_at) as last_record
      FROM usage_logs
      WHERE tenant_id = $1
        AND recorded_at BETWEEN $2 AND $3
      GROUP BY metric
      ORDER BY metric
    `, {
      bind: [tenantId, startDate, endDate],
      type: this.sequelize.QueryTypes.SELECT,
    });

    return results;
  }

  /**
   * Get usage history (for charts)
   */
  async getUsageHistory(tenantId, metric, months = 6) {
    const [results] = await this.sequelize.query(`
      SELECT 
        period_key,
        count
      FROM usage_counters
      WHERE tenant_id = $1 AND metric = $2
      ORDER BY period_key DESC
      LIMIT $3
    `, {
      bind: [tenantId, metric, months],
      type: this.sequelize.QueryTypes.SELECT,
    });

    return results.reverse();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  _getCurrentPeriodKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  _getPreviousPeriodKey() {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

module.exports = UsageService;
