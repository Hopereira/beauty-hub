/**
 * Owner Clients Service
 * Business logic with strict tenant isolation
 */

const { NotFoundError, ValidationError } = require('../../shared/errors');
const { Op } = require('sequelize');

class OwnerClientService {
  constructor(models) {
    this.Client = models.Client;
    this.Appointment = models.Appointment;
    this.Service = models.Service;
    this.Professional = models.Professional;
    this.User = models.User;
  }

  async create(tenantId, data) {
    const { first_name, last_name, email, phone, birth_date, address, notes } = data;

    if (!first_name || !last_name) {
      throw new ValidationError('First name and last name are required');
    }

    // Check for duplicate email in same tenant
    if (email) {
      const existing = await this.Client.findOne({
        where: { email, tenant_id: tenantId },
      });
      if (existing) {
        throw new ValidationError('Client with this email already exists');
      }
    }

    const client = await this.Client.create({
      first_name,
      last_name,
      email,
      phone,
      birth_date,
      address,
      notes,
      tenant_id: tenantId,
    });

    return client;
  }

  async update(tenantId, clientId, data) {
    const client = await this.Client.findOne({
      where: { id: clientId, tenant_id: tenantId },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const { first_name, last_name, email, phone, birth_date, address, notes } = data;

    // Check for duplicate email (excluding current client)
    if (email && email !== client.email) {
      const existing = await this.Client.findOne({
        where: { 
          email, 
          tenant_id: tenantId,
          id: { [Op.ne]: clientId },
        },
      });
      if (existing) {
        throw new ValidationError('Client with this email already exists');
      }
    }

    await client.update({
      first_name,
      last_name,
      email,
      phone,
      birth_date,
      address,
      notes,
    });

    return client;
  }

  async getById(tenantId, clientId) {
    const client = await this.Client.findOne({
      where: { id: clientId, tenant_id: tenantId },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    return client;
  }

  async getAll(tenantId, filters) {
    const { search, active, page, limit } = filters;
    const offset = (page - 1) * limit;

    const where = { tenant_id: tenantId };

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await this.Client.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
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

  async delete(tenantId, clientId) {
    const client = await this.Client.findOne({
      where: { id: clientId, tenant_id: tenantId },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    await client.destroy();
  }

  async getAppointments(tenantId, clientId, filters) {
    const { status, startDate, endDate, page, limit } = filters;
    const offset = (page - 1) * limit;

    // Verify client belongs to tenant
    const client = await this.Client.findOne({
      where: { id: clientId, tenant_id: tenantId },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const where = { 
      client_id: clientId,
      tenant_id: tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (startDate) {
      where.start_time = { [Op.gte]: new Date(startDate) };
    }

    if (endDate) {
      where.start_time = { 
        ...where.start_time,
        [Op.lte]: new Date(endDate),
      };
    }

    const { count, rows } = await this.Appointment.findAndCountAll({
      where,
      include: [
        {
          model: this.Service,
          as: 'service',
          attributes: ['id', 'name', 'price', 'duration_minutes'],
        },
        {
          model: this.Professional,
          as: 'professional',
          attributes: ['id', 'specialty'],
          include: [
            {
              model: this.User,
              as: 'user',
              attributes: ['id', 'first_name', 'last_name'],
            },
          ],
        },
      ],
      order: [['start_time', 'DESC']],
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
}

module.exports = OwnerClientService;
