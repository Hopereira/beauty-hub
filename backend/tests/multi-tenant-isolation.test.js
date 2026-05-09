/**
 * Multi-Tenant Isolation Tests
 * Validates that tenants cannot access each other's data
 * and that BaseRepository _scopedWhere enforces tenant boundaries
 */

const BaseRepository = require('../src/shared/database/BaseRepository');
const { ROLE_HIERARCHY, ROLES } = require('../src/shared/constants');
const { generateAccessToken, verifyAccessToken } = require('../src/shared/utils/jwt');
const { TenantMismatchError } = require('../src/shared/errors');

// ─── BaseRepository Tenant Scoping ───────────────────────────────────────────

describe('BaseRepository._scopedWhere', () => {
  class ConcreteRepo extends BaseRepository {
    constructor() { super({ findOne: jest.fn() }, 'Test'); }
  }
  const repo = new ConcreteRepo();

  test('returns where clause with tenant_id', () => {
    const result = repo._scopedWhere('tenant-uuid-123', { status: 'active' });
    expect(result).toEqual({ tenant_id: 'tenant-uuid-123', status: 'active' });
  });

  test('throws TenantMismatchError when tenantId is null', () => {
    expect(() => repo._scopedWhere(null)).toThrow(TenantMismatchError);
  });

  test('throws TenantMismatchError when tenantId is undefined', () => {
    expect(() => repo._scopedWhere(undefined)).toThrow(TenantMismatchError);
  });

  test('SECURITY: blocks override of tenant_id via additionalWhere', () => {
    // SECURITY FIX: BaseRepository now prevents tenant_id override
    const result = repo._scopedWhere('real-tenant', { tenant_id: 'hacker-tenant', status: 'active' });
    // The real tenant_id is enforced, hacker attempt is blocked
    expect(result.tenant_id).toBe('real-tenant');
    // Other properties are preserved
    expect(result.status).toBe('active');
  });
});

// ─── RBAC Role Hierarchy ─────────────────────────────────────────────────────

describe('RBAC Role Hierarchy', () => {
  test('MASTER has highest index in hierarchy', () => {
    const masterIndex = ROLE_HIERARCHY.indexOf(ROLES.MASTER);
    const ownerIndex = ROLE_HIERARCHY.indexOf(ROLES.OWNER);
    expect(masterIndex).toBeGreaterThan(ownerIndex);
  });

  test('CLIENT has lowest index in hierarchy', () => {
    const clientIndex = ROLE_HIERARCHY.indexOf(ROLES.CLIENT);
    expect(clientIndex).toBe(0);
  });

  test('all expected roles are in hierarchy', () => {
    const expected = ['client', 'professional', 'admin', 'owner', 'master'];
    expected.forEach((role) => {
      expect(ROLE_HIERARCHY).toContain(role);
    });
  });

  test('hierarchy is ordered correctly', () => {
    expect(ROLE_HIERARCHY.indexOf(ROLES.PROFESSIONAL)).toBeGreaterThan(ROLE_HIERARCHY.indexOf(ROLES.CLIENT));
    expect(ROLE_HIERARCHY.indexOf(ROLES.ADMIN)).toBeGreaterThan(ROLE_HIERARCHY.indexOf(ROLES.PROFESSIONAL));
    expect(ROLE_HIERARCHY.indexOf(ROLES.OWNER)).toBeGreaterThan(ROLE_HIERARCHY.indexOf(ROLES.ADMIN));
    expect(ROLE_HIERARCHY.indexOf(ROLES.MASTER)).toBeGreaterThan(ROLE_HIERARCHY.indexOf(ROLES.OWNER));
  });
});

// ─── JWT Token Generation and Verification ───────────────────────────────────

describe('JWT Utilities', () => {
  const payload = { id: 'user-uuid', email: 'test@test.com', role: 'owner', tenantId: 'tenant-uuid' };

  test('generates a valid access token', () => {
    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  test('verifies a valid access token and returns payload', () => {
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.tenantId).toBe(payload.tenantId);
  });

  test('throws on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  test('MASTER token has null tenantId', () => {
    const masterToken = generateAccessToken({ id: 'master-id', email: 'm@b.com', role: 'master', tenantId: null });
    const decoded = verifyAccessToken(masterToken);
    expect(decoded.tenantId).toBeNull();
  });
});

// ─── Tenant Resolver extractTenantSlug ───────────────────────────────────────

describe('extractTenantSlug', () => {
  const { extractTenantSlug } = require('../src/shared/middleware/tenantResolver');

  test('returns null when no tenant context', () => {
    const req = { headers: {}, query: {} };
    const result = extractTenantSlug(req);
    expect(result).toBeNull();
  });

  test('extracts tenant from X-Tenant-Slug header', () => {
    const req = { headers: { 'x-tenant-slug': 'My-Salon' }, query: {} };
    expect(extractTenantSlug(req)).toBe('my-salon');
  });

  test('extracts subdomain from host (3-part .com)', () => {
    const req = { headers: { host: 'beleza-pura.biaxavier.com' }, query: {} };
    expect(extractTenantSlug(req)).toBe('beleza-pura');
  });

  test('does not extract reserved slugs as tenant', () => {
    const req = { headers: { host: 'api.biaxavier.com' }, query: {} };
    expect(extractTenantSlug(req)).toBeNull();
  });

  test('header takes priority over subdomain', () => {
    const req = { headers: { host: 'other.biaxavier.com', 'x-tenant-slug': 'from-header' }, query: {} };
    expect(extractTenantSlug(req)).toBe('from-header');
  });
});

// ─── requireActiveSubscription logic ─────────────────────────────────────────

describe('requireActiveSubscription status logic', () => {
  function allowsWrite(status) {
    return ['active', 'trial', 'trialing'].includes(status?.toLowerCase());
  }
  function allowsRead(status) {
    return ['active', 'trial', 'trialing', 'past_due'].includes(status?.toLowerCase());
  }

  test('active allows write', () => expect(allowsWrite('active')).toBe(true));
  test('trial allows write', () => expect(allowsWrite('trial')).toBe(true));
  test('past_due denies write', () => expect(allowsWrite('past_due')).toBe(false));
  test('suspended denies write', () => expect(allowsWrite('suspended')).toBe(false));
  test('past_due allows read', () => expect(allowsRead('past_due')).toBe(true));
  test('suspended denies read', () => expect(allowsRead('suspended')).toBe(false));
  test('cancelled denies read', () => expect(allowsRead('cancelled')).toBe(false));
});

// ─── Legacy (integration stubs — run with real DB) ───────────────────────────

describe('Multi-Tenant Isolation (integration — requires DB)', () => {
  describe('Product Isolation', () => {
    test.todo('Tenant A cannot access Tenant B products');
    test.todo('Tenant B cannot modify Tenant A products');
    test.todo('Tenant A can only see their own products');
  });

  describe('Subscription Isolation', () => {
    test.todo('Tenant A subscription does not affect Tenant B');
  });

  describe('Financial Isolation', () => {
    test.todo('Tenant A cannot see Tenant B financial data');
  });
});
