const { Router } = require('express');
const serviceCategoryController = require('../controllers/serviceCategoryController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

// All routes require authentication and OWNER/ADMIN role
router.use(authenticate);
router.use(authorize('OWNER', 'ADMIN'));

router.get('/', serviceCategoryController.list);
router.get('/:id', serviceCategoryController.getById);
router.post('/', serviceCategoryController.create);
router.put('/:id', serviceCategoryController.update);
router.delete('/:id', serviceCategoryController.remove);

module.exports = router;
