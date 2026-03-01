/**
 * Owner Reports Controller
 * Refactored to use tenant_id instead of establishment_id
 */

const { HTTP_STATUS } = require('../../shared/constants');

class OwnerReportsController {
  constructor(service) {
    this.service = service;
    this.getRevenueByPeriod = this.getRevenueByPeriod.bind(this);
    this.getCommissionByProfessional = this.getCommissionByProfessional.bind(this);
    this.getTopServices = this.getTopServices.bind(this);
    this.getTopProducts = this.getTopProducts.bind(this);
    this.getFinancialSummary = this.getFinancialSummary.bind(this);
  }

  async getRevenueByPeriod(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { startDate, endDate, groupBy } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const result = await this.service.getRevenueByPeriod(tenantId, { startDate, endDate, groupBy });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCommissionByProfessional(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const result = await this.service.getCommissionByProfessional(tenantId, { startDate, endDate });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTopServices(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { startDate, endDate, limit } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const result = await this.service.getTopServices(tenantId, { startDate, endDate, limit });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTopProducts(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { startDate, endDate, limit } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const result = await this.service.getTopProducts(tenantId, { startDate, endDate, limit });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinancialSummary(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const result = await this.service.getFinancialSummary(tenantId, { startDate, endDate });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OwnerReportsController;
