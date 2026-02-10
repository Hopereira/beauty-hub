const { Router } = require('express');
const clientController = require('../controllers/clientController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { clientSchema, paginationSchema } = require('../utils/validators');

const router = Router();

router.use(authenticate);
router.use(authorize('MASTER', 'ADMIN', 'PROFESSIONAL'));

router.get('/', validate(paginationSchema, 'query'), clientController.list);
router.get('/:id', clientController.getById);
router.post('/', validate(clientSchema), clientController.create);
router.put('/:id', validate(clientSchema), clientController.update);
router.delete('/:id', clientController.remove);
router.get('/:id/appointments', clientController.getAppointments);

module.exports = router;
