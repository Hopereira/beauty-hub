/**
 * Tenant Routes
 * Defines HTTP endpoints for tenant operations
 */

const express = require('express');
const { asyncHandler } = require('../../shared/middleware/errorHandler');
const { authenticate, authorize, ensureTenantMember } = require('../../shared/middleware/auth');
const { validate } = require('../../shared/middleware/validation');
const { ROLES } = require('../../shared/constants');
const {
  createTenantSchema,
  updateTenantSchema,
  updateSettingsSchema,
  updateBrandingSchema,
  suspendTenantSchema,
  listTenantsSchema,
} = require('./tenant.validation');

/**
 * Create tenant routes
 * @param {TenantController} controller
 * @returns {Router}
 */
function createTenantRoutes(controller) {
  const router = express.Router();

  // ─────────────────────────────────────────────────────────────────────────────
  // MASTER Routes (/api/master/tenants)
  // ─────────────────────────────────────────────────────────────────────────────

  const masterRouter = express.Router();

  // List tenants
  masterRouter.get(
    '/',
    authenticate,
    authorize(ROLES.MASTER),
    validate(listTenantsSchema, 'query'),
    asyncHandler(controller.list)
  );

  // Get statistics
  masterRouter.get(
    '/statistics',
    authenticate,
    authorize(ROLES.MASTER),
    asyncHandler(controller.getStatistics)
  );

  // Get tenant by slug
  masterRouter.get(
    '/slug/:slug',
    authenticate,
    authorize(ROLES.MASTER),
    asyncHandler(controller.getBySlug)
  );

  // Get tenant by ID
  masterRouter.get(
    '/:id',
    authenticate,
    authorize(ROLES.MASTER),
    asyncHandler(controller.getById)
  );

  // Create tenant
  masterRouter.post(
    '/',
    authenticate,
    authorize(ROLES.MASTER),
    validate(createTenantSchema),
    asyncHandler(controller.create)
  );

  // Update tenant
  masterRouter.put(
    '/:id',
    authenticate,
    authorize(ROLES.MASTER),
    validate(updateTenantSchema),
    asyncHandler(controller.update)
  );

  // Activate tenant
  masterRouter.post(
    '/:id/activate',
    authenticate,
    authorize(ROLES.MASTER),
    asyncHandler(controller.activate)
  );

  // Suspend tenant
  masterRouter.post(
    '/:id/suspend',
    authenticate,
    authorize(ROLES.MASTER),
    validate(suspendTenantSchema),
    asyncHandler(controller.suspend)
  );

  // Delete tenant
  masterRouter.delete(
    '/:id',
    authenticate,
    authorize(ROLES.MASTER),
    asyncHandler(controller.delete)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Tenant Routes (/api/tenant)
  // ─────────────────────────────────────────────────────────────────────────────

  const tenantRouter = express.Router();

  // Get current tenant
  tenantRouter.get(
    '/',
    authenticate,
    ensureTenantMember,
    asyncHandler(controller.getCurrent)
  );

  // Update settings (OWNER only)
  tenantRouter.put(
    '/settings',
    authenticate,
    authorize(ROLES.OWNER),
    ensureTenantMember,
    validate(updateSettingsSchema),
    asyncHandler(controller.updateSettings)
  );

  // Update branding (OWNER only)
  tenantRouter.put(
    '/branding',
    authenticate,
    authorize(ROLES.OWNER),
    ensureTenantMember,
    validate(updateBrandingSchema),
    asyncHandler(controller.updateBranding)
  );

  return { masterRouter, tenantRouter };
}

module.exports = createTenantRoutes;
