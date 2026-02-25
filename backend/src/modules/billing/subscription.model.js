/**
 * Subscription Model
 * Represents a tenant's subscription to a plan
 */

const { DataTypes } = require('sequelize');
const { SUBSCRIPTION_STATUS } = require('../../shared/constants');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
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
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subscription_plans',
        key: 'id',
      },
    },

    // Status
    status: {
      type: DataTypes.ENUM(...Object.values(SUBSCRIPTION_STATUS)),
      allowNull: false,
      defaultValue: SUBSCRIPTION_STATUS.TRIAL,
    },

    // Dates
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ends_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Billing
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    // Stripe integration
    stripe_subscription_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    stripe_customer_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    // Plan snapshot (stores plan details at time of subscription)
    plan_snapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['plan_id'] },
      { fields: ['status'] },
      { fields: ['current_period_end'] },
      { fields: ['trial_ends_at'] },
      { fields: ['stripe_subscription_id'] },
      { fields: ['stripe_customer_id'] },
    ],
  });

  // Instance methods
  Subscription.prototype.isActive = function() {
    return [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(this.status);
  };

  Subscription.prototype.isTrialing = function() {
    return this.status === SUBSCRIPTION_STATUS.TRIAL && 
           this.trial_ends_at && 
           new Date(this.trial_ends_at) > new Date();
  };

  Subscription.prototype.isExpired = function() {
    if (this.status === SUBSCRIPTION_STATUS.EXPIRED) return true;
    if (this.ends_at && new Date(this.ends_at) < new Date()) return true;
    if (this.status === SUBSCRIPTION_STATUS.TRIAL && 
        this.trial_ends_at && 
        new Date(this.trial_ends_at) < new Date()) return true;
    return false;
  };

  Subscription.prototype.daysUntilExpiry = function() {
    const endDate = this.ends_at || this.trial_ends_at || this.current_period_end;
    if (!endDate) return null;
    
    const diff = new Date(endDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  Subscription.prototype.cancel = async function() {
    this.status = SUBSCRIPTION_STATUS.CANCELLED;
    this.cancelled_at = new Date();
    return this.save();
  };

  Subscription.prototype.activate = async function() {
    this.status = SUBSCRIPTION_STATUS.ACTIVE;
    return this.save();
  };

  return Subscription;
};
