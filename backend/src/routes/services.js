const { Router } = require('express');
const serviceController = require('../controllers/serviceController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { serviceSchema, paginationSchema } = require('../utils/validators');

const router = Router();

router.use(authenticate);

router.get('/', validate(paginationSchema, 'query'), serviceController.list);
router.get('/:id', serviceController.getById);
router.post('/', authorize('MASTER', 'ADMIN'), validate(serviceSchema), serviceController.create);
router.put('/:id', authorize('MASTER', 'ADMIN'), serviceController.update);
router.delete('/:id', authorize('MASTER', 'ADMIN'), serviceController.remove);

module.exports = router;
