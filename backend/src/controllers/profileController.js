const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function getProfile(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.', error: { code: 'USER_NOT_FOUND', details: null } });
    }
    res.json({ success: true, message: 'Perfil obtido com sucesso.', data: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.', error: { code: 'USER_NOT_FOUND', details: null } });
    }

    const allowed = ['first_name', 'last_name', 'phone', 'email'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await user.update(updates);
    res.json({ success: true, message: 'Perfil atualizado com sucesso.', data: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.', error: { code: 'USER_NOT_FOUND', details: null } });
    }

    const { current_password, new_password } = req.body;
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Senha atual incorreta.', error: { code: 'PROFILE_WRONG_PASSWORD', details: null } });
    }

    user.password = await bcrypt.hash(new_password, 10);
    await user.save();
    res.json({ success: true, message: 'Senha alterada com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, changePassword };
