/**
 * Supplier Repository
 */

const BaseRepository = require('../../shared/database/baseRepository');
const { Op } = require('sequelize');

class SupplierRepository extends BaseRepository {
  constructor(models) {
    super(models.Supplier);
    this.models = models;
  }

  async findAllWithFilters(tenantId, filters = {}) {
    const where = this._scopedWhere(tenantId, {});
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const offset = (page - 1) * limit;

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { document: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset,
    });

    return {
      data: rows,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    };
  }
}

module.exports = SupplierRepository;
