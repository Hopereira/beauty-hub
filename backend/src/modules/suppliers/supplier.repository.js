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

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { document: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    return this.model.findAll({
      where,
      order: [['name', 'ASC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    });
  }
}

module.exports = SupplierRepository;
