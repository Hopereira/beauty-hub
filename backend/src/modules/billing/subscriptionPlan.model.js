/**
 * SubscriptionPlan Model
 * Defines available subscription plans for the SaaS
 */

const { DataTypes } = require('sequelize');
const { BILLING_INTERVAL, PLAN_FEATURES } = require('../../shared/constants');

module.exports = (sequelize) => {
  const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Plan identification
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    slug: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/i,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Pricing
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'BRL',
    },
    billing_interval: {
      type: DataTypes.ENUM(...Object.values(BILLING_INTERVAL)),
      allowNull: false,
      defaultValue: BILLING_INTERVAL.MONTHLY,
    },

    // Trial
    trial_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    // Limits
    limits: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        users: 5,
        professionals: 3,
        clients: 100,
        appointments_per_month: 500,
        storage_mb: 500,
      },
    },

    // Features (enabled features for this plan)
    features: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [
        PLAN_FEATURES.APPOINTMENTS,
        PLAN_FEATURES.CLIENTS,
        PLAN_FEATURES.NOTIFICATIONS,
      ],
    },

    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    // Stripe integration (for future)
    stripe_price_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    stripe_product_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    // Ordering
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  }, {
    tableName: 'subscription_plans',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['is_active'] },
      { fields: ['is_public'] },
      { fields: ['sort_order'] },
    ],
    hooks: {
      beforeValidate: (plan) => {
        if (plan.slug) {
          plan.slug = plan.slug.toLowerCase().trim();
        }
      },
    },
  });

  // Instance methods
  SubscriptionPlan.prototype.hasFeature = function(feature) {
    return this.features.includes(feature);
  };

  SubscriptionPlan.prototype.getLimit = function(limitKey) {
    return this.limits[limitKey] || 0;
  };

  SubscriptionPlan.prototype.toPublicJSON = function() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      price: parseFloat(this.price),
      currency: this.currency,
      billing_interval: this.billing_interval,
      trial_days: this.trial_days,
      limits: this.limits,
      features: this.features,
    };
  };

  return SubscriptionPlan;
};
