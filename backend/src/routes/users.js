const { Router } = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { updateProfileSchema, paginationSchema } = require('../utils/validators');

const router = Router();

router.use(authenticate);
router.use(authorize('MASTER', 'ADMIN'));

router.get('/', validate(paginationSchema, 'query'), userController.list);
router.get('/:id', userController.getById);
router.put('/:id', validate(updateProfileSchema), userController.update);
router.delete('/:id', userController.remove);
router.put('/:id/password', userController.changePassword);
router.put('/:id/role', authorize('MASTER'), userController.changeRole);

module.exports = router;
