const { Router } = require('express');
const aptController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { appointmentSchema, paginationSchema } = require('../utils/validators');

const router = Router();

router.use(authenticate);
router.use(authorize('MASTER', 'ADMIN', 'PROFESSIONAL'));

router.get('/', validate(paginationSchema, 'query'), aptController.list);
router.get('/calendar', aptController.calendar);
router.get('/:id', aptController.getById);
router.post('/', validate(appointmentSchema), aptController.create);
router.put('/:id', aptController.update);
router.delete('/:id', aptController.remove);

module.exports = router;
