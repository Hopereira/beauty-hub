const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { Op } = require('sequelize');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      order: [[sort, order]],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Usuários listados com sucesso.',
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.', error: { code: 'USER_NOT_FOUND', details: null } });
    }
    res.json({ success: true, message: 'Usuário obtido com sucesso.', data: user });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.', error: { code: 'USER_NOT_FOUND', details: null } });
    }
    const { first_name, last_name, phone, email } = req.body;
    await user.update({ first_name, last_name, phone, email });
    res.json({ success: true, message: 'Usuário atualizado com sucesso.', data: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.', error: { code: 'USER_NOT_FOUND', details: null } });
    }
    await user.destroy(); // soft delete
    res.json({ success: true, message: 'Usuário removido com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.', error: { code: 'USER_NOT_FOUND', details: null } });
    }
    const { new_password } = req.body;
    user.password = await bcrypt.hash(new_password, 10);
    await user.save();
    res.json({ success: true, message: 'Senha alterada com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

async function changeRole(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.', error: { code: 'USER_NOT_FOUND', details: null } });
    }
    const { role } = req.body;
    await user.update({ role });
    res.json({ success: true, message: 'Role alterada com sucesso.', data: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, update, remove, changePassword, changeRole };
