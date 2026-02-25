'use strict';

const { v4: uuidv4 } = require('uuid');

// Inline constants for Sequelize CLI
const BILLING_INTERVAL = { MONTHLY: 'monthly', QUARTERLY: 'quarterly', YEARLY: 'yearly' };
const PLAN_FEATURES = {
  APPOINTMENTS: 'appointments', FINANCIAL: 'financial', CLIENTS: 'clients',
  PROFESSIONALS: 'professionals', REPORTS: 'reports', NOTIFICATIONS: 'notifications',
  API_ACCESS: 'api_access', CUSTOM_BRANDING: 'custom_branding',
  MULTI_LOCATION: 'multi_location', ADVANCED_ANALYTICS: 'advanced_analytics',
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const plans = [
      {
        id: uuidv4(),
        name: 'Starter',
        slug: 'starter',
        description: 'Ideal para profissionais autônomos começando sua jornada digital.',
        price: 49.90,
        currency: 'BRL',
        billing_interval: BILLING_INTERVAL.MONTHLY,
        trial_days: 14,
        limits: JSON.stringify({
          users: 2,
          professionals: 1,
          clients: 50,
          appointments_per_month: 100,
          storage_mb: 100,
        }),
        features: [
          PLAN_FEATURES.APPOINTMENTS,
          PLAN_FEATURES.CLIENTS,
          PLAN_FEATURES.NOTIFICATIONS,
        ],
        is_active: true,
        is_public: true,
        sort_order: 1,
        metadata: JSON.stringify({}),
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        name: 'Professional',
        slug: 'professional',
        description: 'Para estabelecimentos em crescimento com equipe pequena.',
        price: 99.90,
        currency: 'BRL',
        billing_interval: BILLING_INTERVAL.MONTHLY,
        trial_days: 14,
        limits: JSON.stringify({
          users: 5,
          professionals: 3,
          clients: 200,
          appointments_per_month: 500,
          storage_mb: 500,
        }),
        features: [
          PLAN_FEATURES.APPOINTMENTS,
          PLAN_FEATURES.CLIENTS,
          PLAN_FEATURES.FINANCIAL,
          PLAN_FEATURES.PROFESSIONALS,
          PLAN_FEATURES.NOTIFICATIONS,
          PLAN_FEATURES.REPORTS,
        ],
        is_active: true,
        is_public: true,
        sort_order: 2,
        metadata: JSON.stringify({ popular: true }),
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        name: 'Business',
        slug: 'business',
        description: 'Solução completa para salões e clínicas com múltiplos profissionais.',
        price: 199.90,
        currency: 'BRL',
        billing_interval: BILLING_INTERVAL.MONTHLY,
        trial_days: 14,
        limits: JSON.stringify({
          users: 15,
          professionals: 10,
          clients: 1000,
          appointments_per_month: 2000,
          storage_mb: 2000,
        }),
        features: [
          PLAN_FEATURES.APPOINTMENTS,
          PLAN_FEATURES.CLIENTS,
          PLAN_FEATURES.FINANCIAL,
          PLAN_FEATURES.PROFESSIONALS,
          PLAN_FEATURES.NOTIFICATIONS,
          PLAN_FEATURES.REPORTS,
          PLAN_FEATURES.API_ACCESS,
          PLAN_FEATURES.CUSTOM_BRANDING,
          PLAN_FEATURES.ADVANCED_ANALYTICS,
        ],
        is_active: true,
        is_public: true,
        sort_order: 3,
        metadata: JSON.stringify({}),
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Para redes de salões e franquias com necessidades avançadas.',
        price: 499.90,
        currency: 'BRL',
        billing_interval: BILLING_INTERVAL.MONTHLY,
        trial_days: 30,
        limits: JSON.stringify({
          users: -1, // Unlimited
          professionals: -1,
          clients: -1,
          appointments_per_month: -1,
          storage_mb: 10000,
        }),
        features: Object.values(PLAN_FEATURES),
        is_active: true,
        is_public: false, // Contact sales
        sort_order: 4,
        metadata: JSON.stringify({ contact_sales: true }),
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('subscription_plans', plans);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('subscription_plans', null, {});
  },
};
