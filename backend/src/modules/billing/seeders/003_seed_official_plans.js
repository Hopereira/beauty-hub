'use strict';

/**
 * Seeder: Official Subscription Plans
 * Creates the 4 official plans: Starter, Growth, Professional, Enterprise
 */

const { v4: uuidv4 } = require('uuid');

const PLAN_FEATURES = {
  APPOINTMENTS: 'Agendamentos',
  FINANCIAL: 'Gestão Financeira',
  CLIENTS: 'Cadastro de Clientes',
  PROFESSIONALS: 'Gestão de Profissionais',
  REPORTS: 'Relatórios',
  NOTIFICATIONS: 'Notificações',
  API_ACCESS: 'Acesso à API',
  CUSTOM_BRANDING: 'Marca Personalizada',
  MULTI_LOCATION: 'Múltiplas Unidades',
  ADVANCED_ANALYTICS: 'Analytics Avançado',
  INVENTORY: 'Controle de Estoque',
  SUPPLIERS: 'Gestão de Fornecedores',
  PURCHASES: 'Controle de Compras',
};

const PLANS = [
  {
    id: uuidv4(),
    name: 'Starter',
    slug: 'starter',
    description: 'Ideal para começar. Teste grátis por 30 dias.',
    price: 0,
    currency: 'BRL',
    billing_interval: 'monthly',
    trial_days: 30,
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
      PLAN_FEATURES.REPORTS,
    ],
    is_active: true,
    is_public: true,
    sort_order: 1,
    metadata: JSON.stringify({ tier: 'free', popular: false }),
  },
  {
    id: uuidv4(),
    name: 'Growth',
    slug: 'growth',
    description: 'Para pequenos negócios em crescimento.',
    price: 29.90,
    currency: 'BRL',
    billing_interval: 'monthly',
    trial_days: 7,
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
      PLAN_FEATURES.NOTIFICATIONS,
      PLAN_FEATURES.FINANCIAL,
      PLAN_FEATURES.REPORTS,
      PLAN_FEATURES.PROFESSIONALS,
      PLAN_FEATURES.INVENTORY,
    ],
    is_active: true,
    is_public: true,
    sort_order: 2,
    metadata: JSON.stringify({ tier: 'basic', popular: false }),
  },
  {
    id: uuidv4(),
    name: 'Professional',
    slug: 'professional',
    description: 'Para salões e clínicas estabelecidos. Mais popular!',
    price: 59.90,
    currency: 'BRL',
    billing_interval: 'monthly',
    trial_days: 7,
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
      PLAN_FEATURES.NOTIFICATIONS,
      PLAN_FEATURES.FINANCIAL,
      PLAN_FEATURES.REPORTS,
      PLAN_FEATURES.PROFESSIONALS,
      PLAN_FEATURES.INVENTORY,
      PLAN_FEATURES.SUPPLIERS,
      PLAN_FEATURES.PURCHASES,
      PLAN_FEATURES.CUSTOM_BRANDING,
    ],
    is_active: true,
    is_public: true,
    sort_order: 3,
    metadata: JSON.stringify({ tier: 'professional', popular: true }),
  },
  {
    id: uuidv4(),
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Para grandes redes e franquias. Recursos ilimitados.',
    price: 99.90,
    currency: 'BRL',
    billing_interval: 'monthly',
    trial_days: 14,
    limits: JSON.stringify({
      users: 999999,
      professionals: 999999,
      clients: 999999,
      appointments_per_month: 999999,
      storage_mb: 10000,
    }),
    features: [
      PLAN_FEATURES.APPOINTMENTS,
      PLAN_FEATURES.CLIENTS,
      PLAN_FEATURES.NOTIFICATIONS,
      PLAN_FEATURES.FINANCIAL,
      PLAN_FEATURES.REPORTS,
      PLAN_FEATURES.PROFESSIONALS,
      PLAN_FEATURES.INVENTORY,
      PLAN_FEATURES.SUPPLIERS,
      PLAN_FEATURES.PURCHASES,
      PLAN_FEATURES.CUSTOM_BRANDING,
      PLAN_FEATURES.MULTI_LOCATION,
      PLAN_FEATURES.ADVANCED_ANALYTICS,
      PLAN_FEATURES.API_ACCESS,
    ],
    is_active: true,
    is_public: true,
    sort_order: 4,
    metadata: JSON.stringify({ tier: 'enterprise', popular: false }),
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Transform plans for insertion
    const plansToInsert = PLANS.map(plan => ({
      ...plan,
      features: `{${plan.features.join(',')}}`, // PostgreSQL array format
      created_at: now,
      updated_at: now,
    }));

    // Upsert plans (update if slug exists)
    for (const plan of plansToInsert) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM subscription_plans WHERE slug = :slug`,
        {
          replacements: { slug: plan.slug },
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      if (existing.length > 0) {
        // Update existing plan
        const { id, created_at, ...updateData } = plan;
        await queryInterface.sequelize.query(
          `UPDATE subscription_plans SET
            name = :name,
            description = :description,
            price = :price,
            currency = :currency,
            billing_interval = :billing_interval,
            trial_days = :trial_days,
            limits = :limits,
            features = :features,
            is_active = :is_active,
            is_public = :is_public,
            sort_order = :sort_order,
            metadata = :metadata,
            updated_at = :updated_at
          WHERE slug = :slug`,
          {
            replacements: { ...updateData, slug: plan.slug },
            type: Sequelize.QueryTypes.UPDATE,
          }
        );
      } else {
        // Insert new plan
        await queryInterface.bulkInsert('subscription_plans', [plan]);
      }
    }

    console.log('✅ Official plans seeded/updated successfully');
  },

  async down(queryInterface, Sequelize) {
    const slugs = PLANS.map(p => p.slug);
    
    await queryInterface.bulkDelete('subscription_plans', {
      slug: slugs,
    });

    console.log('✅ Official plans removed');
  },
};
