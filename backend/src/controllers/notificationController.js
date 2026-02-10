const { Notification } = require('../models');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      message: 'Notificações listadas com sucesso.',
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificação não encontrada.', error: { code: 'NOTIFICATION_NOT_FOUND', details: null } });
    }
    await notification.update({ is_read: true });
    res.json({ success: true, message: 'Notificação marcada como lida.', data: notification });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificação não encontrada.', error: { code: 'NOTIFICATION_NOT_FOUND', details: null } });
    }
    await notification.destroy();
    res.json({ success: true, message: 'Notificação removida com sucesso.', data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markAsRead, remove };
