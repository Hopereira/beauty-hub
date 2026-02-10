const { FinancialEntry, FinancialExit, PaymentMethod, Client, Appointment, Establishment, Professional, sequelize } = require('../models');
const { Op } = require('sequelize');

async function getEstablishmentId(user) {
  if (user.role === 'ADMIN') {
    const est = await Establishment.findOne({ where: { user_id: user.id } });
    return est ? est.id : null;
  }
  if (user.role === 'PROFESSIONAL') {
    const prof = await Professional.findOne({ where: { user_id: user.id } });
    return prof ? prof.establishment_id : null;
  }
  return null;
}

function buildDateFilter(field, startDate, endDate) {
  const where = {};
  if (startDate && endDate) {
    where[field] = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where[field] = { [Op.gte]: startDate };
  } else if (endDate) {
    where[field] = { [Op.lte]: endDate };
  }
  return where;
}

// ── Summary ──
async function summary(req, res, next) {
  try {
    const estId = await getEstablishmentId(req.user);
    const { start_date, end_date } = req.query;

    const entryWhere = { establishment_id: estId };
    const exitWhere = { establishment_id: estId };

    if (start_date || end_date) {
      Object.assign(entryWhere, buildDateFilter('entry_date', start_date, end_date));
      Object.assign(exitWhere, buildDateFilter('exit_date', start_date, end_date));
    }

    // Total entries by status
    const entries = await FinancialEntry.findAll({
      where: entryWhere,
      attributes: [
        'status',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // Total exits by status
    const exits = await FinancialExit.findAll({
      where: exitWhere,
      attributes: [
        'status',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // Entries by payment method
    const byPaymentMethod = await FinancialEntry.findAll({
      where: { ...entryWhere, status: 'PAID' },
      attributes: [
        'payment_method_id',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('FinancialEntry.id')), 'count'],
      ],
      include: [{ model: PaymentMethod, as: 'paymentMethod', attributes: ['name'] }],
      group: ['payment_method_id', 'paymentMethod.id', 'paymentMethod.name'],
      raw: true,
      nest: true,
    });

    const totalPaidEntries = entries.find(e => e.status === 'PAID')?.total || 0;
    const totalPendingEntries = entries.find(e => e.status === 'PENDING')?.total || 0;
    const totalPaidExits = exits.find(e => e.status === 'PAID')?.total || 0;
    const totalPendingExits = exits.find(e => e.status === 'PENDING')?.total || 0;

    res.json({
      success: true,
      message: 'Resumo financeiro obtido com sucesso.',
      data: {
        entries: {
          paid: { total: Number(totalPaidEntries), count: Number(entries.find(e => e.status === 'PAID')?.count || 0) },
          pending: { total: Number(totalPendingEntries), count: Number(entries.find(e => e.status === 'PENDING')?.count || 0) },
        },
        exits: {
          paid: { total: Number(totalPaidExits), count: Number(exits.find(e => e.status === 'PAID')?.count || 0) },
          pending: { total: Number(totalPendingExits), count: Number(exits.find(e => e.status === 'PENDING')?.count || 0) },
        },
        profit: Number(totalPaidEntries) - Number(totalPaidExits),
        byPaymentMethod: byPaymentMethod.map(pm => ({
          name: pm.paymentMethod.name,
          total: Number(pm.total),
          count: Number(pm.count),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── Entries ──
async function listEntries(req, res, next) {
  try {
    const { page = 1, limit = 10, sort = 'entry_date', order = 'DESC', start_date, end_date, payment_method_id, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    const estId = await getEstablishmentId(req.user);
    if (estId) where.establishment_id = estId;
    if (status) where.status = status;
    if (payment_method_id) where.payment_method_id = payment_method_id;
    Object.assign(where, buildDateFilter('entry_date', start_date, end_date));

    const { count, rows } = await FinancialEntry.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
        { model: PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name'] },
        { model: Appointment, as: 'appointment', attributes: ['id', 'start_time', 'status'] },
      ],
      order: [[sort, order]],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Entradas financeiras listadas com sucesso.',
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getEntryById(req, res, next) {
  try {
    const entry = await FinancialEntry.findByPk(req.params.id, {
      include: [
        { model: Client, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
        { model: PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name'] },
      ],
    });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entrada não encontrada.', error: { code: 'ENTRY_NOT_FOUND', details: null } });
    }
    res.json({ success: true, message: 'Entrada obtida com sucesso.', data: entry });
  } catch (err) {
    next(err);
  }
}

async function createEntry(req, res, next) {
  try {
    const estId = await getEstablishmentId(req.user);
    if (!estId) {
      return res.status(400).json({ success: false, message: 'Estabelecimento não encontrado.', error: { code: 'NO_ESTABLISHMENT', details: null } });
    }
    const entry = await FinancialEntry.create({ ...req.body, establishment_id: estId });
    res.status(201).json({ success: true, message: 'Entrada criada com sucesso.', data: entry });
  } catch (err) {
    next(err);
  }
}

async function updateEntry(req, res, next) {
  try {
    const entry = await FinancialEntry.findByPk(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entrada não encontrada.', error: { code: 'ENTRY_NOT_FOUND', details: null } });
    }
    await entry.update(req.body);
    res.json({ success: true, message: 'Entrada atualizada com sucesso.', data: entry });
  } catch (err) {
    next(err);
  }
}

async function deleteEntry(req, res, next) {
  try {
    const entry = await FinancialEntry.findByPk(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entrada não encontrada.', error: { code: 'ENTRY_NOT_FOUND', details: null } });
    }
    await entry.destroy();
    res.json({ success: true, message: 'Entrada removida com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

// ── Exits ──
async function listExits(req, res, next) {
  try {
    const { page = 1, limit = 10, sort = 'exit_date', order = 'DESC', start_date, end_date, category, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    const estId = await getEstablishmentId(req.user);
    if (estId) where.establishment_id = estId;
    if (status) where.status = status;
    if (category) where.category = category;
    Object.assign(where, buildDateFilter('exit_date', start_date, end_date));

    const { count, rows } = await FinancialExit.findAndCountAll({
      where,
      order: [[sort, order]],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Saídas financeiras listadas com sucesso.',
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getExitById(req, res, next) {
  try {
    const exit = await FinancialExit.findByPk(req.params.id);
    if (!exit) {
      return res.status(404).json({ success: false, message: 'Saída não encontrada.', error: { code: 'EXIT_NOT_FOUND', details: null } });
    }
    res.json({ success: true, message: 'Saída obtida com sucesso.', data: exit });
  } catch (err) {
    next(err);
  }
}

async function createExit(req, res, next) {
  try {
    const estId = await getEstablishmentId(req.user);
    if (!estId) {
      return res.status(400).json({ success: false, message: 'Estabelecimento não encontrado.', error: { code: 'NO_ESTABLISHMENT', details: null } });
    }
    const exit = await FinancialExit.create({ ...req.body, establishment_id: estId });
    res.status(201).json({ success: true, message: 'Saída criada com sucesso.', data: exit });
  } catch (err) {
    next(err);
  }
}

async function updateExit(req, res, next) {
  try {
    const exit = await FinancialExit.findByPk(req.params.id);
    if (!exit) {
      return res.status(404).json({ success: false, message: 'Saída não encontrada.', error: { code: 'EXIT_NOT_FOUND', details: null } });
    }
    await exit.update(req.body);
    res.json({ success: true, message: 'Saída atualizada com sucesso.', data: exit });
  } catch (err) {
    next(err);
  }
}

async function deleteExit(req, res, next) {
  try {
    const exit = await FinancialExit.findByPk(req.params.id);
    if (!exit) {
      return res.status(404).json({ success: false, message: 'Saída não encontrada.', error: { code: 'EXIT_NOT_FOUND', details: null } });
    }
    await exit.destroy();
    res.json({ success: true, message: 'Saída removida com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

// ── Payment Methods ──
async function listPaymentMethods(req, res, next) {
  try {
    const methods = await PaymentMethod.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, message: 'Métodos de pagamento listados com sucesso.', data: methods });
  } catch (err) {
    next(err);
  }
}

async function createPaymentMethod(req, res, next) {
  try {
    const method = await PaymentMethod.create(req.body);
    res.status(201).json({ success: true, message: 'Método de pagamento criado com sucesso.', data: method });
  } catch (err) {
    next(err);
  }
}

async function updatePaymentMethod(req, res, next) {
  try {
    const method = await PaymentMethod.findByPk(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Método de pagamento não encontrado.', error: { code: 'PAYMENT_METHOD_NOT_FOUND', details: null } });
    }
    await method.update(req.body);
    res.json({ success: true, message: 'Método de pagamento atualizado com sucesso.', data: method });
  } catch (err) {
    next(err);
  }
}

async function deletePaymentMethod(req, res, next) {
  try {
    const method = await PaymentMethod.findByPk(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Método de pagamento não encontrado.', error: { code: 'PAYMENT_METHOD_NOT_FOUND', details: null } });
    }
    await method.destroy();
    res.json({ success: true, message: 'Método de pagamento removido com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  summary,
  listEntries, getEntryById, createEntry, updateEntry, deleteEntry,
  listExits, getExitById, createExit, updateExit, deleteExit,
  listPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod,
};
