/**
 * Professional Detail Controller
 * Handles HTTP requests for professional management
 */

const { HTTP_STATUS } = require('../../shared/constants');

class ProfessionalDetailController {
  constructor(service) {
    this.service = service;

    // Bind methods
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.getById = this.getById.bind(this);
    this.getAll = this.getAll.bind(this);
    this.delete = this.delete.bind(this);
    this.addSpecialty = this.addSpecialty.bind(this);
    this.removeSpecialty = this.removeSpecialty.bind(this);
    this.setServiceCommission = this.setServiceCommission.bind(this);
    this.getStatistics = this.getStatistics.bind(this);
  }

  /**
   * POST /api/professionals
   * Create professional detail
   */
  async create(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      const professional = await this.service.create(tenantId, req.body, userId);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: professional,
        message: 'Professional created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/professionals/:id
   * Update professional detail
   */
  async update(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const professional = await this.service.update(tenantId, id, req.body);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: professional,
        message: 'Professional updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/professionals/:id
   * Get professional by ID
   */
  async getById(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const professional = await this.service.getById(tenantId, id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: professional,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/professionals
   * Get all professionals with filters
   */
  async getAll(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const filters = {
        active: req.query.active,
        contract_type: req.query.contract_type,
        specialty_id: req.query.specialty_id,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0,
      };

      const professionals = await this.service.getAll(tenantId, filters);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: professionals,
        count: professionals.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/professionals/:id
   * Delete professional
   */
  async delete(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      await this.service.delete(tenantId, id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Professional deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/professionals/:id/specialties
   * Add specialty to professional
   */
  async addSpecialty(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      const { service_id } = req.body;

      const specialty = await this.service.addSpecialty(tenantId, id, service_id);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: specialty,
        message: 'Specialty added successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/professionals/:id/specialties/:serviceId
   * Remove specialty from professional
   */
  async removeSpecialty(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id, serviceId } = req.params;

      await this.service.removeSpecialty(tenantId, id, serviceId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Specialty removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/professionals/:id/commissions
   * Set service commission for professional
   */
  async setServiceCommission(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      const { service_id, commission_percentage } = req.body;

      const commission = await this.service.setServiceCommission(
        tenantId,
        id,
        service_id,
        commission_percentage
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: commission,
        message: 'Commission set successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/professionals/:id/statistics
   * Get professional statistics
   */
  async getStatistics(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await this.service.getStatistics(
        tenantId,
        id,
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
}

module.exports = ProfessionalDetailController;
