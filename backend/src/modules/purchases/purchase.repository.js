/**
 * Purchase Repository
 */

const BaseRepository = require('../../shared/database/baseRepository');
const { Op } = require('sequelize');

class PurchaseRepository extends BaseRepository {
  constructor(models) {
    super(models.Purchase);
    this.models = models;
  }

  async findAllWithFilters(tenantId, filters = {}) {
    const where = this._scopedWhere(tenantId, {});
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const offset = (page - 1) * limit;

    if (filters.supplier_id) {
      where.supplier_id = filters.supplier_id;
    }

    if (filters.payment_status) {
      where.payment_status = filters.payment_status;
    }

    if (filters.startDate && filters.endDate) {
      where.purchase_date = {
        [Op.between]: [filters.startDate, filters.endDate],
      };
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      include: [
        {
          model: this.models.Supplier,
          as: 'supplier',
          attributes: ['id', 'name'],
        },
        {
          model: this.models.PurchaseItem,
          as: 'items',
          include: [
            {
              model: this.models.Product,
              as: 'product',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      order: [['purchase_date', 'DESC']],
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

module.exports = PurchaseRepository;
