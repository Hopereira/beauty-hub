/**
 * Payment Transaction Controller
 */

const { HTTP_STATUS } = require('../../shared/constants');

class PaymentTransactionController {
  constructor(service) {
    this.service = service;
    this.create = this.create.bind(this);
    this.getById = this.getById.bind(this);
    this.getAll = this.getAll.bind(this);
    this.delete = this.delete.bind(this);
    this.getRevenueStats = this.getRevenueStats.bind(this);
    this.getRevenueByProfessional = this.getRevenueByProfessional.bind(this);
    this.getTopServices = this.getTopServices.bind(this);
  }

  async create(req, res, next) {
    try {
      const transaction = await this.service.create(req.tenant.id, req.body, req.user.id);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: transaction,
        message: 'Payment registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const transaction = await this.service.getById(req.tenant.id, req.params.id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = {
        professional_id: req.query.professional_id,
        service_id: req.query.service_id,
        client_id: req.query.client_id,
        payment_method: req.query.payment_method,
        payment_status: req.query.payment_status,
        startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0,
      };

      const transactions = await this.service.getAll(req.tenant.id, filters);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: transactions,
        count: transactions.length,
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
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getRevenueStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await this.service.getRevenueStats(
        req.tenant.id,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRevenueByProfessional(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const data = await this.service.getRevenueByProfessional(
        req.tenant.id,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTopServices(req, res, next) {
    try {
      const { startDate, endDate, limit } = req.query;
      const data = await this.service.getTopServices(
        req.tenant.id,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        parseInt(limit) || 10
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PaymentTransactionController;
