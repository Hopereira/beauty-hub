/**
 * UsageLog Model
 * Tracks usage metrics for billing and analytics
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UsageLog = sequelize.define('UsageLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // References
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id',
      },
    },

    // Usage type
    metric: {
      type: DataTypes.STRING(50),
      allowNull: false,
      // Examples: appointments, users, storage, api_calls, sms_sent, emails_sent
    },

    // Quantity
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    // Period
    period_start: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    period_end: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // Aggregated values (for reporting)
    total_in_period: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // Cost (if applicable for usage-based billing)
    unit_cost: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      defaultValue: 0,
    },
    total_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },

    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },

    // Timestamp of the event
    recorded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'usage_logs',
    timestamps: true,
    paranoid: false, // Don't soft delete usage logs
    underscored: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['subscription_id'] },
      { fields: ['metric'] },
      { fields: ['period_start', 'period_end'] },
      { fields: ['recorded_at'] },
      { fields: ['tenant_id', 'metric', 'period_start'] },
    ],
  });

  // Class methods
  UsageLog.recordUsage = async function(tenantId, metric, quantity = 1, metadata = {}) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.create({
      tenant_id: tenantId,
      metric,
      quantity,
      period_start: periodStart,
      period_end: periodEnd,
      recorded_at: now,
      metadata,
    });
  };

  UsageLog.getUsageSummary = async function(tenantId, metric, periodStart, periodEnd) {
    const { fn, col, Op } = require('sequelize');

    const result = await this.findOne({
      where: {
        tenant_id: tenantId,
        metric,
        recorded_at: {
          [Op.between]: [periodStart, periodEnd],
        },
      },
      attributes: [
        [fn('SUM', col('quantity')), 'total'],
        [fn('COUNT', col('id')), 'count'],
      ],
      raw: true,
    });

    return {
      metric,
      total: parseInt(result?.total || 0, 10),
      count: parseInt(result?.count || 0, 10),
      period: { start: periodStart, end: periodEnd },
    };
  };

  UsageLog.getCurrentMonthUsage = async function(tenantId, metric) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.getUsageSummary(tenantId, metric, periodStart, periodEnd);
  };

  return UsageLog;
};
