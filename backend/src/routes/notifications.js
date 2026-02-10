const { Router } = require('express');
const notifController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/', notifController.list);
router.put('/:id/read', notifController.markAsRead);
router.delete('/:id', notifController.remove);

module.exports = router;
