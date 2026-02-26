/**
 * Product Controller
 * Handles HTTP requests for product management
 */

const { HTTP_STATUS } = require('../../shared/constants');

class ProductController {
  constructor(service) {
    this.service = service;
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.getById = this.getById.bind(this);
    this.getAll = this.getAll.bind(this);
    this.delete = this.delete.bind(this);
    this.adjustStock = this.adjustStock.bind(this);
  }

  async create(req, res, next) {
    try {
      const product = await this.service.create(req.tenant.id, req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const product = await this.service.update(req.tenant.id, req.params.id, req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: product,
        message: 'Product updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await this.service.getById(req.tenant.id, req.params.id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = {
        category: req.query.category,
        active: req.query.active,
        low_stock: req.query.low_stock === 'true',
        expiring_soon: req.query.expiring_soon === 'true',
        search: req.query.search,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0,
      };

      const products = await this.service.getAll(req.tenant.id, filters);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.service.delete(req.tenant.id, req.params.id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity, notes } = req.body;
      
      const result = await this.service.adjustStock(
        req.tenant.id,
        id,
        quantity,
        notes,
        req.user.id
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Stock adjusted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
