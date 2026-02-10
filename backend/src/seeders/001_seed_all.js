'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ── Fixed UUIDs for referential integrity ──
const IDS = {
  // Users
  masterUser: uuidv4(),
  adminUser: uuidv4(),
  profUser1: uuidv4(),
  profUser2: uuidv4(),

  // Establishment
  establishment: uuidv4(),

  // Professionals
  prof1: uuidv4(),
  prof2: uuidv4(),

  // Services
  svc1: uuidv4(),
  svc2: uuidv4(),
  svc3: uuidv4(),
  svc4: uuidv4(),
  svc5: uuidv4(),

  // Clients
  cli1: uuidv4(), cli2: uuidv4(), cli3: uuidv4(), cli4: uuidv4(), cli5: uuidv4(),
  cli6: uuidv4(), cli7: uuidv4(), cli8: uuidv4(), cli9: uuidv4(), cli10: uuidv4(),

  // Payment methods
  pmCash: uuidv4(),
  pmCredit: uuidv4(),
  pmPix: uuidv4(),

  // Appointments
  apt1: uuidv4(), apt2: uuidv4(), apt3: uuidv4(), apt4: uuidv4(), apt5: uuidv4(),
  apt6: uuidv4(), apt7: uuidv4(), apt8: uuidv4(), apt9: uuidv4(), apt10: uuidv4(),
};

const now = new Date();
const ts = { created_at: now, updated_at: now };

function daysAgo(n) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d;
}

function dateOnly(d) {
  return d.toISOString().split('T')[0];
}

function timeAt(baseDate, hour, minute = 0) {
  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d;
}

module.exports = {
  async up(queryInterface) {
    const hash = await bcrypt.hash('123456', 10);

    // ── 1. Users ──
    await queryInterface.bulkInsert('users', [
      { id: IDS.masterUser, email: 'master@master.com', password: hash, role: 'MASTER', first_name: 'Master', last_name: 'Admin', phone: '11900000000', is_active: true, ...ts },
      { id: IDS.adminUser, email: 'admin@admin.com', password: hash, role: 'ADMIN', first_name: 'Admin', last_name: 'Salão', phone: '11911111111', is_active: true, ...ts },
      { id: IDS.profUser1, email: 'prof@prof.com', password: hash, role: 'PROFESSIONAL', first_name: 'Ana', last_name: 'Silva', phone: '11922222222', is_active: true, ...ts },
      { id: IDS.profUser2, email: 'prof2@prof.com', password: hash, role: 'PROFESSIONAL', first_name: 'Carlos', last_name: 'Santos', phone: '11933333333', is_active: true, ...ts },
    ]);

    // ── 2. Establishment ──
    await queryInterface.bulkInsert('establishments', [
      { id: IDS.establishment, user_id: IDS.adminUser, name: 'Beauty Hub Salão', address: 'Rua das Flores, 123 - São Paulo/SP', phone: '1140001234', email: 'contato@beautyhub.com', cnpj: '12.345.678/0001-90', opening_hours: JSON.stringify({ monday: '09:00-19:00', tuesday: '09:00-19:00', wednesday: '09:00-19:00', thursday: '09:00-19:00', friday: '09:00-19:00', saturday: '09:00-16:00', sunday: 'closed' }), ...ts },
    ]);

    // ── 3. Professionals ──
    await queryInterface.bulkInsert('professionals', [
      { id: IDS.prof1, user_id: IDS.profUser1, establishment_id: IDS.establishment, specialty: 'Extensão de Cílios', commission_rate: 40.00, ...ts },
      { id: IDS.prof2, user_id: IDS.profUser2, establishment_id: IDS.establishment, specialty: 'Cabeleireiro', commission_rate: 35.00, ...ts },
    ]);

    // ── 4. Services ──
    await queryInterface.bulkInsert('services', [
      { id: IDS.svc1, establishment_id: IDS.establishment, name: 'Extensão de Cílios', description: 'Aplicação completa de extensão fio a fio', price: 150.00, duration_minutes: 90, is_active: true, ...ts },
      { id: IDS.svc2, establishment_id: IDS.establishment, name: 'Corte Feminino', description: 'Corte feminino com lavagem e finalização', price: 80.00, duration_minutes: 60, is_active: true, ...ts },
      { id: IDS.svc3, establishment_id: IDS.establishment, name: 'Manicure', description: 'Manicure completa com esmaltação', price: 45.00, duration_minutes: 45, is_active: true, ...ts },
      { id: IDS.svc4, establishment_id: IDS.establishment, name: 'Coloração', description: 'Coloração completa com produtos premium', price: 200.00, duration_minutes: 120, is_active: true, ...ts },
      { id: IDS.svc5, establishment_id: IDS.establishment, name: 'Manutenção de Cílios', description: 'Retoque e manutenção de extensão', price: 90.00, duration_minutes: 60, is_active: true, ...ts },
    ]);

    // ── 5. Clients ──
    await queryInterface.bulkInsert('clients', [
      { id: IDS.cli1, establishment_id: IDS.establishment, first_name: 'Thaisa', last_name: 'Oliveira', email: 'thaisa@email.com', phone: '11988881111', ...ts },
      { id: IDS.cli2, establishment_id: IDS.establishment, first_name: 'Rafaela', last_name: 'Costa', email: 'rafaela@email.com', phone: '11988882222', ...ts },
      { id: IDS.cli3, establishment_id: IDS.establishment, first_name: 'Taís', last_name: 'Mendes', email: 'tais@email.com', phone: '11988883333', ...ts },
      { id: IDS.cli4, establishment_id: IDS.establishment, first_name: 'Juliana', last_name: 'Ferreira', email: 'juliana@email.com', phone: '11988884444', ...ts },
      { id: IDS.cli5, establishment_id: IDS.establishment, first_name: 'Camila', last_name: 'Souza', email: 'camila@email.com', phone: '11988885555', ...ts },
      { id: IDS.cli6, establishment_id: IDS.establishment, first_name: 'Beatriz', last_name: 'Lima', email: 'beatriz@email.com', phone: '11988886666', ...ts },
      { id: IDS.cli7, establishment_id: IDS.establishment, first_name: 'Larissa', last_name: 'Almeida', email: 'larissa@email.com', phone: '11988887777', ...ts },
      { id: IDS.cli8, establishment_id: IDS.establishment, first_name: 'Fernanda', last_name: 'Rocha', email: 'fernanda@email.com', phone: '11988888888', ...ts },
      { id: IDS.cli9, establishment_id: IDS.establishment, first_name: 'Patrícia', last_name: 'Dias', email: 'patricia@email.com', phone: '11988889999', ...ts },
      { id: IDS.cli10, establishment_id: IDS.establishment, first_name: 'Amanda', last_name: 'Ribeiro', email: 'amanda@email.com', phone: '11988880000', ...ts },
    ]);

    // ── 6. Payment Methods ──
    await queryInterface.bulkInsert('payment_methods', [
      { id: IDS.pmCash, name: 'Dinheiro', is_active: true, ...ts },
      { id: IDS.pmCredit, name: 'Cartão de Crédito', is_active: true, ...ts },
      { id: IDS.pmPix, name: 'Pix', is_active: true, ...ts },
    ]);

    // ── 7. Appointments ──
    const past5 = daysAgo(5);
    const past3 = daysAgo(3);
    const past1 = daysAgo(1);
    const future2 = daysFromNow(2);
    const future5 = daysFromNow(5);
    const future7 = daysFromNow(7);
    const future10 = daysFromNow(10);

    await queryInterface.bulkInsert('appointments', [
      { id: IDS.apt1, establishment_id: IDS.establishment, client_id: IDS.cli1, professional_id: IDS.prof1, service_id: IDS.svc1, start_time: timeAt(past5, 10), end_time: timeAt(past5, 11, 30), status: 'COMPLETED', price_charged: 150.00, notes: '', ...ts },
      { id: IDS.apt2, establishment_id: IDS.establishment, client_id: IDS.cli2, professional_id: IDS.prof2, service_id: IDS.svc2, start_time: timeAt(past5, 14), end_time: timeAt(past5, 15), status: 'COMPLETED', price_charged: 80.00, notes: '', ...ts },
      { id: IDS.apt3, establishment_id: IDS.establishment, client_id: IDS.cli3, professional_id: IDS.prof1, service_id: IDS.svc5, start_time: timeAt(past3, 9), end_time: timeAt(past3, 10), status: 'COMPLETED', price_charged: 90.00, notes: '', ...ts },
      { id: IDS.apt4, establishment_id: IDS.establishment, client_id: IDS.cli4, professional_id: IDS.prof2, service_id: IDS.svc4, start_time: timeAt(past3, 13), end_time: timeAt(past3, 15), status: 'COMPLETED', price_charged: 200.00, notes: 'Coloração loiro platinado', ...ts },
      { id: IDS.apt5, establishment_id: IDS.establishment, client_id: IDS.cli5, professional_id: IDS.prof1, service_id: IDS.svc3, start_time: timeAt(past1, 11), end_time: timeAt(past1, 11, 45), status: 'COMPLETED', price_charged: 45.00, notes: '', ...ts },
      { id: IDS.apt6, establishment_id: IDS.establishment, client_id: IDS.cli6, professional_id: IDS.prof1, service_id: IDS.svc1, start_time: timeAt(future2, 10), end_time: timeAt(future2, 11, 30), status: 'CONFIRMED', price_charged: 150.00, notes: '', ...ts },
      { id: IDS.apt7, establishment_id: IDS.establishment, client_id: IDS.cli7, professional_id: IDS.prof2, service_id: IDS.svc2, start_time: timeAt(future2, 14), end_time: timeAt(future2, 15), status: 'PENDING', price_charged: 80.00, notes: '', ...ts },
      { id: IDS.apt8, establishment_id: IDS.establishment, client_id: IDS.cli8, professional_id: IDS.prof1, service_id: IDS.svc5, start_time: timeAt(future5, 9), end_time: timeAt(future5, 10), status: 'PENDING', price_charged: 90.00, notes: '', ...ts },
      { id: IDS.apt9, establishment_id: IDS.establishment, client_id: IDS.cli9, professional_id: IDS.prof2, service_id: IDS.svc4, start_time: timeAt(future7, 10), end_time: timeAt(future7, 12), status: 'PENDING', price_charged: 200.00, notes: '', ...ts },
      { id: IDS.apt10, establishment_id: IDS.establishment, client_id: IDS.cli10, professional_id: IDS.prof1, service_id: IDS.svc1, start_time: timeAt(future10, 15), end_time: timeAt(future10, 16, 30), status: 'PENDING', price_charged: 150.00, notes: '', ...ts },
    ]);

    // ── 8. Financial Entries (income from completed appointments) ──
    await queryInterface.bulkInsert('financial_entries', [
      { id: uuidv4(), establishment_id: IDS.establishment, appointment_id: IDS.apt1, client_id: IDS.cli1, amount: 150.00, description: 'Extensão de Cílios - Thaisa', entry_date: dateOnly(past5), payment_method_id: IDS.pmPix, status: 'PAID', ...ts },
      { id: uuidv4(), establishment_id: IDS.establishment, appointment_id: IDS.apt2, client_id: IDS.cli2, amount: 80.00, description: 'Corte Feminino - Rafaela', entry_date: dateOnly(past5), payment_method_id: IDS.pmCredit, status: 'PAID', ...ts },
      { id: uuidv4(), establishment_id: IDS.establishment, appointment_id: IDS.apt3, client_id: IDS.cli3, amount: 90.00, description: 'Manutenção de Cílios - Taís', entry_date: dateOnly(past3), payment_method_id: IDS.pmCash, status: 'PAID', ...ts },
      { id: uuidv4(), establishment_id: IDS.establishment, appointment_id: IDS.apt4, client_id: IDS.cli4, amount: 200.00, description: 'Coloração - Juliana', entry_date: dateOnly(past3), payment_method_id: IDS.pmCredit, status: 'PAID', ...ts },
      { id: uuidv4(), establishment_id: IDS.establishment, appointment_id: IDS.apt5, client_id: IDS.cli5, amount: 45.00, description: 'Manicure - Camila', entry_date: dateOnly(past1), payment_method_id: IDS.pmPix, status: 'PAID', ...ts },
      { id: uuidv4(), establishment_id: IDS.establishment, appointment_id: null, client_id: IDS.cli6, amount: 120.00, description: 'Venda de produtos - Beatriz', entry_date: dateOnly(past1), payment_method_id: IDS.pmCash, status: 'PENDING', ...ts },
    ]);

    // ── 9. Financial Exits (expenses) ──
    await queryInterface.bulkInsert('financial_exits', [
      { id: uuidv4(), establishment_id: IDS.establishment, amount: 350.00, description: 'Material de trabalho - cílios e colas', exit_date: dateOnly(daysAgo(10)), category: 'Material', status: 'PAID', ...ts },
      { id: uuidv4(), establishment_id: IDS.establishment, amount: 25.00, description: 'Padaria - café e lanches', exit_date: dateOnly(daysAgo(4)), category: 'Alimentação', status: 'PAID', ...ts },
      { id: uuidv4(), establishment_id: IDS.establishment, amount: 180.00, description: 'Conta de luz', exit_date: dateOnly(daysAgo(2)), category: 'Contas', status: 'PAID', ...ts },
      { id: uuidv4(), establishment_id: IDS.establishment, amount: 1200.00, description: 'Aluguel do salão', exit_date: dateOnly(daysAgo(1)), category: 'Aluguel', status: 'PENDING', ...ts },
      { id: uuidv4(), establishment_id: IDS.establishment, amount: 90.00, description: 'Produtos de limpeza', exit_date: dateOnly(daysAgo(7)), category: 'Material', status: 'PAID', ...ts },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('financial_exits', null, {});
    await queryInterface.bulkDelete('financial_entries', null, {});
    await queryInterface.bulkDelete('appointments', null, {});
    await queryInterface.bulkDelete('payment_methods', null, {});
    await queryInterface.bulkDelete('clients', null, {});
    await queryInterface.bulkDelete('services', null, {});
    await queryInterface.bulkDelete('professionals', null, {});
    await queryInterface.bulkDelete('establishments', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
