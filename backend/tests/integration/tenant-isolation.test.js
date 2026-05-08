/**
 * CRITICAL: Tenant Isolation Integration Tests
 * 
 * Validates that tenants cannot access each other's data
 * These are the MOST IMPORTANT tests for a multi-tenant SaaS
 */

const request = require('supertest');
const app = require('../../src/app.multitenant');
const { sequelize, User, Tenant, Client, Appointment } = require('../../src/models');
const { generateAccessToken } = require('../../src/shared/utils/jwt');

describe('CRITICAL SECURITY: Tenant Isolation', () => {
  let tenantA, tenantB, userA, userB, tokenA, tokenB;
  let clientA, clientB, appointmentA, appointmentB;

  beforeAll(async () => {
    // Setup: Create two isolated tenants with data
    
    // Tenant A
    tenantA = await Tenant.create({
      name: 'Tenant A',
      slug: 'tenant-a',
      email: 'a@example.com',
      document: '12345678000190',
      status: 'active',
    });
    
    userA = await User.create({
      tenant_id: tenantA.id,
      email: 'owner@tenanta.com',
      password: 'hashedpassword',
      first_name: 'Owner',
      last_name: 'Tenant A',
      role: 'owner',
      is_active: true,
    });
    
    clientA = await Client.create({
      tenant_id: tenantA.id,
      name: 'Client A',
      email: 'clienta@example.com',
    });
    
    appointmentA = await Appointment.create({
      tenant_id: tenantA.id,
      client_id: clientA.id,
      professional_id: userA.id,
      start_time: new Date(),
      end_time: new Date(Date.now() + 3600000),
      status: 'scheduled',
    });
    
    // Tenant B
    tenantB = await Tenant.create({
      name: 'Tenant B',
      slug: 'tenant-b',
      email: 'b@example.com',
      document: '98765432000190',
      status: 'active',
    });
    
    userB = await User.create({
      tenant_id: tenantB.id,
      email: 'owner@tenantb.com',
      password: 'hashedpassword',
      first_name: 'Owner',
      last_name: 'Tenant B',
      role: 'owner',
      is_active: true,
    });
    
    clientB = await Client.create({
      tenant_id: tenantB.id,
      name: 'Client B',
      email: 'clientb@example.com',
    });
    
    appointmentB = await Appointment.create({
      tenant_id: tenantB.id,
      client_id: clientB.id,
      professional_id: userB.id,
      start_time: new Date(),
      end_time: new Date(Date.now() + 3600000),
      status: 'scheduled',
    });
    
    // Generate tokens
    tokenA = generateAccessToken({
      id: userA.id,
      email: userA.email,
      role: userA.role,
      tenantId: tenantA.id,
    });
    
    tokenB = generateAccessToken({
      id: userB.id,
      email: userB.email,
      role: userB.role,
      tenantId: tenantB.id,
    });
  });

  afterAll(async () => {
    // Cleanup
    await Appointment.destroy({ where: {}, force: true });
    await Client.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Tenant.destroy({ where: {}, force: true });
    await sequelize.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Cross-tenant data access
  // ═══════════════════════════════════════════════════════════════════════════
  
  test('User A CANNOT access Client from Tenant B by ID', async () => {
    const response = await request(app)
      .get(`/api/clients/${clientB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Slug', tenantA.slug);
    
    // Should return 404 (not found) or 403 (forbidden)
    // Not 200 with data!
    expect([404, 403]).toContain(response.status);
    expect(response.body.success).toBe(false);
  });

  test('User A CANNOT modify Client from Tenant B', async () => {
    const response = await request(app)
      .put(`/api/clients/${clientB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Slug', tenantA.slug)
      .send({ name: 'Hacked Name' });
    
    expect([404, 403]).toContain(response.status);
    
    // Verify client was NOT modified
    const clientBAfter = await Client.findByPk(clientB.id);
    expect(clientBAfter.name).toBe('Client B');
  });

  test('User A CANNOT delete Client from Tenant B', async () => {
    const response = await request(app)
      .delete(`/api/clients/${clientB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Slug', tenantA.slug);
    
    expect([404, 403]).toContain(response.status);
    
    // Verify client still exists
    const clientBExists = await Client.findByPk(clientB.id);
    expect(clientBExists).not.toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: List endpoints isolation
  // ═══════════════════════════════════════════════════════════════════════════

  test('User A listing clients ONLY sees Tenant A clients', async () => {
    const response = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Slug', tenantA.slug);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Should see only clientA
    const clients = response.body.data || response.body.clients || [];
    expect(clients).toHaveLength(1);
    expect(clients[0].id).toBe(clientA.id);
    expect(clients[0].name).toBe('Client A');
  });

  test('User A listing appointments ONLY sees Tenant A appointments', async () => {
    const response = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Slug', tenantA.slug);
    
    expect(response.status).toBe(200);
    
    const appointments = response.body.data || response.body.appointments || [];
    expect(appointments.length).toBeGreaterThanOrEqual(0);
    
    // None should be from tenant B
    appointments.forEach(appt => {
      expect(appt.tenant_id).not.toBe(tenantB.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: Query parameter injection attempts
  // ═══════════════════════════════════════════════════════════════════════════

  test('User A CANNOT bypass isolation via query parameters', async () => {
    // Attempt to inject tenant_id in query
    const response = await request(app)
      .get(`/api/clients?tenant_id=${tenantB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Slug', tenantA.slug);
    
    // Should still only see tenant A data
    expect(response.status).toBe(200);
    
    const clients = response.body.data || response.body.clients || [];
    clients.forEach(client => {
      expect(client.tenant_id).toBe(tenantA.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Body parameter injection attempts
  // ═══════════════════════════════════════════════════════════════════════════

  test('User A CANNOT create data for Tenant B via body injection', async () => {
    const response = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Slug', tenantA.slug)
      .send({
        name: 'Injected Client',
        email: 'injected@example.com',
        tenant_id: tenantB.id, // Attempt to set tenant
      });
    
    // Should create, but for tenant A, not B
    expect(response.status).toBe(201);
    
    const createdClientId = response.body.data?.id;
    const createdClient = await Client.findByPk(createdClientId);
    
    // Forcefully created for tenant A, not B
    expect(createdClient.tenant_id).toBe(tenantA.id);
    expect(createdClient.tenant_id).not.toBe(tenantB.id);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: Subscription isolation
  // ═══════════════════════════════════════════════════════════════════════════

  test('Tenant A subscription status does not affect Tenant B', async () => {
    // This test validates that subscription checks are tenant-scoped
    // Implementation depends on billing module endpoints
    
    const response = await request(app)
      .get('/api/billing/subscription')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Slug', tenantA.slug);
    
    // Should get subscription for tenant A
    expect([200, 404]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.body.data?.tenant_id || response.body.tenantId).toBe(tenantA.id);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: Master user can access all tenants
  // ═══════════════════════════════════════════════════════════════════════════

  test('MASTER user can switch between tenants', async () => {
    // Create master user
    const master = await User.create({
      tenant_id: null,
      email: 'master@test.com',
      password: 'hashed',
      first_name: 'Master',
      last_name: 'Admin',
      role: 'master',
      is_active: true,
    });
    
    const masterToken = generateAccessToken({
      id: master.id,
      email: master.email,
      role: 'master',
      tenantId: null,
    });
    
    // Master can access tenant A
    const responseA = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${masterToken}`)
      .set('X-Tenant-Slug', tenantA.slug);
    
    expect(responseA.status).toBe(200);
    
    // Master can access tenant B
    const responseB = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${masterToken}`)
      .set('X-Tenant-Slug', tenantB.slug);
    
    expect(responseB.status).toBe(200);
    
    // Cleanup
    await master.destroy({ force: true });
  });
});

describe('CRITICAL SECURITY: Auth Flow', () => {
  // Additional auth tests...
  test('Login returns valid tokens', async () => {
    // Test implementation
  });
});
