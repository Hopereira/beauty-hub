/**
 * Onboarding Service
 * Handles self-signup, trial creation, and tenant provisioning
 */

const { v4: uuidv4 } = require('uuid');
const { ConflictError, ValidationError } = require('../../shared/errors');
const { TENANT_STATUS, SUBSCRIPTION_STATUS, ROLES } = require('../../shared/constants');

class OnboardingService {
  constructor({ sequelize, tenantService, userService, subscriptionService, planService }) {
    this.sequelize = sequelize;
    this.tenantService = tenantService;
    this.userService = userService;
    this.subscriptionService = subscriptionService;
    this.planService = planService;
    
    // Configuration
    this.DEFAULT_TRIAL_DAYS = parseInt(process.env.BILLING_DEFAULT_TRIAL_DAYS) || 14;
    this.DEFAULT_PLAN_SLUG = process.env.BILLING_DEFAULT_PLAN || 'starter';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELF-SIGNUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Complete self-signup flow
   * Creates tenant, owner user, and trial subscription in a transaction
   */
  async signup(data) {
    const {
      // Tenant data
      tenantName,
      tenantType = 'establishment', // 'establishment' or 'autonomous'
      document,
      documentType,
      phone,
      address,
      
      // Owner data
      ownerName,
      ownerEmail,
      ownerPassword,
      
      // Optional
      planSlug,
      referralCode,
      utmSource,
      utmMedium,
      utmCampaign,
    } = data;

    // Validate required fields
    this._validateSignupData(data);

    // Start transaction
    const transaction = await this.sequelize.transaction();

    try {
      // 1. Generate unique slug
      const slug = await this._generateUniqueSlug(tenantName);

      // 2. Check if email is already registered
      const emailExists = await this._checkEmailExists(ownerEmail);
      if (emailExists) {
        throw new ConflictError('Este email já está cadastrado.');
      }

      // 3. Check if document is already registered
      const documentExists = await this._checkDocumentExists(document);
      if (documentExists) {
        throw new ConflictError('Este CPF/CNPJ já está cadastrado.');
      }

      // 4. Create tenant
      const tenant = await this.sequelize.query(`
        INSERT INTO tenants (id, name, slug, email, phone, document_type, document, type, status, address, settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `, {
        bind: [
          uuidv4(),
          tenantName,
          slug,
          ownerEmail,
          phone || null,
          documentType || (document.length === 11 ? 'cpf' : 'cnpj'),
          document.replace(/\D/g, ''),
          tenantType,
          TENANT_STATUS.ACTIVE,
          JSON.stringify(address || {}),
          JSON.stringify({
            timezone: 'America/Sao_Paulo',
            currency: 'BRL',
            language: 'pt-BR',
            notificationsEnabled: true,
            allowOnlineBooking: true,
          }),
        ],
        type: this.sequelize.QueryTypes.INSERT,
        transaction,
      });

      const tenantId = tenant[0]?.[0]?.id;
      if (!tenantId) {
        throw new Error('Failed to create tenant');
      }

      // 5. Create owner user
      const hashedPassword = await this._hashPassword(ownerPassword);
      const userId = uuidv4();

      // Split owner name into first and last name
      const nameParts = ownerName.trim().split(' ');
      const firstName = nameParts[0] || ownerName;
      const lastName = nameParts.slice(1).join(' ') || firstName;

      await this.sequelize.query(`
        INSERT INTO users (id, tenant_id, first_name, last_name, email, password, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
      `, {
        bind: [userId, tenantId, firstName, lastName, ownerEmail.toLowerCase(), hashedPassword, ROLES.OWNER],
        transaction,
      });

      // 6. Update tenant with owner_id
      await this.sequelize.query(`
        UPDATE tenants SET owner_id = $1 WHERE id = $2
      `, {
        bind: [userId, tenantId],
        transaction,
      });

      // 7. Get default plan
      const plan = await this._getDefaultPlan(planSlug);
      if (!plan) {
        throw new Error('Default plan not found');
      }

      // 8. Create trial subscription
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + (plan.trial_days || this.DEFAULT_TRIAL_DAYS));

      const subscriptionId = uuidv4();
      await this.sequelize.query(`
        INSERT INTO subscriptions (
          id, tenant_id, plan_id, status,
          started_at, trial_ends_at, current_period_start, current_period_end,
          metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, NOW(), NOW())
      `, {
        bind: [
          subscriptionId,
          tenantId,
          plan.id,
          SUBSCRIPTION_STATUS.TRIAL,
          trialEndsAt,
          new Date(),
          trialEndsAt,
          JSON.stringify({
            signupSource: 'self_signup',
            referralCode: referralCode || null,
            utm: { source: utmSource, medium: utmMedium, campaign: utmCampaign },
          }),
        ],
        transaction,
      });

      // 9. Create initial usage counters
      const periodKey = this._getCurrentPeriodKey();
      const metrics = ['users', 'professionals', 'clients', 'appointments'];
      
      for (const metric of metrics) {
        await this.sequelize.query(`
          INSERT INTO usage_counters (id, tenant_id, metric, period_key, count, limit_value, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, {
          bind: [
            tenantId,
            metric,
            metric === 'appointments' ? periodKey : 'lifetime',
            metric === 'users' ? 1 : 0, // Start with 1 user (owner)
            plan.limits?.[metric] || null,
          ],
          transaction,
        });
      }

      // 10. Log onboarding
      await this.sequelize.query(`
        INSERT INTO billing_audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, new_values, created_at)
        VALUES (gen_random_uuid(), $1, $2, 'tenant.self_signup', 'tenant', $1, $3, NOW())
      `, {
        bind: [
          tenantId,
          userId,
          JSON.stringify({
            planSlug: plan.slug,
            trialDays: plan.trial_days || this.DEFAULT_TRIAL_DAYS,
            type: tenantType,
          }),
        ],
        transaction,
      });

      await transaction.commit();

      return {
        success: true,
        tenant: {
          id: tenantId,
          name: tenantName,
          slug,
          type: tenantType,
        },
        user: {
          id: userId,
          name: ownerName,
          email: ownerEmail,
          role: ROLES.OWNER,
        },
        subscription: {
          id: subscriptionId,
          plan: plan.slug,
          status: SUBSCRIPTION_STATUS.TRIAL,
          trialEndsAt,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFESSIONAL AUTÔNOMO FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Simplified signup for autonomous professionals
   */
  async signupAutonomous(data) {
    return this.signup({
      ...data,
      tenantType: 'autonomous',
      tenantName: data.ownerName, // Use owner name as tenant name
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIAL CONVERSION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Convert trial to paid subscription
   */
  async convertTrial(tenantId, { planSlug, billingCycle, paymentMethod, paymentData }) {
    // Get current subscription
    const [subscription] = await this.sequelize.query(`
      SELECT s.*, p.slug as plan_slug
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.tenant_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
    `, {
      bind: [tenantId],
      type: this.sequelize.QueryTypes.SELECT,
    });

    if (!subscription) {
      throw new ValidationError('Nenhuma assinatura encontrada.');
    }

    if (subscription.status !== SUBSCRIPTION_STATUS.TRIAL) {
      throw new ValidationError('Assinatura não está em período de teste.');
    }

    // Get target plan
    const [plan] = await this.sequelize.query(`
      SELECT * FROM subscription_plans WHERE slug = $1 AND is_active = true
    `, {
      bind: [planSlug || subscription.plan_slug],
      type: this.sequelize.QueryTypes.SELECT,
    });

    if (!plan) {
      throw new ValidationError('Plano não encontrado.');
    }

    // Calculate period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update subscription
    await this.sequelize.query(`
      UPDATE subscriptions
      SET status = $1,
          plan_id = $2,
          billing_cycle = $3,
          payment_method = $4,
          current_period_start = $5,
          current_period_end = $6,
          amount = $7,
          trial_ends_at = NULL,
          updated_at = NOW()
      WHERE id = $8
    `, {
      bind: [
        SUBSCRIPTION_STATUS.ACTIVE,
        plan.id,
        billingCycle || 'monthly',
        paymentMethod,
        now,
        periodEnd,
        billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly,
        subscription.id,
      ],
    });

    // Log conversion
    await this.sequelize.query(`
      INSERT INTO billing_audit_logs (id, tenant_id, action, entity_type, entity_id, old_values, new_values, created_at)
      VALUES (gen_random_uuid(), $1, 'subscription.trial_converted', 'subscription', $2, $3, $4, NOW())
    `, {
      bind: [
        tenantId,
        subscription.id,
        JSON.stringify({ status: SUBSCRIPTION_STATUS.TRIAL }),
        JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE, plan: plan.slug, billingCycle }),
      ],
    });

    return {
      success: true,
      subscription: {
        id: subscription.id,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        plan: plan.slug,
        billingCycle,
        periodEnd,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  _validateSignupData(data) {
    const errors = [];

    if (!data.tenantName?.trim()) {
      errors.push({ field: 'tenantName', message: 'Nome da empresa é obrigatório' });
    }

    if (!data.ownerName?.trim()) {
      errors.push({ field: 'ownerName', message: 'Nome do proprietário é obrigatório' });
    }

    if (!data.ownerEmail?.includes('@')) {
      errors.push({ field: 'ownerEmail', message: 'Email inválido' });
    }

    if (!data.ownerPassword || data.ownerPassword.length < 6) {
      errors.push({ field: 'ownerPassword', message: 'Senha deve ter no mínimo 6 caracteres' });
    }

    if (!data.document) {
      errors.push({ field: 'document', message: 'CPF/CNPJ é obrigatório' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Dados inválidos', errors);
    }
  }

  async _generateUniqueSlug(name) {
    let baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const [exists] = await this.sequelize.query(
        'SELECT 1 FROM tenants WHERE slug = $1',
        { bind: [slug], type: this.sequelize.QueryTypes.SELECT }
      );
      
      if (!exists) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async _checkEmailExists(email) {
    const [result] = await this.sequelize.query(
      'SELECT 1 FROM users WHERE email = $1 LIMIT 1',
      { bind: [email.toLowerCase()], type: this.sequelize.QueryTypes.SELECT }
    );
    return !!result;
  }

  async _checkDocumentExists(document) {
    const cleanDoc = document.replace(/\D/g, '');
    const [result] = await this.sequelize.query(
      'SELECT 1 FROM tenants WHERE document = $1 LIMIT 1',
      { bind: [cleanDoc], type: this.sequelize.QueryTypes.SELECT }
    );
    return !!result;
  }

  async _getDefaultPlan(slug = null) {
    const planSlug = slug || this.DEFAULT_PLAN_SLUG;
    const [plan] = await this.sequelize.query(
      'SELECT * FROM subscription_plans WHERE slug = $1 AND is_active = true LIMIT 1',
      { bind: [planSlug], type: this.sequelize.QueryTypes.SELECT }
    );
    return plan;
  }

  async _hashPassword(password) {
    const bcrypt = require('bcryptjs');
    return bcrypt.hash(password, 10);
  }

  _getCurrentPeriodKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

module.exports = OnboardingService;
