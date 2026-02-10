const { Client, Establishment, Professional, Appointment } = require('../models');
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

async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, sort = 'created_at', order = 'DESC', search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.role !== 'MASTER') {
      const estId = await getEstablishmentId(req.user);
      if (estId) where.establishment_id = estId;
    }

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Client.findAndCountAll({
      where,
      order: [[sort, order]],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Clientes listados com sucesso.',
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado.', error: { code: 'CLIENT_NOT_FOUND', details: null } });
    }
    res.json({ success: true, message: 'Cliente obtido com sucesso.', data: client });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const estId = await getEstablishmentId(req.user);
    if (!estId) {
      return res.status(400).json({ success: false, message: 'Estabelecimento não encontrado para este usuário.', error: { code: 'NO_ESTABLISHMENT', details: null } });
    }
    const client = await Client.create({ ...req.body, establishment_id: estId });
    res.status(201).json({ success: true, message: 'Cliente criado com sucesso.', data: client });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado.', error: { code: 'CLIENT_NOT_FOUND', details: null } });
    }
    await client.update(req.body);
    res.json({ success: true, message: 'Cliente atualizado com sucesso.', data: client });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado.', error: { code: 'CLIENT_NOT_FOUND', details: null } });
    }
    await client.destroy();
    res.json({ success: true, message: 'Cliente removido com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

async function getAppointments(req, res, next) {
  try {
    const appointments = await Appointment.findAll({
      where: { client_id: req.params.id },
      order: [['start_time', 'DESC']],
    });
    res.json({ success: true, message: 'Agendamentos do cliente listados com sucesso.', data: appointments });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, getAppointments };
