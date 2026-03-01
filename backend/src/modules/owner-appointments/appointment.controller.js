/**
 * Owner Appointments Controller
 * Refactored to use tenant_id instead of establishment_id
 */

const { HTTP_STATUS } = require('../../shared/constants');

class OwnerAppointmentController {
  constructor(service) {
    this.service = service;
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.getById = this.getById.bind(this);
    this.getAll = this.getAll.bind(this);
    this.delete = this.delete.bind(this);
    this.getCalendar = this.getCalendar.bind(this);
  }

  async create(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const appointment = await this.service.create(tenantId, req.body);
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: appointment,
        message: 'Appointment created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      
      const appointment = await this.service.update(tenantId, id, req.body);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: appointment,
        message: 'Appointment updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      
      const appointment = await this.service.getById(tenantId, id);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const filters = {
        status: req.query.status,
        professional_id: req.query.professional_id,
        client_id: req.query.client_id,
        date: req.query.date,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
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
        message: 'Appointment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getCalendar(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { date, professional_id } = req.query;

      const appointments = await this.service.getCalendar(tenantId, { date, professional_id });
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OwnerAppointmentController;
