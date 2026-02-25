/**
 * User Service
 * Business logic for user operations
 */

const { ConflictError, ValidationError, NotFoundError } = require('../../shared/errors');
const { ROLES, ROLE_HIERARCHY } = require('../../shared/constants');
const logger = require('../../shared/utils/logger');

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Get all users for tenant
   */
  async getUsers(tenantId, options = {}) {
    return this.userRepository.findAll(tenantId, options);
  }

  /**
   * Get user by ID
   */
  async getUserById(tenantId, userId) {
    return this.userRepository.findById(tenantId, userId);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(tenantId, email) {
    return this.userRepository.findByEmail(tenantId, email);
  }

  /**
   * Create user within tenant
   */
  async createUser(tenantId, data, creatorRole = null) {
    // Validate email availability
    const emailAvailable = await this.userRepository.isEmailAvailable(tenantId, data.email);
    if (!emailAvailable) {
      throw new ConflictError('Email já está em uso.');
    }

    // Validate role assignment (can't assign higher role than self)
    if (creatorRole && data.role) {
      this._validateRoleAssignment(creatorRole, data.role);
    }

    const user = await this.userRepository.create(tenantId, data);
    
    logger.info('User created', { 
      tenantId, 
      userId: user.id, 
      role: user.role 
    });

    return user;
  }

  /**
   * Create OWNER user for new tenant
   */
  async createOwner(tenantId, data) {
    const user = await this.userRepository.create(tenantId, {
      ...data,
      role: ROLES.OWNER,
    });

    logger.info('Owner created for tenant', { 
      tenantId, 
      userId: user.id 
    });

    return user;
  }

  /**
   * Update user
   */
  async updateUser(tenantId, userId, data, updaterRole = null) {
    // If changing email, validate availability
    if (data.email) {
      const emailAvailable = await this.userRepository.isEmailAvailable(
        tenantId, 
        data.email, 
        userId
      );
      if (!emailAvailable) {
        throw new ConflictError('Email já está em uso.');
      }
    }

    // If changing role, validate permission
    if (data.role && updaterRole) {
      this._validateRoleAssignment(updaterRole, data.role);
    }

    // Prevent role escalation beyond updater's role
    delete data.password; // Use changePassword for password changes

    const user = await this.userRepository.update(tenantId, userId, data);
    
    logger.info('User updated', { tenantId, userId });

    return user;
  }

  /**
   * Change user password
   */
  async changePassword(tenantId, userId, currentPassword, newPassword) {
    const user = await this.userRepository.findById(tenantId, userId);

    // Validate current password
    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      throw new ValidationError('Senha atual incorreta.');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new ValidationError('Nova senha deve ter no mínimo 6 caracteres.');
    }

    await this.userRepository.update(tenantId, userId, { password: newPassword });
    
    logger.info('Password changed', { tenantId, userId });

    return true;
  }

  /**
   * Admin reset password (no current password needed)
   */
  async resetPassword(tenantId, userId, newPassword) {
    if (newPassword.length < 6) {
      throw new ValidationError('Nova senha deve ter no mínimo 6 caracteres.');
    }

    await this.userRepository.update(tenantId, userId, { password: newPassword });
    
    logger.info('Password reset by admin', { tenantId, userId });

    return true;
  }

  /**
   * Change user role
   */
  async changeRole(tenantId, userId, newRole, changerRole) {
    // Validate role assignment
    this._validateRoleAssignment(changerRole, newRole);

    const user = await this.userRepository.findById(tenantId, userId);

    // Can't change own role
    // This check should be done at controller level with req.user.id

    // Can't demote someone with higher role
    const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
    const changerRoleIndex = ROLE_HIERARCHY.indexOf(changerRole);
    
    if (userRoleIndex >= changerRoleIndex) {
      throw new ValidationError('Você não pode alterar a role de um usuário com role igual ou superior.');
    }

    await this.userRepository.update(tenantId, userId, { role: newRole });
    
    logger.info('User role changed', { tenantId, userId, newRole });

    return this.userRepository.findById(tenantId, userId);
  }

  /**
   * Activate/Deactivate user
   */
  async setActiveStatus(tenantId, userId, isActive) {
    await this.userRepository.update(tenantId, userId, { is_active: isActive });
    
    logger.info(`User ${isActive ? 'activated' : 'deactivated'}`, { tenantId, userId });

    return this.userRepository.findById(tenantId, userId);
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(tenantId, userId, deleterRole) {
    const user = await this.userRepository.findById(tenantId, userId);

    // Can't delete someone with higher role
    const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
    const deleterRoleIndex = ROLE_HIERARCHY.indexOf(deleterRole);
    
    if (userRoleIndex >= deleterRoleIndex) {
      throw new ValidationError('Você não pode excluir um usuário com role igual ou superior.');
    }

    // Can't delete OWNER
    if (user.role === ROLES.OWNER) {
      throw new ValidationError('O proprietário da conta não pode ser excluído.');
    }

    await this.userRepository.delete(tenantId, userId);
    
    logger.info('User deleted', { tenantId, userId });

    return true;
  }

  /**
   * Get user statistics for tenant
   */
  async getStatistics(tenantId) {
    return this.userRepository.getStatistics(tenantId);
  }

  /**
   * Validate role assignment permissions
   */
  _validateRoleAssignment(assignerRole, targetRole) {
    const assignerIndex = ROLE_HIERARCHY.indexOf(assignerRole);
    const targetIndex = ROLE_HIERARCHY.indexOf(targetRole);

    // Can't assign role higher than or equal to own role (except MASTER)
    if (assignerRole !== ROLES.MASTER && targetIndex >= assignerIndex) {
      throw new ValidationError('Você não pode atribuir uma role igual ou superior à sua.');
    }

    // Only MASTER can create OWNER or MASTER
    if ([ROLES.OWNER, ROLES.MASTER].includes(targetRole) && assignerRole !== ROLES.MASTER) {
      throw new ValidationError('Apenas MASTER pode criar usuários OWNER ou MASTER.');
    }
  }
}

module.exports = UserService;
