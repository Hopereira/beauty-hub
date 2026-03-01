/**
 * Owner Financial Service
 * Business logic with strict tenant isolation
 */

const { NotFoundError, ValidationError } = require('../../shared/errors');
const { Op } = require('sequelize');

class OwnerFinancialService {
  constructor(models, sequelize) {
    this.FinancialEntry = models.FinancialEntry;
    this.FinancialExit = models.FinancialExit;
    this.PaymentMethod = models.PaymentMethod;
    this.Client = models.Client;
    this.Appointment = models.Appointment;
    this.sequelize = sequelize;
  }

  buildDateFilter(field, startDate, endDate) {
    const where = {};
    if (startDate && endDate) {
      where[field] = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    } else if (startDate) {
      where[field] = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where[field] = { [Op.lte]: new Date(endDate) };
    }
    return where;
  }

  async getSummary(tenantId, filters) {
    const { start_date, end_date } = filters;

    const entryWhere = { tenant_id: tenantId };
    const exitWhere = { tenant_id: tenantId };

    if (start_date || end_date) {
      Object.assign(entryWhere, this.buildDateFilter('entry_date', start_date, end_date));
      Object.assign(exitWhere, this.buildDateFilter('exit_date', start_date, end_date));
    }

    // Total entries by status
    const entries = await this.FinancialEntry.findAll({
      where: entryWhere,
      attributes: [
        'status',
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total'],
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // Total exits by status
    const exits = await this.FinancialExit.findAll({
      where: exitWhere,
      attributes: [
        'status',
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total'],
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // Entries by payment method
    const byPaymentMethod = await this.FinancialEntry.findAll({
      where: { ...entryWhere, status: 'PAID' },
      attributes: [
        'payment_method_id',
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total'],
        [this.sequelize.fn('COUNT', this.sequelize.col('FinancialEntry.id')), 'count'],
      ],
      include: [{ model: this.PaymentMethod, as: 'paymentMethod', attributes: ['name'] }],
      group: ['payment_method_id', 'paymentMethod.id', 'paymentMethod.name'],
      raw: true,
      nest: true,
    });

    const totalPaidEntries = entries.find(e => e.status === 'PAID')?.total || 0;
    const totalPendingEntries = entries.find(e => e.status === 'PENDING')?.total || 0;
    const totalPaidExits = exits.find(e => e.status === 'PAID')?.total || 0;
    const totalPendingExits = exits.find(e => e.status === 'PENDING')?.total || 0;

    return {
      entries: {
        paid: { 
          total: Number(totalPaidEntries), 
          count: Number(entries.find(e => e.status === 'PAID')?.count || 0) 
        },
        pending: { 
          total: Number(totalPendingEntries), 
          count: Number(entries.find(e => e.status === 'PENDING')?.count || 0) 
        },
      },
      exits: {
        paid: { 
          total: Number(totalPaidExits), 
          count: Number(exits.find(e => e.status === 'PAID')?.count || 0) 
        },
        pending: { 
          total: Number(totalPendingExits), 
          count: Number(exits.find(e => e.status === 'PENDING')?.count || 0) 
        },
      },
      profit: Number(totalPaidEntries) - Number(totalPaidExits),
      byPaymentMethod: byPaymentMethod.map(pm => ({
        name: pm.paymentMethod.name,
        total: Number(pm.total),
        count: Number(pm.count),
      })),
    };
  }

  async listEntries(tenantId, filters) {
    const { status, payment_method_id, start_date, end_date, page, limit } = filters;
    const offset = (page - 1) * limit;

    const where = { tenant_id: tenantId };

    if (status) where.status = status;
    if (payment_method_id) where.payment_method_id = payment_method_id;
    Object.assign(where, this.buildDateFilter('entry_date', start_date, end_date));

    const { count, rows } = await this.FinancialEntry.findAndCountAll({
      where,
      include: [
        { model: this.Client, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
        { model: this.PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name'] },
        { model: this.Appointment, as: 'appointment', attributes: ['id', 'start_time', 'status'] },
      ],
      order: [['entry_date', 'DESC']],
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

  async getEntryById(tenantId, entryId) {
    const entry = await this.FinancialEntry.findOne({
      where: { id: entryId, tenant_id: tenantId },
      include: [
        { model: this.Client, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
        { model: this.PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name'] },
      ],
    });

    if (!entry) {
      throw new NotFoundError('Financial entry not found');
    }

    return entry;
  }

  async createEntry(tenantId, data) {
    const { description, amount, entry_date, status, payment_method_id, client_id, appointment_id } = data;

    if (!description || !amount || !entry_date) {
      throw new ValidationError('Description, amount, and entry date are required');
    }

    const entry = await this.FinancialEntry.create({
      description,
      amount,
      entry_date,
      status: status || 'PENDING',
      payment_method_id,
      client_id,
      appointment_id,
      tenant_id: tenantId,
    });

    return this.getEntryById(tenantId, entry.id);
  }

  async updateEntry(tenantId, entryId, data) {
    const entry = await this.FinancialEntry.findOne({
      where: { id: entryId, tenant_id: tenantId },
    });

    if (!entry) {
      throw new NotFoundError('Financial entry not found');
    }

    const { description, amount, entry_date, status, payment_method_id, client_id, appointment_id } = data;

    await entry.update({
      description,
      amount,
      entry_date,
      status,
      payment_method_id,
      client_id,
      appointment_id,
    });

    return this.getEntryById(tenantId, entryId);
  }

  async deleteEntry(tenantId, entryId) {
    const entry = await this.FinancialEntry.findOne({
      where: { id: entryId, tenant_id: tenantId },
    });

    if (!entry) {
      throw new NotFoundError('Financial entry not found');
    }

    await entry.destroy();
  }

  async listExits(tenantId, filters) {
    const { status, category, start_date, end_date, page, limit } = filters;
    const offset = (page - 1) * limit;

    const where = { tenant_id: tenantId };

    if (status) where.status = status;
    if (category) where.category = category;
    Object.assign(where, this.buildDateFilter('exit_date', start_date, end_date));

    const { count, rows } = await this.FinancialExit.findAndCountAll({
      where,
      order: [['exit_date', 'DESC']],
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

  async getExitById(tenantId, exitId) {
    const exit = await this.FinancialExit.findOne({
      where: { id: exitId, tenant_id: tenantId },
    });

    if (!exit) {
      throw new NotFoundError('Financial exit not found');
    }

    return exit;
  }

  async createExit(tenantId, data) {
    const { description, amount, exit_date, status, category } = data;

    if (!description || !amount || !exit_date) {
      throw new ValidationError('Description, amount, and exit date are required');
    }

    const exit = await this.FinancialExit.create({
      description,
      amount,
      exit_date,
      status: status || 'PENDING',
      category,
      tenant_id: tenantId,
    });

    return exit;
  }

  async updateExit(tenantId, exitId, data) {
    const exit = await this.FinancialExit.findOne({
      where: { id: exitId, tenant_id: tenantId },
    });

    if (!exit) {
      throw new NotFoundError('Financial exit not found');
    }

    const { description, amount, exit_date, status, category } = data;

    await exit.update({
      description,
      amount,
      exit_date,
      status,
      category,
    });

    return exit;
  }

  async deleteExit(tenantId, exitId) {
    const exit = await this.FinancialExit.findOne({
      where: { id: exitId, tenant_id: tenantId },
    });

    if (!exit) {
      throw new NotFoundError('Financial exit not found');
    }

    await exit.destroy();
  }

  async listPaymentMethods(tenantId) {
    const methods = await this.PaymentMethod.findAll({
      where: { tenant_id: tenantId },
      order: [['name', 'ASC']],
    });

    return methods;
  }

  async createPaymentMethod(tenantId, data) {
    const { name, active } = data;

    if (!name) {
      throw new ValidationError('Name is required');
    }

    const method = await this.PaymentMethod.create({
      name,
      active: active !== undefined ? active : true,
      tenant_id: tenantId,
    });

    return method;
  }

  async updatePaymentMethod(tenantId, methodId, data) {
    const method = await this.PaymentMethod.findOne({
      where: { id: methodId, tenant_id: tenantId },
    });

    if (!method) {
      throw new NotFoundError('Payment method not found');
    }

    const { name, active } = data;

    await method.update({ name, active });

    return method;
  }

  async deletePaymentMethod(tenantId, methodId) {
    const method = await this.PaymentMethod.findOne({
      where: { id: methodId, tenant_id: tenantId },
    });

    if (!method) {
      throw new NotFoundError('Payment method not found');
    }

    await method.destroy();
  }
}

module.exports = OwnerFinancialService;
