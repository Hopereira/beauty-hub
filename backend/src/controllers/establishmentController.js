const { Establishment, Professional, Service, User } = require('../models');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    // ADMIN can only see their own establishment
    if (req.user.role === 'ADMIN') {
      where.user_id = req.user.id;
    }

    const { count, rows } = await Establishment.findAndCountAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [[sort, order]],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Estabelecimentos listados com sucesso.',
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const est = await Establishment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Professional, as: 'professionals' },
        { model: Service, as: 'services' },
      ],
    });
    if (!est) {
      return res.status(404).json({ success: false, message: 'Estabelecimento não encontrado.', error: { code: 'ESTABLISHMENT_NOT_FOUND', details: null } });
    }
    res.json({ success: true, message: 'Estabelecimento obtido com sucesso.', data: est });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = { ...req.body, user_id: req.user.id };
    const est = await Establishment.create(data);
    res.status(201).json({ success: true, message: 'Estabelecimento criado com sucesso.', data: est });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const est = await Establishment.findByPk(req.params.id);
    if (!est) {
      return res.status(404).json({ success: false, message: 'Estabelecimento não encontrado.', error: { code: 'ESTABLISHMENT_NOT_FOUND', details: null } });
    }
    await est.update(req.body);
    res.json({ success: true, message: 'Estabelecimento atualizado com sucesso.', data: est });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const est = await Establishment.findByPk(req.params.id);
    if (!est) {
      return res.status(404).json({ success: false, message: 'Estabelecimento não encontrado.', error: { code: 'ESTABLISHMENT_NOT_FOUND', details: null } });
    }
    await est.destroy();
    res.json({ success: true, message: 'Estabelecimento removido com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

async function getProfessionals(req, res, next) {
  try {
    const professionals = await Professional.findAll({
      where: { establishment_id: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] }],
    });
    res.json({ success: true, message: 'Profissionais listados com sucesso.', data: professionals });
  } catch (err) {
    next(err);
  }
}

async function getServices(req, res, next) {
  try {
    const services = await Service.findAll({
      where: { establishment_id: req.params.id },
    });
    res.json({ success: true, message: 'Serviços listados com sucesso.', data: services });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, getProfessionals, getServices };
