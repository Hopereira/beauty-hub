/**
 * User Controller
 * HTTP layer for user operations
 */

const { HTTP_STATUS } = require('../../shared/constants');

class UserController {
  constructor(userService) {
    this.userService = userService;

    this.list = this.list.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.changeRole = this.changeRole.bind(this);
    this.activate = this.activate.bind(this);
    this.deactivate = this.deactivate.bind(this);
    this.delete = this.delete.bind(this);
    this.getStatistics = this.getStatistics.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
  }

  /**
   * GET /api/users
   */
  async list(req, res) {
    const { page, limit, role, is_active, search } = req.query;

    const where = {};
    if (role) where.role = role;
    if (typeof is_active === 'boolean') where.is_active = is_active;
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const result = await this.userService.getUsers(req.tenantId, {
      where,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Usuários listados com sucesso.',
      data: result.rows.map(u => u.toPublicJSON()),
      pagination: result.pagination,
    });
  }

  /**
   * GET /api/users/:id
   */
  async getById(req, res) {
    const user = await this.userService.getUserById(req.tenantId, req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Usuário encontrado.',
      data: user.toPublicJSON(),
    });
  }

  /**
   * POST /api/users
   */
  async create(req, res) {
    const user = await this.userService.createUser(
      req.tenantId,
      req.body,
      req.user.role
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Usuário criado com sucesso.',
      data: user.toPublicJSON(),
    });
  }

  /**
   * PUT /api/users/:id
   */
  async update(req, res) {
    const user = await this.userService.updateUser(
      req.tenantId,
      req.params.id,
      req.body,
      req.user.role
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Usuário atualizado com sucesso.',
      data: user.toPublicJSON(),
    });
  }

  /**
   * PUT /api/users/:id/password
   */
  async changePassword(req, res) {
    await this.userService.changePassword(
      req.tenantId,
      req.params.id,
      req.body.current_password,
      req.body.new_password
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Senha alterada com sucesso.',
      data: null,
    });
  }

  /**
   * PUT /api/users/:id/reset-password (Admin)
   */
  async resetPassword(req, res) {
    await this.userService.resetPassword(
      req.tenantId,
      req.params.id,
      req.body.new_password
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Senha resetada com sucesso.',
      data: null,
    });
  }

  /**
   * PUT /api/users/:id/role
   */
  async changeRole(req, res) {
    const user = await this.userService.changeRole(
      req.tenantId,
      req.params.id,
      req.body.role,
      req.user.role
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Role alterada com sucesso.',
      data: user.toPublicJSON(),
    });
  }

  /**
   * POST /api/users/:id/activate
   */
  async activate(req, res) {
    const user = await this.userService.setActiveStatus(
      req.tenantId,
      req.params.id,
      true
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Usuário ativado com sucesso.',
      data: user.toPublicJSON(),
    });
  }

  /**
   * POST /api/users/:id/deactivate
   */
  async deactivate(req, res) {
    const user = await this.userService.setActiveStatus(
      req.tenantId,
      req.params.id,
      false
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Usuário desativado com sucesso.',
      data: user.toPublicJSON(),
    });
  }

  /**
   * DELETE /api/users/:id
   */
  async delete(req, res) {
    await this.userService.deleteUser(
      req.tenantId,
      req.params.id,
      req.user.role
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Usuário excluído com sucesso.',
      data: null,
    });
  }

  /**
   * GET /api/users/statistics
   */
  async getStatistics(req, res) {
    const stats = await this.userService.getStatistics(req.tenantId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Estatísticas de usuários.',
      data: stats,
    });
  }

  /**
   * GET /api/profile
   */
  async getProfile(req, res) {
    const user = await this.userService.getUserById(req.tenantId, req.user.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Perfil do usuário.',
      data: user.toPublicJSON(),
    });
  }

  /**
   * PUT /api/profile
   */
  async updateProfile(req, res) {
    // Users can only update certain fields on their own profile
    const allowedFields = ['first_name', 'last_name', 'phone', 'avatar', 'settings'];
    const filteredData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        filteredData[field] = req.body[field];
      }
    }

    const user = await this.userService.updateUser(
      req.tenantId,
      req.user.id,
      filteredData
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Perfil atualizado com sucesso.',
      data: user.toPublicJSON(),
    });
  }
}

module.exports = UserController;
