/**
 * Owner Financial Controller
 * Refactored to use tenant_id instead of establishment_id
 */

const { HTTP_STATUS } = require('../../shared/constants');

class OwnerFinancialController {
  constructor(service) {
    this.service = service;
    this.getSummary = this.getSummary.bind(this);
    this.listEntries = this.listEntries.bind(this);
    this.getEntryById = this.getEntryById.bind(this);
    this.createEntry = this.createEntry.bind(this);
    this.updateEntry = this.updateEntry.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.listExits = this.listExits.bind(this);
    this.getExitById = this.getExitById.bind(this);
    this.createExit = this.createExit.bind(this);
    this.updateExit = this.updateExit.bind(this);
    this.deleteExit = this.deleteExit.bind(this);
    this.listPaymentMethods = this.listPaymentMethods.bind(this);
    this.createPaymentMethod = this.createPaymentMethod.bind(this);
    this.updatePaymentMethod = this.updatePaymentMethod.bind(this);
    this.deletePaymentMethod = this.deletePaymentMethod.bind(this);
  }

  async getSummary(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { start_date, end_date } = req.query;

      const summary = await this.service.getSummary(tenantId, { start_date, end_date });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async listEntries(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const filters = {
        status: req.query.status,
        payment_method_id: req.query.payment_method_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      const result = await this.service.listEntries(tenantId, filters);

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

  async getEntryById(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const entry = await this.service.getEntryById(tenantId, id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  async createEntry(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const entry = await this.service.createEntry(tenantId, req.body);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: entry,
        message: 'Financial entry created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEntry(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const entry = await this.service.updateEntry(tenantId, id, req.body);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: entry,
        message: 'Financial entry updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteEntry(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      await this.service.deleteEntry(tenantId, id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Financial entry deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async listExits(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const filters = {
        status: req.query.status,
        category: req.query.category,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      const result = await this.service.listExits(tenantId, filters);

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

  async getExitById(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const exit = await this.service.getExitById(tenantId, id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: exit,
      });
    } catch (error) {
      next(error);
    }
  }

  async createExit(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const exit = await this.service.createExit(tenantId, req.body);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: exit,
        message: 'Financial exit created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateExit(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const exit = await this.service.updateExit(tenantId, id, req.body);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: exit,
        message: 'Financial exit updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteExit(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      await this.service.deleteExit(tenantId, id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Financial exit deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async listPaymentMethods(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const methods = await this.service.listPaymentMethods(tenantId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: methods,
      });
    } catch (error) {
      next(error);
    }
  }

  async createPaymentMethod(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const method = await this.service.createPaymentMethod(tenantId, req.body);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: method,
        message: 'Payment method created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePaymentMethod(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const method = await this.service.updatePaymentMethod(tenantId, id, req.body);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: method,
        message: 'Payment method updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePaymentMethod(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      await this.service.deletePaymentMethod(tenantId, id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Payment method deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OwnerFinancialController;
