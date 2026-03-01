/**
 * Owner Services Controller
 * Refactored to use tenant_id instead of establishment_id
 * Multi-tenant isolation guaranteed
 */

const { HTTP_STATUS } = require('../../shared/constants');

class OwnerServiceController {
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
      const tenantId = req.tenant.id;
      const service = await this.service.create(tenantId, req.body);
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: service,
        message: 'Service created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      
      const service = await this.service.update(tenantId, id, req.body);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: service,
        message: 'Service updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      
      const service = await this.service.getById(tenantId, id);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const filters = {
        category: req.query.category,
        active: req.query.active,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      const result = await this.service.getAll(tenantId, filters);
      
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
      const tenantId = req.tenant.id;
      const { id } = req.params;
      
      await this.service.delete(tenantId, id);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Service deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OwnerServiceController;
