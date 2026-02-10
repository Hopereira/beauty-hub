const { Appointment, Client, Professional, Service, Establishment, User } = require('../models');
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
    const { page = 1, limit = 10, sort = 'start_time', order = 'DESC', status, date, professional_id, client_id } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.role !== 'MASTER') {
      const estId = await getEstablishmentId(req.user);
      if (estId) where.establishment_id = estId;
    }
    if (req.user.role === 'PROFESSIONAL') {
      const prof = await Professional.findOne({ where: { user_id: req.user.id } });
      if (prof) where.professional_id = prof.id;
    }
    if (status) where.status = status;
    if (professional_id) where.professional_id = professional_id;
    if (client_id) where.client_id = client_id;
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.start_time = { [Op.between]: [dayStart, dayEnd] };
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'first_name', 'last_name', 'phone'] },
        {
          model: Professional, as: 'professional', attributes: ['id', 'specialty'],
          include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
        },
        { model: Service, as: 'service', attributes: ['id', 'name', 'price', 'duration_minutes'] },
      ],
      order: [[sort, order]],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Agendamentos listados com sucesso.',
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const apt = await Appointment.findByPk(req.params.id, {
      include: [
        { model: Client, as: 'client', attributes: ['id', 'first_name', 'last_name', 'phone', 'email'] },
        {
          model: Professional, as: 'professional', attributes: ['id', 'specialty'],
          include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
        },
        { model: Service, as: 'service', attributes: ['id', 'name', 'price', 'duration_minutes'] },
      ],
    });
    if (!apt) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado.', error: { code: 'APPOINTMENT_NOT_FOUND', details: null } });
    }
    res.json({ success: true, message: 'Agendamento obtido com sucesso.', data: apt });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const estId = await getEstablishmentId(req.user);
    if (!estId) {
      return res.status(400).json({ success: false, message: 'Estabelecimento não encontrado.', error: { code: 'NO_ESTABLISHMENT', details: null } });
    }

    // Check for overlapping appointments for the same professional
    const { professional_id, start_time, end_time } = req.body;
    const overlap = await Appointment.findOne({
      where: {
        professional_id,
        status: { [Op.notIn]: ['CANCELLED'] },
        [Op.or]: [
          { start_time: { [Op.between]: [start_time, end_time] } },
          { end_time: { [Op.between]: [start_time, end_time] } },
          {
            [Op.and]: [
              { start_time: { [Op.lte]: start_time } },
              { end_time: { [Op.gte]: end_time } },
            ],
          },
        ],
      },
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        message: 'Conflito de horário: o profissional já possui um agendamento neste período.',
        error: { code: 'APPOINTMENT_OVERLAP', details: { conflicting_id: overlap.id } },
      });
    }

    const apt = await Appointment.create({ ...req.body, establishment_id: estId });

    // Reload with associations
    const full = await Appointment.findByPk(apt.id, {
      include: [
        { model: Client, as: 'client', attributes: ['id', 'first_name', 'last_name', 'phone'] },
        {
          model: Professional, as: 'professional', attributes: ['id', 'specialty'],
          include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
        },
        { model: Service, as: 'service', attributes: ['id', 'name', 'price', 'duration_minutes'] },
      ],
    });

    res.status(201).json({ success: true, message: 'Agendamento criado com sucesso.', data: full });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const apt = await Appointment.findByPk(req.params.id);
    if (!apt) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado.', error: { code: 'APPOINTMENT_NOT_FOUND', details: null } });
    }
    await apt.update(req.body);
    res.json({ success: true, message: 'Agendamento atualizado com sucesso.', data: apt });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const apt = await Appointment.findByPk(req.params.id);
    if (!apt) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado.', error: { code: 'APPOINTMENT_NOT_FOUND', details: null } });
    }
    await apt.destroy();
    res.json({ success: true, message: 'Agendamento removido com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

async function calendar(req, res, next) {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Parâmetros start_date e end_date são obrigatórios.', error: { code: 'MISSING_DATE_RANGE', details: null } });
    }

    const where = {
      start_time: { [Op.between]: [new Date(start_date), new Date(end_date)] },
    };

    if (req.user.role !== 'MASTER') {
      const estId = await getEstablishmentId(req.user);
      if (estId) where.establishment_id = estId;
    }
    if (req.user.role === 'PROFESSIONAL') {
      const prof = await Professional.findOne({ where: { user_id: req.user.id } });
      if (prof) where.professional_id = prof.id;
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
        {
          model: Professional, as: 'professional', attributes: ['id', 'specialty'],
          include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
        },
        { model: Service, as: 'service', attributes: ['id', 'name', 'price', 'duration_minutes'] },
      ],
      order: [['start_time', 'ASC']],
    });

    res.json({ success: true, message: 'Calendário obtido com sucesso.', data: appointments });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, calendar };
