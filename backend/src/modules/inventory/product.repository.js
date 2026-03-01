/**
 * Product Repository
 * Data access layer for products
 */

const BaseRepository = require('../../shared/database/baseRepository');
const { Op } = require('sequelize');

class ProductRepository extends BaseRepository {
  constructor(models) {
    super(models.Product);
    this.models = models;
  }

  /**
   * Find products with filters
   */
  async findAllWithFilters(tenantId, filters = {}) {
    const where = this._scopedWhere(tenantId, {});
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const offset = (page - 1) * limit;

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.low_stock) {
      where[Op.and] = [
        this.models.Sequelize.where(
          this.models.Sequelize.col('stock_quantity'),
          Op.lte,
          this.models.Sequelize.col('minimum_stock')
        ),
      ];
    }

    if (filters.expiring_soon) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      where.expiration_date = {
        [Op.lte]: futureDate,
        [Op.gte]: new Date(),
      };
    }

    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { internal_code: { [Op.iLike]: `%${filters.search}%` } },
        { barcode: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      include: [
        {
          model: this.models.Supplier,
          as: 'supplier',
          attributes: ['id', 'name'],
        },
      ],
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

  /**
   * Update stock quantity
   */
  async updateStock(tenantId, productId, quantity) {
    const product = await this.findById(tenantId, productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const newQuantity = product.stock_quantity + quantity;
    await product.update({ stock_quantity: newQuantity });

    return {
      previous_stock: product.stock_quantity,
      new_stock: newQuantity,
    };
  }
}

module.exports = ProductRepository;
