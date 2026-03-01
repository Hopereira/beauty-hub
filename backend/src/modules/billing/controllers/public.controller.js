/**
 * Public Billing Controller
 * Handles public endpoints for plans and registration
 */

const { HTTP_STATUS } = require('../../../shared/constants');

class PublicBillingController {
  constructor(planService) {
    this.planService = planService;
  }

  /**
   * GET /api/public/plans
   * Get all active public plans
   */
  async getPublicPlans(req, res, next) {
    try {
      const plans = await this.planService.getPublicPlans();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/public/plans/:slug
   * Get plan by slug
   */
  async getPlanBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const plan = await this.planService.getPlanBySlug(slug);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PublicBillingController;
