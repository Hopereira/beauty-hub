/**
 * Tenant Service
 * Business logic for tenant operations
 */

const { ConflictError, ValidationError } = require('../../shared/errors');
const { TENANT_STATUS } = require('../../shared/constants');
const logger = require('../../shared/utils/logger');

class TenantService {
  constructor(tenantRepository) {
    this.tenantRepository = tenantRepository;
  }

  /**
   * Get all tenants (MASTER only)
   */
  async getAllTenants(options = {}) {
    return this.tenantRepository.findAll(options);
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id) {
    return this.tenantRepository.findById(id);
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug) {
    return this.tenantRepository.findBySlug(slug);
  }

  /**
   * Create new tenant
   */
  async createTenant(data) {
    // Validate uniqueness
    await this._validateUniqueness(data);

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = await this._generateUniqueSlug(data.name);
    }

    // Set initial status
    data.status = TENANT_STATUS.PENDING;

    const tenant = await this.tenantRepository.create(data);
    
    logger.info('Tenant created', { tenantId: tenant.id, slug: tenant.slug });
    
    return tenant;
  }

  /**
   * Update tenant
   */
  async updateTenant(id, data) {
    // Validate uniqueness for email/document if being changed
    if (data.email) {
      const isAvailable = await this.tenantRepository.isEmailAvailable(data.email, id);
      if (!isAvailable) {
        throw new ConflictError('Email já está em uso por outro tenant.');
      }
    }

    if (data.document) {
      const isAvailable = await this.tenantRepository.isDocumentAvailable(data.document, id);
      if (!isAvailable) {
        throw new ConflictError('Documento já está em uso por outro tenant.');
      }
    }

    const tenant = await this.tenantRepository.update(id, data);
    
    logger.info('Tenant updated', { tenantId: id });
    
    return tenant;
  }

  /**
   * Activate tenant
   */
  async activateTenant(id) {
    const tenant = await this.tenantRepository.findById(id);
    
    if (tenant.status === TENANT_STATUS.ACTIVE) {
      throw new ValidationError('Tenant já está ativo.');
    }

    await tenant.activate();
    
    logger.info('Tenant activated', { tenantId: id });
    
    return tenant;
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(id, reason) {
    const tenant = await this.tenantRepository.findById(id);
    
    if (tenant.status === TENANT_STATUS.SUSPENDED) {
      throw new ValidationError('Tenant já está suspenso.');
    }

    await tenant.suspend(reason);
    
    logger.warn('Tenant suspended', { tenantId: id, reason });
    
    return tenant;
  }

  /**
   * Cancel tenant
   */
  async cancelTenant(id) {
    const tenant = await this.tenantRepository.update(id, {
      status: TENANT_STATUS.CANCELLED,
    });
    
    logger.warn('Tenant cancelled', { tenantId: id });
    
    return tenant;
  }

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(id) {
    await this.tenantRepository.delete(id);
    
    logger.warn('Tenant deleted', { tenantId: id });
    
    return true;
  }

  /**
   * Update tenant settings
   */
  async updateSettings(id, settings) {
    const tenant = await this.tenantRepository.findById(id);
    
    const updatedSettings = {
      ...tenant.settings,
      ...settings,
    };

    return this.tenantRepository.update(id, { settings: updatedSettings });
  }

  /**
   * Update tenant branding
   */
  async updateBranding(id, branding) {
    const tenant = await this.tenantRepository.findById(id);
    
    const updatedBranding = {
      ...tenant.branding,
      ...branding,
    };

    return this.tenantRepository.update(id, { branding: updatedBranding });
  }

  /**
   * Set tenant owner
   */
  async setOwner(tenantId, ownerId) {
    return this.tenantRepository.update(tenantId, { owner_id: ownerId });
  }

  /**
   * Get tenant statistics (MASTER only)
   */
  async getStatistics() {
    return this.tenantRepository.getStatistics();
  }

  /**
   * Validate uniqueness of slug, email, document
   */
  async _validateUniqueness(data) {
    const errors = [];

    if (data.slug) {
      const slugAvailable = await this.tenantRepository.isSlugAvailable(data.slug);
      if (!slugAvailable) {
        errors.push({ field: 'slug', message: 'Slug já está em uso.' });
      }
    }

    if (data.email) {
      const emailAvailable = await this.tenantRepository.isEmailAvailable(data.email);
      if (!emailAvailable) {
        errors.push({ field: 'email', message: 'Email já está em uso.' });
      }
    }

    if (data.document) {
      const docAvailable = await this.tenantRepository.isDocumentAvailable(data.document);
      if (!docAvailable) {
        errors.push({ field: 'document', message: 'Documento já está em uso.' });
      }
    }

    if (errors.length > 0) {
      throw new ConflictError('Dados duplicados.', errors);
    }
  }

  /**
   * Generate unique slug from name
   */
  async _generateUniqueSlug(name) {
    let baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphen
      .replace(/^-+|-+$/g, '')         // Trim hyphens
      .substring(0, 50);               // Limit length

    let slug = baseSlug;
    let counter = 1;

    while (!(await this.tenantRepository.isSlugAvailable(slug))) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}

module.exports = TenantService;
