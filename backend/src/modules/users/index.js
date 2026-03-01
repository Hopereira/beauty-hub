/**
 * Users Module
 */

const UserModel = require('./user.model');
const UserRepository = require('./user.repository');
const UserService = require('./user.service');
const UserController = require('./user.controller');
const { createUserRoutes, createProfileRoutes } = require('./user.routes');
const userValidation = require('./user.validation');
const { authenticate, authorize } = require('../../middleware/auth');

function initUsersModule(sequelize, models = {}) {
  const User = UserModel(sequelize);

  // Associations
  if (models.Tenant) {
    models.Tenant.hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
    User.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

    // Owner relationship
    models.Tenant.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
  }

  const userRepository = new UserRepository(User);
  const userService = new UserService(userRepository);
  const userController = new UserController(userService);

  return {
    model: User,
    repository: userRepository,
    service: userService,
    controller: userController,
    middleware: {
      authenticate,
      authorize,
    },
    routes: {
      users: createUserRoutes(userController),
      profile: createProfileRoutes(userController),
    },
  };
}

module.exports = {
  initUsersModule,
  UserModel,
  UserRepository,
  UserService,
  UserController,
  userValidation,
};
