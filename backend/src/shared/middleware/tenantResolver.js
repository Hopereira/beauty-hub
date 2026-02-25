/**
 * Tenant Resolver Middleware
 * Extracts tenant from subdomain/slug and injects into request
 * Blocks suspended tenants
 */

const { TenantError, TenantSuspendedError } = require('../errors');
const { TENANT_STATUS, ROLES, ERROR_CODES } = require('../constants');
const logger = require('../utils/logger');

// Cache for tenant lookups (simple in-memory, replace with Redis in production)
const tenantCache = new Map();
const CACHE_TTL = 60000; // 1 minute

/**
 * Clear tenant from cache
 * @param {string} slug - Tenant slug
 */
function clearTenantCache(slug) {
  tenantCache.delete(slug);
}

/**
 * Create tenant resolver middleware
 * @param {Function} getTenantBySlug - Function to fetch tenant by slug
 * @returns {Function} Express middleware
 */
function createTenantResolver(getTenantBySlug) {
  return async (req, res, next) => {
    try {
      // Skip tenant resolution for master routes or public routes
      if (req.path.startsWith('/api/master') || req.path.startsWith('/api/auth/register')) {
        return next();
      }

      // If user is MASTER, they don't need tenant context for some operations
      if (req.user && req.user.role === ROLES.MASTER) {
        // MASTER can optionally specify tenant via header
        const tenantSlug = req.headers['x-tenant-slug'];
        if (tenantSlug) {
          const tenant = await resolveTenant(tenantSlug, getTenantBySlug);
          req.tenant = tenant;
          req.tenantId = tenant.id;
        }
        return next();
      }

      // Extract tenant slug from various sources (priority order)
      const tenantSlug = extractTenantSlug(req);

      if (!tenantSlug) {
        // Check if tenant is embedded in JWT
        if (req.user && req.user.tenantId) {
          req.tenantId = req.user.tenantId;
          // Optionally fetch full tenant data if needed
          return next();
        }
        
        throw new TenantError(
          'Tenant não identificado. Use um subdomínio válido ou header X-Tenant-Slug.',
          ERROR_CODES.TENANT_REQUIRED
        );
      }

      const tenant = await resolveTenant(tenantSlug, getTenantBySlug);

      // Validate tenant status
      if (tenant.status === TENANT_STATUS.SUSPENDED) {
        throw new TenantSuspendedError(tenant.slug);
      }

      if (tenant.status === TENANT_STATUS.CANCELLED) {
        throw new TenantError(
          'Esta conta foi cancelada.',
          ERROR_CODES.TENANT_SUSPENDED
        );
      }

      // Inject tenant into request
      req.tenant = tenant;
      req.tenantId = tenant.id;

      // Add tenant context to logger
      req.log = logger.child({ tenantId: tenant.id, tenantSlug: tenant.slug });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Extract tenant slug from request
 * Priority: Header > Subdomain > Query param (dev only)
 */
function extractTenantSlug(req) {
  // 1. Header (for API clients)
  const headerSlug = req.headers['x-tenant-slug'];
  if (headerSlug) {
    return headerSlug.toLowerCase();
  }

  // 2. Subdomain
  const host = req.headers.host || '';
  const subdomain = extractSubdomain(host);
  if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
    return subdomain.toLowerCase();
  }

  // 3. Query param (development only)
  if (process.env.NODE_ENV === 'development' && req.query.tenant) {
    return req.query.tenant.toLowerCase();
  }

  return null;
}

/**
 * Extract subdomain from host
 */
function extractSubdomain(host) {
  // Remove port
  const hostname = host.split(':')[0];
  
  // Split by dots
  const parts = hostname.split('.');
  
  // Need at least 3 parts for subdomain (sub.domain.tld)
  if (parts.length >= 3) {
    return parts[0];
  }
  
  // For localhost development
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }
  
  return null;
}

/**
 * Resolve tenant with caching
 */
async function resolveTenant(slug, getTenantBySlug) {
  // Check cache
  const cached = tenantCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tenant;
  }

  // Fetch from database
  const tenant = await getTenantBySlug(slug);
  
  if (!tenant) {
    throw new TenantError(
      `Tenant "${slug}" não encontrado.`,
      ERROR_CODES.TENANT_NOT_FOUND
    );
  }

  // Cache result
  tenantCache.set(slug, {
    tenant,
    timestamp: Date.now(),
  });

  return tenant;
}

/**
 * Middleware to validate tenant consistency with JWT
 * Use after authenticate middleware
 */
function validateTenantConsistency(req, res, next) {
  try {
    // MASTER users can access any tenant
    if (req.user && req.user.role === ROLES.MASTER) {
      return next();
    }

    // Ensure user belongs to the resolved tenant
    if (req.user && req.tenantId && req.user.tenantId !== req.tenantId) {
      throw new TenantError(
        'Usuário não pertence a este tenant.',
        ERROR_CODES.TENANT_MISMATCH
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional middleware: Require tenant context
 * Use for routes that always need tenant
 */
function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return next(new TenantError(
      'Contexto de tenant obrigatório para esta operação.',
      ERROR_CODES.TENANT_REQUIRED
    ));
  }
  next();
}

module.exports = {
  createTenantResolver,
  validateTenantConsistency,
  requireTenant,
  extractTenantSlug,
  clearTenantCache,
};
