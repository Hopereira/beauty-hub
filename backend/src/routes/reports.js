const { Router } = require('express');
const reportsController = require('../controllers/reportsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

// All routes require authentication and OWNER/ADMIN role
router.use(authenticate);
router.use(authorize('OWNER', 'ADMIN'));

router.get('/revenue-by-period', reportsController.getRevenueByPeriod);
router.get('/commission-by-professional', reportsController.getCommissionByProfessional);
router.get('/top-services', reportsController.getTopServices);
router.get('/top-products', reportsController.getTopProducts);
router.get('/financial-summary', reportsController.getFinancialSummary);

module.exports = router;
