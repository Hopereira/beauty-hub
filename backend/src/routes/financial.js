const { Router } = require('express');
const finController = require('../controllers/financialController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { financialEntrySchema, financialExitSchema, paymentMethodSchema, paginationSchema } = require('../utils/validators');

const router = Router();

router.use(authenticate);
router.use(authorize('MASTER', 'ADMIN'));

// Summary
router.get('/summary', finController.summary);

// Entries
router.get('/entries', validate(paginationSchema, 'query'), finController.listEntries);
router.get('/entries/:id', finController.getEntryById);
router.post('/entries', validate(financialEntrySchema), finController.createEntry);
router.put('/entries/:id', finController.updateEntry);
router.delete('/entries/:id', finController.deleteEntry);

// Exits
router.get('/exits', validate(paginationSchema, 'query'), finController.listExits);
router.get('/exits/:id', finController.getExitById);
router.post('/exits', validate(financialExitSchema), finController.createExit);
router.put('/exits/:id', finController.updateExit);
router.delete('/exits/:id', finController.deleteExit);

// Payment Methods
router.get('/payment-methods', finController.listPaymentMethods);
router.post('/payment-methods', validate(paymentMethodSchema), finController.createPaymentMethod);
router.put('/payment-methods/:id', finController.updatePaymentMethod);
router.delete('/payment-methods/:id', finController.deletePaymentMethod);

module.exports = router;
