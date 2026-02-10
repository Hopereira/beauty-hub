const { Professional, User, Establishment, Appointment } = require('../models');

// Helper to get establishment_id for the current user
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
    const { page = 1, limit = 10, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.role !== 'MASTER') {
      const estId = await getEstablishmentId(req.user);
      if (estId) where.establishment_id = estId;
    }

    const { count, rows } = await Professional.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'profile_picture_url'] },
        { model: Establishment, as: 'establishment', attributes: ['id', 'name'] },
      ],
      order: [[sort, order]],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Profissionais listados com sucesso.',
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const prof = await Professional.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Establishment, as: 'establishment', attributes: ['id', 'name'] },
      ],
    });
    if (!prof) {
      return res.status(404).json({ success: false, message: 'Profissional não encontrado.', error: { code: 'PROFESSIONAL_NOT_FOUND', details: null } });
    }
    res.json({ success: true, message: 'Profissional obtido com sucesso.', data: prof });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const prof = await Professional.create(req.body);
    res.status(201).json({ success: true, message: 'Profissional criado com sucesso.', data: prof });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const prof = await Professional.findByPk(req.params.id);
    if (!prof) {
      return res.status(404).json({ success: false, message: 'Profissional não encontrado.', error: { code: 'PROFESSIONAL_NOT_FOUND', details: null } });
    }
    await prof.update(req.body);
    res.json({ success: true, message: 'Profissional atualizado com sucesso.', data: prof });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const prof = await Professional.findByPk(req.params.id);
    if (!prof) {
      return res.status(404).json({ success: false, message: 'Profissional não encontrado.', error: { code: 'PROFESSIONAL_NOT_FOUND', details: null } });
    }
    await prof.destroy();
    res.json({ success: true, message: 'Profissional removido com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

async function getAppointments(req, res, next) {
  try {
    const appointments = await Appointment.findAll({
      where: { professional_id: req.params.id },
      order: [['start_time', 'DESC']],
    });
    res.json({ success: true, message: 'Agendamentos do profissional listados com sucesso.', data: appointments });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, getAppointments, getEstablishmentId };
