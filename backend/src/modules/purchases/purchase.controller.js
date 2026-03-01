/**
 * Purchase Controller
 */

const { HTTP_STATUS } = require('../../shared/constants');

class PurchaseController {
  constructor(service) {
    this.service = service;
    this.create = this.create.bind(this);
    this.getById = this.getById.bind(this);
    this.getAll = this.getAll.bind(this);
    this.delete = this.delete.bind(this);
  }

  async create(req, res, next) {
    try {
      const purchase = await this.service.create(req.tenant.id, req.body, req.user.id);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: purchase,
        message: 'Purchase created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const purchase = await this.service.getById(req.tenant.id, req.params.id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: purchase,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = {
        supplier_id: req.query.supplier_id,
        payment_status: req.query.payment_status,
        startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
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
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Purchase deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PurchaseController;
