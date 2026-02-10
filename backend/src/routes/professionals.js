const { Router } = require('express');
const profController = require('../controllers/professionalController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { professionalSchema, paginationSchema } = require('../utils/validators');

const router = Router();

router.use(authenticate);
router.use(authorize('MASTER', 'ADMIN', 'PROFESSIONAL'));

router.get('/', validate(paginationSchema, 'query'), profController.list);
router.get('/:id', profController.getById);
router.post('/', authorize('MASTER', 'ADMIN'), validate(professionalSchema), profController.create);
router.put('/:id', authorize('MASTER', 'ADMIN'), profController.update);
router.delete('/:id', authorize('MASTER', 'ADMIN'), profController.remove);
router.get('/:id/appointments', profController.getAppointments);

module.exports = router;
