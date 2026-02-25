/**
 * User Repository
 * Data access layer with tenant scoping
 */

const { BaseRepository } = require('../../shared/database');
const { NotFoundError, ConflictError } = require('../../shared/errors');
const { Op } = require('sequelize');

class UserRepository extends BaseRepository {
  constructor(model) {
    super(model, 'User');
  }

  /**
   * Find user by email within tenant
   */
  async findByEmail(tenantId, email) {
    return this.model.findOne({
      where: this._scopedWhere(tenantId, { email: email.toLowerCase() }),
    });
  }

  /**
   * Find user by email globally (for login)
   * Used when tenant is determined by email domain or after initial auth
   */
  async findByEmailGlobal(email) {
    return this.model.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find MASTER user by email (no tenant scope)
   */
  async findMasterByEmail(email) {
    const { ROLES } = require('../../shared/constants');
    return this.model.findOne({
      where: {
        email: email.toLowerCase(),
        role: ROLES.MASTER,
        tenant_id: null,
      },
    });
  }

  /**
   * Check if email is available within tenant
   */
  async isEmailAvailable(tenantId, email, excludeId = null) {
    const where = this._scopedWhere(tenantId, { email: email.toLowerCase() });
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const count = await this.model.count({ where });
    return count === 0;
  }

  /**
   * Create user with tenant
   */
  async create(tenantId, data, options = {}) {
    // For MASTER users, tenantId should be null
    const { ROLES } = require('../../shared/constants');
    const effectiveTenantId = data.role === ROLES.MASTER ? null : tenantId;

    return this.model.create(
      {
        ...data,
        tenant_id: effectiveTenantId,
      },
      options
    );
  }

  /**
   * Create MASTER user (no tenant)
   */
  async createMaster(data, options = {}) {
    const { ROLES } = require('../../shared/constants');
    return this.model.create(
      {
        ...data,
        role: ROLES.MASTER,
        tenant_id: null,
      },
      options
    );
  }

  /**
   * Get users by role within tenant
   */
  async findByRole(tenantId, role, options = {}) {
    return this.findAll(tenantId, {
      ...options,
      where: { ...options.where, role },
    });
  }

  /**
   * Get active users within tenant
   */
  async findActive(tenantId, options = {}) {
    return this.findAll(tenantId, {
      ...options,
      where: { ...options.where, is_active: true },
    });
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId) {
    return this.model.update(
      { last_login_at: new Date() },
      { where: { id: userId } }
    );
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(userId, token, expires) {
    return this.model.update(
      {
        password_reset_token: token,
        password_reset_expires: expires,
      },
      { where: { id: userId } }
    );
  }

  /**
   * Find by password reset token
   */
  async findByPasswordResetToken(token) {
    return this.model.findOne({
      where: {
        password_reset_token: token,
        password_reset_expires: { [Op.gt]: new Date() },
      },
    });
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(userId) {
    return this.model.update(
      {
        password_reset_token: null,
        password_reset_expires: null,
      },
      { where: { id: userId } }
    );
  }

  /**
   * Count users by tenant
   */
  async countByTenant(tenantId) {
    return this.count(tenantId);
  }

  /**
   * Get user statistics for tenant
   */
  async getStatistics(tenantId) {
    const { fn, col } = require('sequelize');

    const stats = await this.model.findAll({
      where: { tenant_id: tenantId },
      attributes: [
        'role',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['role'],
      raw: true,
    });

    const result = {
      total: 0,
      byRole: {},
    };

    for (const stat of stats) {
      result.byRole[stat.role] = parseInt(stat.count, 10);
      result.total += parseInt(stat.count, 10);
    }

    return result;
  }
}

module.exports = UserRepository;
