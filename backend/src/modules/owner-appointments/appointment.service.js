/**
 * Owner Appointments Service
 * Business logic with strict tenant isolation
 */

const { NotFoundError, ValidationError } = require('../../shared/errors');
const { Op } = require('sequelize');

class OwnerAppointmentService {
  constructor(models) {
    this.Appointment = models.Appointment;
    this.Client = models.Client;
    this.Service = models.Service;
    this.Professional = models.Professional;
    this.User = models.User;
  }

  async create(tenantId, data) {
    const { client_id, professional_id, service_id, start_time, end_time, status, notes, price_charged } = data;

    if (!client_id || !professional_id || !service_id || !start_time) {
      throw new ValidationError('Client, professional, service, and start time are required');
    }

    // Verify all entities belong to the same tenant
    const [client, professional, service] = await Promise.all([
      this.Client.findOne({ where: { id: client_id, tenant_id: tenantId } }),
      this.Professional.findOne({ where: { id: professional_id, tenant_id: tenantId } }),
      this.Service.findOne({ where: { id: service_id, tenant_id: tenantId } }),
    ]);

    if (!client) throw new NotFoundError('Client not found');
    if (!professional) throw new NotFoundError('Professional not found');
    if (!service) throw new NotFoundError('Service not found');

    const appointment = await this.Appointment.create({
      client_id,
      professional_id,
      service_id,
      start_time,
      end_time,
      status: status || 'PENDING',
      notes,
      price_charged: price_charged || service.price,
      tenant_id: tenantId,
    });

    return this.getById(tenantId, appointment.id);
  }

  async update(tenantId, appointmentId, data) {
    const appointment = await this.Appointment.findOne({
      where: { id: appointmentId, tenant_id: tenantId },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    const { client_id, professional_id, service_id, start_time, end_time, status, notes, price_charged } = data;

    // If changing related entities, verify they belong to tenant
    if (client_id && client_id !== appointment.client_id) {
      const client = await this.Client.findOne({ where: { id: client_id, tenant_id: tenantId } });
      if (!client) throw new NotFoundError('Client not found');
    }

    if (professional_id && professional_id !== appointment.professional_id) {
      const professional = await this.Professional.findOne({ where: { id: professional_id, tenant_id: tenantId } });
      if (!professional) throw new NotFoundError('Professional not found');
    }

    if (service_id && service_id !== appointment.service_id) {
      const service = await this.Service.findOne({ where: { id: service_id, tenant_id: tenantId } });
      if (!service) throw new NotFoundError('Service not found');
    }

    await appointment.update({
      client_id,
      professional_id,
      service_id,
      start_time,
      end_time,
      status,
      notes,
      price_charged,
    });

    return this.getById(tenantId, appointmentId);
  }

  async getById(tenantId, appointmentId) {
    const appointment = await this.Appointment.findOne({
      where: { id: appointmentId, tenant_id: tenantId },
      include: [
        {
          model: this.Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'phone', 'email'],
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
        {
          model: this.Service,
          as: 'service',
          attributes: ['id', 'name', 'price', 'duration_minutes'],
        },
      ],
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    return appointment;
  }

  async getAll(tenantId, filters) {
    const { status, professional_id, client_id, date, startDate, endDate, page, limit } = filters;
    const offset = (page - 1) * limit;

    const where = { tenant_id: tenantId };

    if (status) {
      where.status = status;
    }

    if (professional_id) {
      where.professional_id = professional_id;
    }

    if (client_id) {
      where.client_id = client_id;
    }

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.start_time = { [Op.between]: [dayStart, dayEnd] };
    } else {
      if (startDate) {
        where.start_time = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        where.start_time = {
          ...where.start_time,
          [Op.lte]: new Date(endDate),
        };
      }
    }

    const { count, rows } = await this.Appointment.findAndCountAll({
      where,
      include: [
        {
          model: this.Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'phone'],
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
        {
          model: this.Service,
          as: 'service',
          attributes: ['id', 'name', 'price', 'duration_minutes'],
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

  async delete(tenantId, appointmentId) {
    const appointment = await this.Appointment.findOne({
      where: { id: appointmentId, tenant_id: tenantId },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    await appointment.destroy();
  }

  async getCalendar(tenantId, filters) {
    const { date, professional_id } = filters;

    const where = { tenant_id: tenantId };

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.start_time = { [Op.between]: [dayStart, dayEnd] };
    }

    if (professional_id) {
      where.professional_id = professional_id;
    }

    const appointments = await this.Appointment.findAll({
      where,
      include: [
        {
          model: this.Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'phone'],
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
        {
          model: this.Service,
          as: 'service',
          attributes: ['id', 'name', 'duration_minutes'],
        },
      ],
      order: [['start_time', 'ASC']],
    });

    return appointments;
  }
}

module.exports = OwnerAppointmentService;
