'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Inline constants for Sequelize CLI
const TENANT_STATUS = { PENDING: 'pending', ACTIVE: 'active', SUSPENDED: 'suspended', CANCELLED: 'cancelled' };
const SUBSCRIPTION_STATUS = { TRIAL: 'trial', ACTIVE: 'active', PAST_DUE: 'past_due', CANCELLED: 'cancelled', EXPIRED: 'expired' };
const ROLES = { CLIENT: 'client', PROFESSIONAL: 'professional', ADMIN: 'admin', OWNER: 'owner', MASTER: 'master' };

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash('123456', 10);

    // 1. Create MASTER user (no tenant)
    const masterId = uuidv4();
    await queryInterface.bulkInsert('users', [{
      id: masterId,
      tenant_id: null,
      first_name: 'Master',
      last_name: 'Admin',
      email: 'master@beautyhub.com',
      password: passwordHash,
      phone: '11999999999',
      role: ROLES.MASTER,
      is_active: true,
      email_verified_at: now,
      settings: JSON.stringify({
        notifications: { email: true, push: true, sms: false },
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
      }),
      metadata: JSON.stringify({}),
      created_at: now,
      updated_at: now,
    }]);

    // 2. Create demo tenant
    const tenantId = uuidv4();
    await queryInterface.bulkInsert('tenants', [{
      id: tenantId,
      name: 'Salão Beleza Pura',
      slug: 'beleza-pura',
      email: 'contato@belezapura.com',
      phone: '11987654321',
      document_type: 'cnpj',
      document: '12345678000190',
      type: 'establishment',
      status: TENANT_STATUS.ACTIVE,
      address: JSON.stringify({
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234567',
        country: 'BR',
      }),
      settings: JSON.stringify({
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        language: 'pt-BR',
        notificationsEnabled: true,
        allowOnlineBooking: true,
        requirePaymentOnBooking: false,
        cancellationPolicyHours: 24,
      }),
      branding: JSON.stringify({
        primaryColor: '#20B2AA',
        secondaryColor: '#E91E63',
      }),
      activated_at: now,
      created_at: now,
      updated_at: now,
    }]);

    // 3. Create OWNER user for tenant
    const ownerId = uuidv4();
    await queryInterface.bulkInsert('users', [{
      id: ownerId,
      tenant_id: tenantId,
      first_name: 'Maria',
      last_name: 'Silva',
      email: 'owner@belezapura.com',
      password: passwordHash,
      phone: '11987654321',
      role: ROLES.OWNER,
      is_active: true,
      email_verified_at: now,
      settings: JSON.stringify({
        notifications: { email: true, push: true, sms: true },
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
      }),
      metadata: JSON.stringify({}),
      created_at: now,
      updated_at: now,
    }]);

    // 4. Update tenant with owner_id
    await queryInterface.bulkUpdate('tenants', 
      { owner_id: ownerId },
      { id: tenantId }
    );

    // 5. Create ADMIN user for tenant
    const adminId = uuidv4();
    await queryInterface.bulkInsert('users', [{
      id: adminId,
      tenant_id: tenantId,
      first_name: 'João',
      last_name: 'Admin',
      email: 'admin@belezapura.com',
      password: passwordHash,
      phone: '11912345678',
      role: ROLES.ADMIN,
      is_active: true,
      email_verified_at: now,
      settings: JSON.stringify({
        notifications: { email: true, push: true, sms: false },
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
      }),
      metadata: JSON.stringify({}),
      created_at: now,
      updated_at: now,
    }]);

    // 6. Create PROFESSIONAL user for tenant
    const profId = uuidv4();
    await queryInterface.bulkInsert('users', [{
      id: profId,
      tenant_id: tenantId,
      first_name: 'Ana',
      last_name: 'Profissional',
      email: 'prof@belezapura.com',
      password: passwordHash,
      phone: '11998765432',
      role: ROLES.PROFESSIONAL,
      is_active: true,
      email_verified_at: now,
      settings: JSON.stringify({
        notifications: { email: true, push: true, sms: false },
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
      }),
      metadata: JSON.stringify({ specialty: 'Extensão de Cílios' }),
      created_at: now,
      updated_at: now,
    }]);

    // 7. Get Professional plan and create subscription
    const [plans] = await queryInterface.sequelize.query(
      "SELECT id FROM subscription_plans WHERE slug = 'professional' LIMIT 1"
    );
    
    if (plans.length > 0) {
      const planId = plans[0].id;
      const trialEnds = new Date(now);
      trialEnds.setDate(trialEnds.getDate() + 14);

      await queryInterface.bulkInsert('subscriptions', [{
        id: uuidv4(),
        tenant_id: tenantId,
        plan_id: planId,
        status: SUBSCRIPTION_STATUS.TRIAL,
        started_at: now,
        trial_ends_at: trialEnds,
        quantity: 1,
        plan_snapshot: JSON.stringify({
          name: 'Professional',
          price: 99.90,
          limits: {
            users: 5,
            professionals: 3,
            clients: 200,
            appointments_per_month: 500,
          },
        }),
        metadata: JSON.stringify({}),
        created_at: now,
        updated_at: now,
      }]);
    }

    console.log('\n✅ Seed data created successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('─────────────────────────────────────');
    console.log('MASTER:  master@beautyhub.com / 123456');
    console.log('OWNER:   owner@belezapura.com / 123456');
    console.log('ADMIN:   admin@belezapura.com / 123456');
    console.log('PROF:    prof@belezapura.com / 123456');
    console.log('─────────────────────────────────────');
    console.log('Tenant Slug: beleza-pura');
    console.log('');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('subscriptions', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('tenants', null, {});
  },
};
