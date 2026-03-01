/**
 * Public Registration Controller
 * Handles public tenant registration
 */

const { HTTP_STATUS } = require('../../../shared/constants');

class RegistrationController {
  constructor(registrationService) {
    this.registrationService = registrationService;
  }

  /**
   * POST /api/public/register
   * Register new tenant with owner account
   */
  async register(req, res, next) {
    try {
      const result = await this.registrationService.registerTenant(req.body);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
        message: 'Conta criada com sucesso! Você já pode fazer login.',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RegistrationController;
