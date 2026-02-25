/**
 * Tenant Controller
 * HTTP layer - handles requests and responses
 * No business logic here
 */

const { HTTP_STATUS } = require('../../shared/constants');

class TenantController {
  constructor(tenantService) {
    this.tenantService = tenantService;
    
    // Bind methods to preserve 'this' context
    this.list = this.list.bind(this);
    this.getById = this.getById.bind(this);
    this.getBySlug = this.getBySlug.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
    this.updateBranding = this.updateBranding.bind(this);
    this.activate = this.activate.bind(this);
    this.suspend = this.suspend.bind(this);
    this.delete = this.delete.bind(this);
    this.getStatistics = this.getStatistics.bind(this);
    this.getCurrent = this.getCurrent.bind(this);
  }

  /**
   * GET /api/master/tenants
   * List all tenants (MASTER only)
   */
  async list(req, res) {
    const { page, limit, status, type, search } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { slug: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const result = await this.tenantService.getAllTenants({
      where,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tenants listados com sucesso.',
      data: result.rows,
      pagination: result.pagination,
    });
  }

  /**
   * GET /api/master/tenants/:id
   * Get tenant by ID (MASTER only)
   */
  async getById(req, res) {
    const { id } = req.params;
    const tenant = await this.tenantService.getTenantById(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tenant encontrado.',
      data: tenant,
    });
  }

  /**
   * GET /api/master/tenants/slug/:slug
   * Get tenant by slug (MASTER only)
   */
  async getBySlug(req, res) {
    const { slug } = req.params;
    const tenant = await this.tenantService.getTenantBySlug(slug);

    if (!tenant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Tenant não encontrado.',
        data: null,
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tenant encontrado.',
      data: tenant,
    });
  }

  /**
   * POST /api/master/tenants
   * Create new tenant (MASTER only)
   */
  async create(req, res) {
    const tenant = await this.tenantService.createTenant(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Tenant criado com sucesso.',
      data: tenant,
    });
  }

  /**
   * PUT /api/master/tenants/:id
   * Update tenant (MASTER only)
   */
  async update(req, res) {
    const { id } = req.params;
    const tenant = await this.tenantService.updateTenant(id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tenant atualizado com sucesso.',
      data: tenant,
    });
  }

  /**
   * PUT /api/tenant/settings
   * Update current tenant settings (OWNER only)
   */
  async updateSettings(req, res) {
    const tenantId = req.tenantId;
    const tenant = await this.tenantService.updateSettings(tenantId, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Configurações atualizadas com sucesso.',
      data: tenant.settings,
    });
  }

  /**
   * PUT /api/tenant/branding
   * Update current tenant branding (OWNER only)
   */
  async updateBranding(req, res) {
    const tenantId = req.tenantId;
    const tenant = await this.tenantService.updateBranding(tenantId, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Branding atualizado com sucesso.',
      data: tenant.branding,
    });
  }

  /**
   * POST /api/master/tenants/:id/activate
   * Activate tenant (MASTER only)
   */
  async activate(req, res) {
    const { id } = req.params;
    const tenant = await this.tenantService.activateTenant(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tenant ativado com sucesso.',
      data: tenant,
    });
  }

  /**
   * POST /api/master/tenants/:id/suspend
   * Suspend tenant (MASTER only)
   */
  async suspend(req, res) {
    const { id } = req.params;
    const { reason } = req.body;
    const tenant = await this.tenantService.suspendTenant(id, reason);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tenant suspenso.',
      data: tenant,
    });
  }

  /**
   * DELETE /api/master/tenants/:id
   * Delete tenant (MASTER only)
   */
  async delete(req, res) {
    const { id } = req.params;
    await this.tenantService.deleteTenant(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tenant excluído com sucesso.',
      data: null,
    });
  }

  /**
   * GET /api/master/tenants/statistics
   * Get tenant statistics (MASTER only)
   */
  async getStatistics(req, res) {
    const stats = await this.tenantService.getStatistics();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Estatísticas de tenants.',
      data: stats,
    });
  }

  /**
   * GET /api/tenant
   * Get current tenant info (authenticated users)
   */
  async getCurrent(req, res) {
    const tenantId = req.tenantId;
    const tenant = await this.tenantService.getTenantById(tenantId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tenant atual.',
      data: tenant.toPublicJSON(),
    });
  }
}

module.exports = TenantController;
