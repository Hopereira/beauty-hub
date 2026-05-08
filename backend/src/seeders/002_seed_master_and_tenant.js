'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Inline constants for Sequelize CLI
const TENANT_STATUS = { PENDING: 'pending', ACTIVE: 'active', SUSPENDED: 'suspended', CANCELLED: 'cancelled' };
const SUBSCRIPTION_STATUS = { TRIAL: 'trial', ACTIVE: 'active', PAST_DUE: 'past_due', CANCELLED: 'cancelled', EXPIRED: 'expired' };
const ROLES = { CLIENT: 'client', PROFESSIONAL: 'professional', ADMIN: 'admin', OWNER: 'owner', MASTER: 'master' };

/**
 * Gera senha segura aleatória
 * @param {number} length - Tamanho da senha (default: 16)
 * @returns {string} Senha segura
 */
function generateSecurePassword(length = 16) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

module.exports = {
  async up(queryInterface) {
    // ────────────────────────────────────────────────────────────────────────────
    // SEGURANÇA: Proteção contra execução em produção
    // ────────────────────────────────────────────────────────────────────────────
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PROD !== 'true') {
      console.log('[SEEDER] Bloqueado em produção. Use ALLOW_SEED_IN_PROD=true para forçar.');
      console.log('[SEEDER] Recomendado: criar usuários via API/admin, não seeder.');
      return;
    }

    const now = new Date();
    
    // ────────────────────────────────────────────────────────────────────────────
    // SEGURANÇA: Senhas seguras com bcrypt 12 rounds
    // ────────────────────────────────────────────────────────────────────────────
    // 1. Master password: variável de ambiente ou aleatória
    const masterPassword = process.env.MASTER_SEED_PASSWORD || generateSecurePassword(22);
    const ownerPassword = process.env.OWNER_SEED_PASSWORD || masterPassword;
    
    // Aumentar rounds para 12 (mais seguro que 10)
    const BCRYPT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(masterPassword, BCRYPT_ROUNDS);
    const ownerPasswordHash = await bcrypt.hash(ownerPassword, BCRYPT_ROUNDS);
    
    // Log de senhas (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development' || process.env.LOG_SEED_PASSWORDS === 'true') {
      console.log('══════════════════════════════════════════════════════════════════');
      console.log('[SEEDER] ATENÇÃO: Senhas geradas (guarde em local seguro):');
      console.log(`[SEEDER] Master User (master@beautyhub.com): ${masterPassword}`);
      console.log(`[SEEDER] Owner User (owner@belezapura.com): ${ownerPassword}`);
      console.log('[SEEDER] Recomendado: Alterar senhas após primeiro login');
      console.log('══════════════════════════════════════════════════════════════════');
    }

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
      password: ownerPasswordHash,
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

    // ── 8. Create a second PROFESSIONAL user ──
    const profUser2Id = uuidv4();
    await queryInterface.bulkInsert('users', [{
      id: profUser2Id,
      tenant_id: tenantId,
      first_name: 'Carlos',
      last_name: 'Santos',
      email: 'carlos@belezapura.com',
      password: passwordHash,
      phone: '11933334444',
      role: ROLES.PROFESSIONAL,
      is_active: true,
      email_verified_at: now,
      settings: JSON.stringify({ notifications: { email: true, push: true, sms: false }, language: 'pt-BR', timezone: 'America/Sao_Paulo' }),
      metadata: JSON.stringify({ specialty: 'Cabeleireiro' }),
      created_at: now,
      updated_at: now,
    }]);

    // ── 9. Professionals table (with tenant_id) ──
    const professional1Id = uuidv4();
    const professional2Id = uuidv4();
    await queryInterface.bulkInsert('professionals', [
      { id: professional1Id, user_id: profId, tenant_id: tenantId, specialty: 'Extensão de Cílios', commission_rate: 40.00, created_at: now, updated_at: now },
      { id: professional2Id, user_id: profUser2Id, tenant_id: tenantId, specialty: 'Cabeleireiro', commission_rate: 35.00, created_at: now, updated_at: now },
    ]);

    // ── 10. Services (with tenant_id) ──
    const svc1 = uuidv4(), svc2 = uuidv4(), svc3 = uuidv4(), svc4 = uuidv4(), svc5 = uuidv4();
    await queryInterface.bulkInsert('services', [
      { id: svc1, tenant_id: tenantId, name: 'Extensão de Cílios', description: 'Aplicação completa de extensão fio a fio', price: 150.00, duration_minutes: 90, category: 'skin', is_active: true, created_at: now, updated_at: now },
      { id: svc2, tenant_id: tenantId, name: 'Corte Feminino', description: 'Corte feminino com lavagem e finalização', price: 80.00, duration_minutes: 60, category: 'hair', is_active: true, created_at: now, updated_at: now },
      { id: svc3, tenant_id: tenantId, name: 'Manicure', description: 'Manicure completa com esmaltação', price: 45.00, duration_minutes: 45, category: 'nails', is_active: true, created_at: now, updated_at: now },
      { id: svc4, tenant_id: tenantId, name: 'Coloração', description: 'Coloração completa com produtos premium', price: 200.00, duration_minutes: 120, category: 'hair', is_active: true, created_at: now, updated_at: now },
      { id: svc5, tenant_id: tenantId, name: 'Manutenção de Cílios', description: 'Retoque e manutenção de extensão', price: 90.00, duration_minutes: 60, category: 'skin', is_active: true, created_at: now, updated_at: now },
    ]);

    // ── 11. Clients (with tenant_id) ──
    const cli1 = uuidv4(), cli2 = uuidv4(), cli3 = uuidv4(), cli4 = uuidv4(), cli5 = uuidv4();
    const cli6 = uuidv4(), cli7 = uuidv4(), cli8 = uuidv4(), cli9 = uuidv4(), cli10 = uuidv4();
    await queryInterface.bulkInsert('clients', [
      { id: cli1, tenant_id: tenantId, first_name: 'Thaisa', last_name: 'Oliveira', email: 'thaisa@email.com', phone: '11988881111', created_at: now, updated_at: now },
      { id: cli2, tenant_id: tenantId, first_name: 'Rafaela', last_name: 'Costa', email: 'rafaela@email.com', phone: '11988882222', created_at: now, updated_at: now },
      { id: cli3, tenant_id: tenantId, first_name: 'Taís', last_name: 'Mendes', email: 'tais@email.com', phone: '11988883333', created_at: now, updated_at: now },
      { id: cli4, tenant_id: tenantId, first_name: 'Juliana', last_name: 'Ferreira', email: 'juliana@email.com', phone: '11988884444', created_at: now, updated_at: now },
      { id: cli5, tenant_id: tenantId, first_name: 'Camila', last_name: 'Souza', email: 'camila@email.com', phone: '11988885555', created_at: now, updated_at: now },
      { id: cli6, tenant_id: tenantId, first_name: 'Beatriz', last_name: 'Lima', email: 'beatriz@email.com', phone: '11988886666', created_at: now, updated_at: now },
      { id: cli7, tenant_id: tenantId, first_name: 'Larissa', last_name: 'Almeida', email: 'larissa@email.com', phone: '11988887777', created_at: now, updated_at: now },
      { id: cli8, tenant_id: tenantId, first_name: 'Fernanda', last_name: 'Rocha', email: 'fernanda@email.com', phone: '11988888888', created_at: now, updated_at: now },
      { id: cli9, tenant_id: tenantId, first_name: 'Patrícia', last_name: 'Dias', email: 'patricia@email.com', phone: '11988889999', created_at: now, updated_at: now },
      { id: cli10, tenant_id: tenantId, first_name: 'Amanda', last_name: 'Ribeiro', email: 'amanda@email.com', phone: '11988880000', created_at: now, updated_at: now },
    ]);

    // ── 12. Payment Methods (with tenant_id) ──
    const pmCash = uuidv4(), pmCredit = uuidv4(), pmPix = uuidv4();
    await queryInterface.bulkInsert('payment_methods', [
      { id: pmCash, tenant_id: tenantId, name: 'Dinheiro', is_active: true, created_at: now, updated_at: now },
      { id: pmCredit, tenant_id: tenantId, name: 'Cartão de Crédito', is_active: true, created_at: now, updated_at: now },
      { id: pmPix, tenant_id: tenantId, name: 'Pix', is_active: true, created_at: now, updated_at: now },
    ]);

    // ── 13. Appointments (with tenant_id) ──
    function daysAgo(n) { const d = new Date(now); d.setDate(d.getDate() - n); return d; }
    function daysFromNow(n) { const d = new Date(now); d.setDate(d.getDate() + n); return d; }
    function timeAt(baseDate, hour, minute) { const d = new Date(baseDate); d.setHours(hour, minute || 0, 0, 0); return d; }

    const past5 = daysAgo(5), past3 = daysAgo(3), past1 = daysAgo(1);
    const future2 = daysFromNow(2), future5 = daysFromNow(5), future7 = daysFromNow(7), future10 = daysFromNow(10);
    const todayDate = daysFromNow(0);

    const apt1 = uuidv4(), apt2 = uuidv4(), apt3 = uuidv4(), apt4 = uuidv4(), apt5 = uuidv4();
    const apt6 = uuidv4(), apt7 = uuidv4(), apt8 = uuidv4(), apt9 = uuidv4(), apt10 = uuidv4();
    const aptToday1 = uuidv4(), aptToday2 = uuidv4();

    await queryInterface.bulkInsert('appointments', [
      { id: apt1, tenant_id: tenantId, client_id: cli1, professional_id: professional1Id, service_id: svc1, start_time: timeAt(past5, 10), end_time: timeAt(past5, 11, 30), status: 'COMPLETED', price_charged: 150.00, notes: '', created_at: now, updated_at: now },
      { id: apt2, tenant_id: tenantId, client_id: cli2, professional_id: professional2Id, service_id: svc2, start_time: timeAt(past5, 14), end_time: timeAt(past5, 15), status: 'COMPLETED', price_charged: 80.00, notes: '', created_at: now, updated_at: now },
      { id: apt3, tenant_id: tenantId, client_id: cli3, professional_id: professional1Id, service_id: svc5, start_time: timeAt(past3, 9), end_time: timeAt(past3, 10), status: 'COMPLETED', price_charged: 90.00, notes: '', created_at: now, updated_at: now },
      { id: apt4, tenant_id: tenantId, client_id: cli4, professional_id: professional2Id, service_id: svc4, start_time: timeAt(past3, 13), end_time: timeAt(past3, 15), status: 'COMPLETED', price_charged: 200.00, notes: 'Coloração loiro platinado', created_at: now, updated_at: now },
      { id: apt5, tenant_id: tenantId, client_id: cli5, professional_id: professional1Id, service_id: svc3, start_time: timeAt(past1, 11), end_time: timeAt(past1, 11, 45), status: 'COMPLETED', price_charged: 45.00, notes: '', created_at: now, updated_at: now },
      { id: aptToday1, tenant_id: tenantId, client_id: cli8, professional_id: professional1Id, service_id: svc1, start_time: timeAt(todayDate, 10), end_time: timeAt(todayDate, 11, 30), status: 'CONFIRMED', price_charged: 150.00, notes: '', created_at: now, updated_at: now },
      { id: aptToday2, tenant_id: tenantId, client_id: cli9, professional_id: professional2Id, service_id: svc2, start_time: timeAt(todayDate, 14), end_time: timeAt(todayDate, 15), status: 'PENDING', price_charged: 80.00, notes: '', created_at: now, updated_at: now },
      { id: apt6, tenant_id: tenantId, client_id: cli6, professional_id: professional1Id, service_id: svc1, start_time: timeAt(future2, 10), end_time: timeAt(future2, 11, 30), status: 'CONFIRMED', price_charged: 150.00, notes: '', created_at: now, updated_at: now },
      { id: apt7, tenant_id: tenantId, client_id: cli7, professional_id: professional2Id, service_id: svc2, start_time: timeAt(future2, 14), end_time: timeAt(future2, 15), status: 'PENDING', price_charged: 80.00, notes: '', created_at: now, updated_at: now },
      { id: apt8, tenant_id: tenantId, client_id: cli8, professional_id: professional1Id, service_id: svc5, start_time: timeAt(future5, 9), end_time: timeAt(future5, 10), status: 'PENDING', price_charged: 90.00, notes: '', created_at: now, updated_at: now },
      { id: apt9, tenant_id: tenantId, client_id: cli9, professional_id: professional2Id, service_id: svc4, start_time: timeAt(future7, 10), end_time: timeAt(future7, 12), status: 'PENDING', price_charged: 200.00, notes: '', created_at: now, updated_at: now },
      { id: apt10, tenant_id: tenantId, client_id: cli10, professional_id: professional1Id, service_id: svc1, start_time: timeAt(future10, 15), end_time: timeAt(future10, 16, 30), status: 'PENDING', price_charged: 150.00, notes: '', created_at: now, updated_at: now },
    ]);

    // ── 14. Financial Entries (with tenant_id) ──
    function dateOnly(d) { return d.toISOString().split('T')[0]; }
    await queryInterface.bulkInsert('financial_entries', [
      { id: uuidv4(), tenant_id: tenantId, appointment_id: apt1, client_id: cli1, amount: 150.00, description: 'Extensão de Cílios - Thaisa', entry_date: dateOnly(past5), payment_method_id: pmPix, status: 'PAID', created_at: now, updated_at: now },
      { id: uuidv4(), tenant_id: tenantId, appointment_id: apt2, client_id: cli2, amount: 80.00, description: 'Corte Feminino - Rafaela', entry_date: dateOnly(past5), payment_method_id: pmCredit, status: 'PAID', created_at: now, updated_at: now },
      { id: uuidv4(), tenant_id: tenantId, appointment_id: apt3, client_id: cli3, amount: 90.00, description: 'Manutenção de Cílios - Taís', entry_date: dateOnly(past3), payment_method_id: pmCash, status: 'PAID', created_at: now, updated_at: now },
      { id: uuidv4(), tenant_id: tenantId, appointment_id: apt4, client_id: cli4, amount: 200.00, description: 'Coloração - Juliana', entry_date: dateOnly(past3), payment_method_id: pmCredit, status: 'PAID', created_at: now, updated_at: now },
      { id: uuidv4(), tenant_id: tenantId, appointment_id: apt5, client_id: cli5, amount: 45.00, description: 'Manicure - Camila', entry_date: dateOnly(past1), payment_method_id: pmPix, status: 'PAID', created_at: now, updated_at: now },
      { id: uuidv4(), tenant_id: tenantId, appointment_id: null, client_id: cli6, amount: 120.00, description: 'Venda de produtos - Beatriz', entry_date: dateOnly(past1), payment_method_id: pmCash, status: 'PENDING', created_at: now, updated_at: now },
    ]);

    // ── 15. Financial Exits (with tenant_id) ──
    await queryInterface.bulkInsert('financial_exits', [
      { id: uuidv4(), tenant_id: tenantId, amount: 350.00, description: 'Material de trabalho - cílios e colas', exit_date: dateOnly(daysAgo(10)), category: 'Material', status: 'PAID', created_at: now, updated_at: now },
      { id: uuidv4(), tenant_id: tenantId, amount: 25.00, description: 'Padaria - café e lanches', exit_date: dateOnly(daysAgo(4)), category: 'Alimentação', status: 'PAID', created_at: now, updated_at: now },
      { id: uuidv4(), tenant_id: tenantId, amount: 180.00, description: 'Conta de luz', exit_date: dateOnly(daysAgo(2)), category: 'Contas', status: 'PAID', created_at: now, updated_at: now },
      { id: uuidv4(), tenant_id: tenantId, amount: 1200.00, description: 'Aluguel do salão', exit_date: dateOnly(daysAgo(1)), category: 'Aluguel', status: 'PENDING', created_at: now, updated_at: now },
      { id: uuidv4(), tenant_id: tenantId, amount: 90.00, description: 'Produtos de limpeza', exit_date: dateOnly(daysAgo(7)), category: 'Material', status: 'PAID', created_at: now, updated_at: now },
    ]);

    console.log('\n✅ Seed data created successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('─────────────────────────────────────');
    console.log('MASTER:  master@beautyhub.com / 123456');
    console.log('OWNER:   owner@belezapura.com / 123456');
    console.log('ADMIN:   admin@belezapura.com / 123456');
    console.log('PROF:    prof@belezapura.com / 123456');
    console.log('PROF2:   carlos@belezapura.com / 123456');
    console.log('─────────────────────────────────────');
    console.log('Tenant Slug: beleza-pura');
    console.log('');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('financial_exits', null, {});
    await queryInterface.bulkDelete('financial_entries', null, {});
    await queryInterface.bulkDelete('appointments', null, {});
    await queryInterface.bulkDelete('payment_methods', null, {});
    await queryInterface.bulkDelete('clients', null, {});
    await queryInterface.bulkDelete('services', null, {});
    await queryInterface.bulkDelete('professionals', null, {});
    await queryInterface.bulkDelete('subscriptions', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('tenants', null, {});
  },
};
