/**
 * Professional Detail Service
 * Business logic for professional management
 */

const { NotFoundError, ValidationError } = require('../../shared/errors');

class ProfessionalDetailService {
  constructor(repository, models) {
    this.repository = repository;
    this.models = models;
  }

  /**
   * Create professional detail
   */
  async create(tenantId, data, userId) {
    // Validate user exists and belongs to tenant
    const user = await this.models.User.findOne({
      where: { id: data.user_id, tenant_id: tenantId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if professional detail already exists
    const existing = await this.repository.findByUserId(tenantId, data.user_id);
    if (existing) {
      throw new ValidationError('Professional detail already exists for this user');
    }

    return this.repository.create(tenantId, {
      ...data,
      tenant_id: tenantId,
    });
  }

  /**
   * Update professional detail
   */
  async update(tenantId, id, data) {
    const professional = await this.repository.findById(tenantId, id);
    if (!professional) {
      throw new NotFoundError('Professional not found');
    }

    return this.repository.update(tenantId, id, data);
  }

  /**
   * Get professional by ID
   */
  async getById(tenantId, id) {
    const professional = await this.repository.findById(tenantId, id, {
      include: [
        {
          model: this.models.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
        },
        {
          model: this.models.ProfessionalSpecialty,
          as: 'specialties',
          include: [
            {
              model: this.models.Service,
              as: 'service',
            },
          ],
        },
        {
          model: this.models.ProfessionalServiceCommission,
          as: 'commissions',
          include: [
            {
              model: this.models.Service,
              as: 'service',
            },
          ],
        },
      ],
    });

    if (!professional) {
      throw new NotFoundError('Professional not found');
    }

    return professional;
  }

  /**
   * Get all professionals with filters
   */
  async getAll(tenantId, filters = {}) {
    return this.repository.findAllWithFilters(tenantId, filters);
  }

  /**
   * Add specialty to professional
   */
  async addSpecialty(tenantId, professionalId, serviceId) {
    const professional = await this.repository.findById(tenantId, professionalId);
    if (!professional) {
      throw new NotFoundError('Professional not found');
    }

    const service = await this.models.Service.findOne({
      where: { id: serviceId, tenant_id: tenantId },
    });
    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check if specialty already exists
    const existing = await this.models.ProfessionalSpecialty.findOne({
      where: {
        tenant_id: tenantId,
        professional_id: professionalId,
        service_id: serviceId,
      },
    });

    if (existing) {
      throw new ValidationError('Specialty already exists');
    }

    return this.models.ProfessionalSpecialty.create({
      tenant_id: tenantId,
      professional_id: professionalId,
      service_id: serviceId,
    });
  }

  /**
   * Remove specialty from professional
   */
  async removeSpecialty(tenantId, professionalId, serviceId) {
    const specialty = await this.models.ProfessionalSpecialty.findOne({
      where: {
        tenant_id: tenantId,
        professional_id: professionalId,
        service_id: serviceId,
      },
    });

    if (!specialty) {
      throw new NotFoundError('Specialty not found');
    }

    await specialty.destroy();
    return { success: true };
  }

  /**
   * Set service commission
   */
  async setServiceCommission(tenantId, professionalId, serviceId, commissionPercentage) {
    const professional = await this.repository.findById(tenantId, professionalId);
    if (!professional) {
      throw new NotFoundError('Professional not found');
    }

    const service = await this.models.Service.findOne({
      where: { id: serviceId, tenant_id: tenantId },
    });
    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check if commission already exists
    const existing = await this.models.ProfessionalServiceCommission.findOne({
      where: {
        tenant_id: tenantId,
        professional_id: professionalId,
        service_id: serviceId,
      },
    });

    if (existing) {
      // Update existing
      await existing.update({ commission_percentage: commissionPercentage });
      return existing;
    }

    // Create new
    return this.models.ProfessionalServiceCommission.create({
      tenant_id: tenantId,
      professional_id: professionalId,
      service_id: serviceId,
      commission_percentage: commissionPercentage,
    });
  }

  /**
   * Get professional statistics
   */
  async getStatistics(tenantId, professionalId, startDate, endDate) {
    const professional = await this.repository.findById(tenantId, professionalId);
    if (!professional) {
      throw new NotFoundError('Professional not found');
    }

    return this.repository.getStatistics(tenantId, professionalId, startDate, endDate);
  }

  /**
   * Delete professional
   */
  async delete(tenantId, id) {
    const professional = await this.repository.findById(tenantId, id);
    if (!professional) {
      throw new NotFoundError('Professional not found');
    }

    return this.repository.delete(tenantId, id);
  }
}

module.exports = ProfessionalDetailService;
