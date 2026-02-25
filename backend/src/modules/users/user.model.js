/**
 * User Model (Multi-Tenant)
 * Users belong to tenants (except MASTER role)
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../../shared/constants');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Tenant reference (null for MASTER users)
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
    },

    // Personal info
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Role (RBAC)
    role: {
      type: DataTypes.ENUM(...Object.values(ROLES)),
      allowNull: false,
      defaultValue: ROLES.CLIENT,
    },

    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Password reset
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Settings
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
      },
    },

    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['email'] },
      { fields: ['role'] },
      { fields: ['is_active'] },
      // Unique email per tenant (MASTER users have null tenant_id)
      {
        unique: true,
        fields: ['tenant_id', 'email'],
        where: { deleted_at: null },
      },
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
        if (user.changed('email')) {
          user.email = user.email.toLowerCase().trim();
        }
      },
    },
  });

  // Instance methods
  User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password);
  };

  User.prototype.getFullName = function() {
    return `${this.first_name} ${this.last_name}`.trim();
  };

  User.prototype.isMaster = function() {
    return this.role === ROLES.MASTER;
  };

  User.prototype.isOwner = function() {
    return this.role === ROLES.OWNER;
  };

  User.prototype.isAdmin = function() {
    return [ROLES.ADMIN, ROLES.OWNER, ROLES.MASTER].includes(this.role);
  };

  User.prototype.canManageUsers = function() {
    return [ROLES.ADMIN, ROLES.OWNER, ROLES.MASTER].includes(this.role);
  };

  User.prototype.toPublicJSON = function() {
    return {
      id: this.id,
      tenantId: this.tenant_id,
      firstName: this.first_name,
      lastName: this.last_name,
      fullName: this.getFullName(),
      email: this.email,
      phone: this.phone,
      avatar: this.avatar,
      role: this.role,
      isActive: this.is_active,
      emailVerified: !!this.email_verified_at,
      lastLoginAt: this.last_login_at,
      settings: this.settings,
      createdAt: this.created_at,
    };
  };

  User.prototype.toTokenPayload = function() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      tenantId: this.tenant_id,
    };
  };

  return User;
};
