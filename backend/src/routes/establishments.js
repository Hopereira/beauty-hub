const { Router } = require('express');
const estController = require('../controllers/establishmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { establishmentSchema, paginationSchema } = require('../utils/validators');

const router = Router();

router.use(authenticate);
router.use(authorize('MASTER', 'ADMIN'));

router.get('/', validate(paginationSchema, 'query'), estController.list);
router.get('/:id', estController.getById);
router.post('/', validate(establishmentSchema), estController.create);
router.put('/:id', validate(establishmentSchema), estController.update);
router.delete('/:id', estController.remove);
router.get('/:id/professionals', estController.getProfessionals);
router.get('/:id/services', estController.getServices);

// Payment Settings routes (OWNER only)
router.get('/payment-settings', authorize('OWNER', 'ADMIN'), estController.getPaymentSettings);
router.put('/payment-settings', authorize('OWNER', 'ADMIN'), estController.updatePaymentSettings);

module.exports = router;
