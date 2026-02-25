/**
 * Onboarding Routes
 * Public endpoints for self-signup
 */

const express = require('express');
const router = express.Router();

/**
 * Create onboarding routes
 * @param {OnboardingService} onboardingService
 * @param {object} options - Additional options
 */
function createOnboardingRoutes(onboardingService, options = {}) {
  const { bruteForceProtection } = options;

  /**
   * POST /api/signup
   * Self-signup for new tenants
   */
  router.post('/signup', async (req, res, next) => {
    try {
      const result = await onboardingService.signup({
        tenantName: req.body.tenantName || req.body.companyName,
        tenantType: req.body.tenantType || 'establishment',
        document: req.body.document,
        documentType: req.body.documentType,
        phone: req.body.phone,
        address: req.body.address,
        ownerName: req.body.ownerName || req.body.name,
        ownerEmail: req.body.ownerEmail || req.body.email,
        ownerPassword: req.body.ownerPassword || req.body.password,
        planSlug: req.body.planSlug,
        referralCode: req.body.referralCode,
        utmSource: req.query.utm_source || req.body.utmSource,
        utmMedium: req.query.utm_medium || req.body.utmMedium,
        utmCampaign: req.query.utm_campaign || req.body.utmCampaign,
      });

      res.status(201).json({
        success: true,
        message: 'Conta criada com sucesso! Você pode fazer login agora.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/signup/autonomous
   * Simplified signup for autonomous professionals
   */
  router.post('/signup/autonomous', async (req, res, next) => {
    try {
      const result = await onboardingService.signupAutonomous({
        ownerName: req.body.name,
        ownerEmail: req.body.email,
        ownerPassword: req.body.password,
        document: req.body.cpf || req.body.document,
        documentType: 'cpf',
        phone: req.body.phone,
        planSlug: req.body.planSlug,
        referralCode: req.body.referralCode,
        utmSource: req.query.utm_source,
        utmMedium: req.query.utm_medium,
        utmCampaign: req.query.utm_campaign,
      });

      res.status(201).json({
        success: true,
        message: 'Conta criada com sucesso!',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/signup/check-email
   * Check if email is available
   */
  router.get('/signup/check-email', async (req, res, next) => {
    try {
      const email = req.query.email?.toLowerCase();
      if (!email) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email is required' },
        });
      }

      const [exists] = await onboardingService.sequelize.query(
        'SELECT 1 FROM users WHERE email = $1 LIMIT 1',
        { bind: [email], type: onboardingService.sequelize.QueryTypes.SELECT }
      );

      res.json({
        success: true,
        data: { available: !exists },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/signup/check-document
   * Check if document (CPF/CNPJ) is available
   */
  router.get('/signup/check-document', async (req, res, next) => {
    try {
      const document = req.query.document?.replace(/\D/g, '');
      if (!document) {
        return res.status(400).json({
          success: false,
          error: { message: 'Document is required' },
        });
      }

      const [exists] = await onboardingService.sequelize.query(
        'SELECT 1 FROM tenants WHERE document = $1 LIMIT 1',
        { bind: [document], type: onboardingService.sequelize.QueryTypes.SELECT }
      );

      res.json({
        success: true,
        data: { available: !exists },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/signup/check-slug
   * Check if slug is available
   */
  router.get('/signup/check-slug', async (req, res, next) => {
    try {
      const slug = req.query.slug?.toLowerCase().trim();
      if (!slug) {
        return res.status(400).json({
          success: false,
          error: { message: 'Slug is required' },
        });
      }

      const [exists] = await onboardingService.sequelize.query(
        'SELECT 1 FROM tenants WHERE slug = $1 LIMIT 1',
        { bind: [slug], type: onboardingService.sequelize.QueryTypes.SELECT }
      );

      res.json({
        success: true,
        data: { available: !exists },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createOnboardingRoutes };
