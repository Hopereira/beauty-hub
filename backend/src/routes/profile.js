const { Router } = require('express');
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { updateProfileSchema, changePasswordSchema } = require('../utils/validators');

const router = Router();

router.use(authenticate);

router.get('/', profileController.getProfile);
router.put('/', validate(updateProfileSchema), profileController.updateProfile);
router.put('/password', validate(changePasswordSchema), profileController.changePassword);

module.exports = router;
