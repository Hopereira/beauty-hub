/**
 * Tenant Repository
 * Data access layer for Tenant entity
 * Note: Tenants don't have tenant_id (they ARE the tenant)
 */

const { NotFoundError } = require('../../shared/errors');

class TenantRepository {
  constructor(model) {
    this.model = model;
    this.modelName = 'Tenant';
  }

  /**
   * Find all tenants with pagination
   */
  async findAll(options = {}) {
    const {
      where = {},
      include = [],
      order = [['created_at', 'DESC']],
      page = 1,
      limit = 20,
    } = options;

    const offset = (page - 1) * limit;

    const result = await this.model.findAndCountAll({
      where,
      include,
      order,
      limit,
      offset,
      distinct: true,
    });

    return {
      rows: result.rows,
      count: result.count,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.count / limit),
        total: result.count,
      },
    };
  }

  /**
   * Find tenant by ID
   */
  async findById(id, options = {}) {
    const tenant = await this.model.findByPk(id, options);
    
    if (!tenant) {
      throw new NotFoundError(this.modelName, id);
    }
    
    return tenant;
  }

  /**
   * Find tenant by slug
   */
  async findBySlug(slug) {
    return this.model.findOne({
      where: { slug: slug.toLowerCase() },
    });
  }

  /**
   * Find tenant by email
   */
  async findByEmail(email) {
    return this.model.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find tenant by document
   */
  async findByDocument(document) {
    const cleaned = document.replace(/\D/g, '');
    return this.model.findOne({
      where: { document: cleaned },
    });
  }

  /**
   * Create tenant
   */
  async create(data, options = {}) {
    return this.model.create(data, options);
  }

  /**
   * Update tenant
   */
  async update(id, data, options = {}) {
    const tenant = await this.findById(id);
    
    // Prevent slug modification after creation (or handle redirect)
    delete data.slug;
    delete data.id;
    
    await tenant.update(data, options);
    return tenant.reload();
  }

  /**
   * Soft delete tenant
   */
  async delete(id, options = {}) {
    const tenant = await this.findById(id);
    await tenant.destroy(options);
    return true;
  }

  /**
   * Check if slug is available
   */
  async isSlugAvailable(slug, excludeId = null) {
    const where = { slug: slug.toLowerCase() };
    if (excludeId) {
      where.id = { [require('sequelize').Op.ne]: excludeId };
    }
    
    const count = await this.model.count({ where });
    return count === 0;
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email, excludeId = null) {
    const where = { email: email.toLowerCase() };
    if (excludeId) {
      where.id = { [require('sequelize').Op.ne]: excludeId };
    }
    
    const count = await this.model.count({ where });
    return count === 0;
  }

  /**
   * Check if document is available
   */
  async isDocumentAvailable(document, excludeId = null) {
    const cleaned = document.replace(/\D/g, '');
    const where = { document: cleaned };
    if (excludeId) {
      where.id = { [require('sequelize').Op.ne]: excludeId };
    }
    
    const count = await this.model.count({ where });
    return count === 0;
  }

  /**
   * Count tenants by status
   */
  async countByStatus(status) {
    return this.model.count({ where: { status } });
  }

  /**
   * Get tenant statistics
   */
  async getStatistics() {
    const { TENANT_STATUS } = require('../../shared/constants');
    const { fn, col } = require('sequelize');
    
    const stats = await this.model.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const result = {
      total: 0,
      byStatus: {},
    };

    for (const stat of stats) {
      result.byStatus[stat.status] = parseInt(stat.count, 10);
      result.total += parseInt(stat.count, 10);
    }

    return result;
  }
}

module.exports = TenantRepository;
