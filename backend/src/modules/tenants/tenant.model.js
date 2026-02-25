/**
 * Tenant Model
 * Represents a tenant (establishment or autonomous professional) in the SaaS
 */

const { DataTypes } = require('sequelize');
const { TENANT_STATUS } = require('../../shared/constants');

module.exports = (sequelize) => {
  const Tenant = sequelize.define('Tenant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    // Identification
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255],
      },
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/i,
        len: [3, 100],
      },
    },
    
    // Contact
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    
    // Document (CPF for autonomous, CNPJ for establishment)
    document_type: {
      type: DataTypes.ENUM('cpf', 'cnpj'),
      allowNull: false,
    },
    document: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    
    // Type
    type: {
      type: DataTypes.ENUM('establishment', 'autonomous'),
      allowNull: false,
      defaultValue: 'establishment',
    },
    
    // Status lifecycle
    status: {
      type: DataTypes.ENUM(...Object.values(TENANT_STATUS)),
      allowNull: false,
      defaultValue: TENANT_STATUS.PENDING,
    },
    
    // Address (JSONB for flexibility)
    address: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      // Structure: { street, number, complement, neighborhood, city, state, zipCode, country }
    },
    
    // Settings (JSONB for feature flags and config)
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        language: 'pt-BR',
        notificationsEnabled: true,
        allowOnlineBooking: true,
        requirePaymentOnBooking: false,
        cancellationPolicyHours: 24,
      },
    },
    
    // Branding (for custom branding feature)
    branding: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      // Structure: { logo, primaryColor, secondaryColor, customDomain }
    },
    
    // Metadata
    activated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    suspended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    suspension_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    // Owner reference (set after user creation)
    owner_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'tenants',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['email'], unique: true },
      { fields: ['document'], unique: true },
      { fields: ['status'] },
      { fields: ['type'] },
      { fields: ['owner_id'] },
      { fields: ['created_at'] },
    ],
    hooks: {
      beforeValidate: (tenant) => {
        if (tenant.slug) {
          tenant.slug = tenant.slug.toLowerCase().trim();
        }
        if (tenant.email) {
          tenant.email = tenant.email.toLowerCase().trim();
        }
        if (tenant.document) {
          tenant.document = tenant.document.replace(/\D/g, '');
        }
      },
    },
  });

  // Instance methods
  Tenant.prototype.isActive = function() {
    return this.status === TENANT_STATUS.ACTIVE;
  };

  Tenant.prototype.isSuspended = function() {
    return this.status === TENANT_STATUS.SUSPENDED;
  };

  Tenant.prototype.activate = async function() {
    this.status = TENANT_STATUS.ACTIVE;
    this.activated_at = new Date();
    this.suspended_at = null;
    this.suspension_reason = null;
    return this.save();
  };

  Tenant.prototype.suspend = async function(reason) {
    this.status = TENANT_STATUS.SUSPENDED;
    this.suspended_at = new Date();
    this.suspension_reason = reason;
    return this.save();
  };

  Tenant.prototype.toPublicJSON = function() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      type: this.type,
      status: this.status,
      settings: this.settings,
      branding: this.branding,
    };
  };

  return Tenant;
};
