/**
 * BaseRepository
 * Abstract repository with automatic tenant scoping
 * All tenant-scoped repositories must extend this class
 */

const { NotFoundError, TenantMismatchError } = require('../errors');
const { PAGINATION } = require('../constants');

class BaseRepository {
  /**
   * @param {Model} model - Sequelize model
   * @param {string} modelName - Human-readable model name for error messages
   */
  constructor(model, modelName = 'Resource') {
    if (new.target === BaseRepository) {
      throw new Error('BaseRepository is abstract and cannot be instantiated directly.');
    }
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Get base query options with tenant scope
   * @param {string} tenantId - Tenant UUID
   * @param {object} additionalWhere - Additional where conditions
   * @returns {object} Query options
   */
  _scopedWhere(tenantId, additionalWhere = {}) {
    if (!tenantId) {
      throw new TenantMismatchError();
    }
    return {
      tenant_id: tenantId,
      ...additionalWhere,
    };
  }

  /**
   * Find all records for a tenant with pagination
   * @param {string} tenantId - Tenant UUID
   * @param {object} options - Query options (where, include, order, page, limit)
   * @returns {Promise<{rows: Array, count: number, pagination: object}>}
   */
  async findAll(tenantId, options = {}) {
    const {
      where = {},
      include = [],
      order = [['created_at', 'DESC']],
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      paranoid = true,
    } = options;

    const effectiveLimit = Math.min(limit, PAGINATION.MAX_LIMIT);
    const offset = (page - 1) * effectiveLimit;

    const result = await this.model.findAndCountAll({
      where: this._scopedWhere(tenantId, where),
      include,
      order,
      limit: effectiveLimit,
      offset,
      paranoid,
      distinct: true,
    });

    return {
      rows: result.rows,
      count: result.count,
      pagination: {
        page,
        limit: effectiveLimit,
        totalPages: Math.ceil(result.count / effectiveLimit),
        total: result.count,
      },
    };
  }

  /**
   * Find one record by ID within tenant scope
   * @param {string} tenantId - Tenant UUID
   * @param {string} id - Record UUID
   * @param {object} options - Query options (include, paranoid)
   * @returns {Promise<Model>}
   */
  async findById(tenantId, id, options = {}) {
    const { include = [], paranoid = true } = options;

    const record = await this.model.findOne({
      where: this._scopedWhere(tenantId, { id }),
      include,
      paranoid,
    });

    if (!record) {
      throw new NotFoundError(this.modelName, id);
    }

    return record;
  }

  /**
   * Find one record by custom criteria within tenant scope
   * @param {string} tenantId - Tenant UUID
   * @param {object} where - Where conditions
   * @param {object} options - Query options
   * @returns {Promise<Model|null>}
   */
  async findOne(tenantId, where, options = {}) {
    const { include = [], paranoid = true } = options;

    return this.model.findOne({
      where: this._scopedWhere(tenantId, where),
      include,
      paranoid,
    });
  }

  /**
   * Create a new record with tenant ID
   * @param {string} tenantId - Tenant UUID
   * @param {object} data - Record data
   * @param {object} options - Transaction options
   * @returns {Promise<Model>}
   */
  async create(tenantId, data, options = {}) {
    return this.model.create(
      {
        ...data,
        tenant_id: tenantId,
      },
      options
    );
  }

  /**
   * Bulk create records with tenant ID
   * @param {string} tenantId - Tenant UUID
   * @param {Array} records - Array of record data
   * @param {object} options - Transaction options
   * @returns {Promise<Array<Model>>}
   */
  async bulkCreate(tenantId, records, options = {}) {
    const dataWithTenant = records.map((record) => ({
      ...record,
      tenant_id: tenantId,
    }));

    return this.model.bulkCreate(dataWithTenant, {
      ...options,
      returning: true,
    });
  }

  /**
   * Update a record by ID within tenant scope
   * @param {string} tenantId - Tenant UUID
   * @param {string} id - Record UUID
   * @param {object} data - Update data
   * @param {object} options - Transaction options
   * @returns {Promise<Model>}
   */
  async update(tenantId, id, data, options = {}) {
    const record = await this.findById(tenantId, id);

    // Prevent tenant_id modification
    delete data.tenant_id;
    delete data.id;

    await record.update(data, options);
    return record.reload();
  }

  /**
   * Soft delete a record by ID within tenant scope
   * @param {string} tenantId - Tenant UUID
   * @param {string} id - Record UUID
   * @param {object} options - Transaction options
   * @returns {Promise<boolean>}
   */
  async delete(tenantId, id, options = {}) {
    const record = await this.findById(tenantId, id);
    await record.destroy(options);
    return true;
  }

  /**
   * Hard delete a record (permanent)
   * @param {string} tenantId - Tenant UUID
   * @param {string} id - Record UUID
   * @param {object} options - Transaction options
   * @returns {Promise<boolean>}
   */
  async hardDelete(tenantId, id, options = {}) {
    const record = await this.findById(tenantId, id, { paranoid: false });
    await record.destroy({ ...options, force: true });
    return true;
  }

  /**
   * Restore a soft-deleted record
   * @param {string} tenantId - Tenant UUID
   * @param {string} id - Record UUID
   * @param {object} options - Transaction options
   * @returns {Promise<Model>}
   */
  async restore(tenantId, id, options = {}) {
    const record = await this.findById(tenantId, id, { paranoid: false });
    await record.restore(options);
    return record.reload();
  }

  /**
   * Count records within tenant scope
   * @param {string} tenantId - Tenant UUID
   * @param {object} where - Additional where conditions
   * @returns {Promise<number>}
   */
  async count(tenantId, where = {}) {
    return this.model.count({
      where: this._scopedWhere(tenantId, where),
    });
  }

  /**
   * Check if record exists within tenant scope
   * @param {string} tenantId - Tenant UUID
   * @param {object} where - Where conditions
   * @returns {Promise<boolean>}
   */
  async exists(tenantId, where) {
    const count = await this.count(tenantId, where);
    return count > 0;
  }

  /**
   * Execute raw query with tenant scope
   * Use with caution - prefer typed methods
   * @param {string} tenantId - Tenant UUID
   * @param {Function} callback - Callback receiving scoped model
   * @returns {Promise<any>}
   */
  async scopedQuery(tenantId, callback) {
    if (!tenantId) {
      throw new TenantMismatchError();
    }
    return callback(this.model, tenantId);
  }
}

module.exports = BaseRepository;
