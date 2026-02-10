const { Service, Establishment } = require('../models');

async function getEstablishmentId(user) {
  if (user.role === 'ADMIN') {
    const est = await Establishment.findOne({ where: { user_id: user.id } });
    return est ? est.id : null;
  }
  return null;
}

async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, sort = 'name', order = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.role !== 'MASTER') {
      const estId = await getEstablishmentId(req.user);
      if (estId) where.establishment_id = estId;
    }

    const { count, rows } = await Service.findAndCountAll({
      where,
      order: [[sort, order]],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Serviços listados com sucesso.',
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Serviço não encontrado.', error: { code: 'SERVICE_NOT_FOUND', details: null } });
    }
    res.json({ success: true, message: 'Serviço obtido com sucesso.', data: service });
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
    const service = await Service.create({ ...req.body, establishment_id: estId });
    res.status(201).json({ success: true, message: 'Serviço criado com sucesso.', data: service });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Serviço não encontrado.', error: { code: 'SERVICE_NOT_FOUND', details: null } });
    }
    await service.update(req.body);
    res.json({ success: true, message: 'Serviço atualizado com sucesso.', data: service });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Serviço não encontrado.', error: { code: 'SERVICE_NOT_FOUND', details: null } });
    }
    await service.destroy();
    res.json({ success: true, message: 'Serviço removido com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
