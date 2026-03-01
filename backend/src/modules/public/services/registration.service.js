/**
 * Registration Service
 * Handles tenant registration logic
 */

const bcrypt = require('bcryptjs');
const { ValidationError } = require('../../../shared/errors');

class RegistrationService {
  constructor(sequelize, models) {
    this.sequelize = sequelize;
    this.Tenant = models.Tenant;
    this.User = models.User;
    this.Subscription = models.Subscription;
    this.SubscriptionPlan = models.SubscriptionPlan;
  }

  /**
   * Register new tenant with owner account
   */
  async registerTenant(data) {
    const transaction = await this.sequelize.transaction();

    try {
      // Validate required fields
      this._validateRegistrationData(data);

      // Generate tenant slug from business name
      const slug = this._generateSlug(data.business.name);

      // Check if slug already exists
      const existingTenant = await this.Tenant.findOne({
        where: { slug },
        transaction,
      });

      if (existingTenant) {
        throw new ValidationError('Este nome de negócio já está em uso. Por favor, escolha outro.');
      }

      // Check if email already exists
      const existingUser = await this.User.findOne({
        where: { email: data.owner.email },
        transaction,
      });

      if (existingUser) {
        throw new ValidationError('Este email já está cadastrado.');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.owner.password, 10);

      // Create tenant
      const tenant = await this.Tenant.create({
        name: data.business.name,
        slug,
        email: data.business.email,
        phone: data.business.phone,
        document: data.business.cnpj || data.owner.cpf,
        address: {
          street: data.address.street,
          number: data.address.number,
          complement: data.address.complement,
          neighborhood: data.address.neighborhood,
          city: data.address.city,
          state: data.address.state,
          zip_code: data.address.cep,
        },
        settings: {
          business_type: data.accountType,
          timezone: 'America/Sao_Paulo',
          currency: 'BRL',
          language: 'pt-BR',
        },
        is_active: true,
      }, { transaction });

      // Create owner user
      const owner = await this.User.create({
        tenant_id: tenant.id,
        name: data.owner.name,
        email: data.owner.email,
        password: hashedPassword,
        phone: data.owner.phone,
        document: data.owner.cpf,
        role: 'OWNER',
        is_active: true,
        email_verified: false,
      }, { transaction });

      // Create subscription if plan selected
      if (data.planId) {
        const plan = await this.SubscriptionPlan.findByPk(data.planId, { transaction });
        
        if (plan) {
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + (plan.trial_days || 0));

          await this.Subscription.create({
            tenant_id: tenant.id,
            plan_id: plan.id,
            status: 'trial',
            current_period_start: new Date(),
            current_period_end: trialEndDate,
            trial_end: trialEndDate,
            metadata: {
              registered_via: 'landing_page',
              owner_id: owner.id,
            },
          }, { transaction });
        }
      }

      await transaction.commit();

      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        ownerId: owner.id,
        ownerEmail: owner.email,
        message: 'Tenant criado com sucesso',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  _validateRegistrationData(data) {
    if (!data.owner?.name || !data.owner?.email || !data.owner?.password) {
      throw new ValidationError('Dados do responsável são obrigatórios');
    }

    if (!data.business?.name) {
      throw new ValidationError('Nome do negócio é obrigatório');
    }

    if (!data.address?.street || !data.address?.city || !data.address?.state) {
      throw new ValidationError('Endereço completo é obrigatório');
    }

    if (data.owner.password.length < 6) {
      throw new ValidationError('A senha deve ter no mínimo 6 caracteres');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.owner.email)) {
      throw new ValidationError('Email inválido');
    }
  }

  _generateSlug(name) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }
}

module.exports = RegistrationService;
