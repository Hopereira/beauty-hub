/**
 * User Routes
 */

const express = require('express');
const { asyncHandler } = require('../../shared/middleware/errorHandler');
const { authenticate, authorize, ensureTenantMember } = require('../../shared/middleware/auth');
const { validate } = require('../../shared/middleware/validation');
const { ROLES } = require('../../shared/constants');
const {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
  changeRoleSchema,
  listUsersSchema,
} = require('./user.validation');

function createUserRoutes(controller) {
  const router = express.Router();

  // All routes require authentication and tenant membership
  router.use(authenticate);
  router.use(ensureTenantMember);

  // Statistics (admin+)
  router.get(
    '/statistics',
    authorize(ROLES.ADMIN),
    asyncHandler(controller.getStatistics)
  );

  // List users (admin+)
  router.get(
    '/',
    authorize(ROLES.ADMIN),
    validate(listUsersSchema, 'query'),
    asyncHandler(controller.list)
  );

  // Get user by ID (admin+)
  router.get(
    '/:id',
    authorize(ROLES.ADMIN),
    asyncHandler(controller.getById)
  );

  // Create user (admin+)
  router.post(
    '/',
    authorize(ROLES.ADMIN),
    validate(createUserSchema),
    asyncHandler(controller.create)
  );

  // Update user (admin+)
  router.put(
    '/:id',
    authorize(ROLES.ADMIN),
    validate(updateUserSchema),
    asyncHandler(controller.update)
  );

  // Change password (owner of password or admin+)
  router.put(
    '/:id/password',
    validate(changePasswordSchema),
    asyncHandler(controller.changePassword)
  );

  // Reset password (admin+)
  router.put(
    '/:id/reset-password',
    authorize(ROLES.ADMIN),
    validate(resetPasswordSchema),
    asyncHandler(controller.resetPassword)
  );

  // Change role (owner+)
  router.put(
    '/:id/role',
    authorize(ROLES.OWNER),
    validate(changeRoleSchema),
    asyncHandler(controller.changeRole)
  );

  // Activate user (admin+)
  router.post(
    '/:id/activate',
    authorize(ROLES.ADMIN),
    asyncHandler(controller.activate)
  );

  // Deactivate user (admin+)
  router.post(
    '/:id/deactivate',
    authorize(ROLES.ADMIN),
    asyncHandler(controller.deactivate)
  );

  // Delete user (admin+)
  router.delete(
    '/:id',
    authorize(ROLES.ADMIN),
    asyncHandler(controller.delete)
  );

  return router;
}

function createProfileRoutes(controller) {
  const router = express.Router();

  router.use(authenticate);
  router.use(ensureTenantMember);

  // Get own profile
  router.get('/', asyncHandler(controller.getProfile));

  // Update own profile
  router.put(
    '/',
    validate(updateUserSchema),
    asyncHandler(controller.updateProfile)
  );

  // Change own password
  router.put(
    '/password',
    validate(changePasswordSchema),
    asyncHandler(controller.changePassword)
  );

  return router;
}

module.exports = { createUserRoutes, createProfileRoutes };
