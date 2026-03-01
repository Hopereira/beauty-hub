/**
 * Supplier Controller
 */

const { HTTP_STATUS } = require('../../shared/constants');

class SupplierController {
  constructor(service) {
    this.service = service;
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.getById = this.getById.bind(this);
    this.getAll = this.getAll.bind(this);
    this.delete = this.delete.bind(this);
  }

  async create(req, res, next) {
    try {
      const supplier = await this.service.create(req.tenant.id, req.body);
      res.status(HTTP_STATUS.CREATED).json({ success: true, data: supplier, message: 'Supplier created successfully' });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const supplier = await this.service.update(req.tenant.id, req.params.id, req.body);
      res.status(HTTP_STATUS.OK).json({ success: true, data: supplier, message: 'Supplier updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const supplier = await this.service.getById(req.tenant.id, req.params.id);
      res.status(HTTP_STATUS.OK).json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = {
        active: req.query.active,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 100,
      };
      const result = await this.service.getAll(req.tenant.id, filters);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: result.pages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.service.delete(req.tenant.id, req.params.id);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Supplier deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SupplierController;
