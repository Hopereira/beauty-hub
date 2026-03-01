/**
 * Owner Services Service
 * Business logic for service management with strict tenant isolation
 */

const { NotFoundError, ValidationError } = require('../../shared/errors');
const { Op } = require('sequelize');

class OwnerServiceService {
  constructor(models) {
    this.Service = models.Service;
    this.ServiceCategory = models.ServiceCategory;
  }

  async create(tenantId, data) {
    const { name, description, price, duration_minutes, category, active } = data;

    if (!name || !price) {
      throw new ValidationError('Name and price are required');
    }

    const service = await this.Service.create({
      name,
      description,
      price,
      duration_minutes,
      category,
      active: active !== undefined ? active : true,
      tenant_id: tenantId,
    });

    return service;
  }

  async update(tenantId, serviceId, data) {
    const service = await this.Service.findOne({
      where: { id: serviceId, tenant_id: tenantId },
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    const { name, description, price, duration_minutes, category, active } = data;

    await service.update({
      name,
      description,
      price,
      duration_minutes,
      category,
      active,
    });

    return service;
  }

  async getById(tenantId, serviceId) {
    const service = await this.Service.findOne({
      where: { id: serviceId, tenant_id: tenantId },
      include: [
        {
          model: this.ServiceCategory,
          as: 'serviceCategory',
          attributes: ['id', 'name', 'color'],
        },
      ],
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    return service;
  }

  async getAll(tenantId, filters) {
    const { category, active, search, page, limit } = filters;
    const offset = (page - 1) * limit;

    const where = { tenant_id: tenantId };

    if (category) {
      where.category = category;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await this.Service.findAndCountAll({
      where,
      include: [
        {
          model: this.ServiceCategory,
          as: 'serviceCategory',
          attributes: ['id', 'name', 'color'],
        },
      ],
      order: [['name', 'ASC']],
      limit,
      offset,
    });

    return {
      data: rows,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    };
  }

  async delete(tenantId, serviceId) {
    const service = await this.Service.findOne({
      where: { id: serviceId, tenant_id: tenantId },
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    await service.destroy();
  }
}

module.exports = OwnerServiceService;
