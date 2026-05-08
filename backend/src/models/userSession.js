'use strict';

/**
 * UserSession Model
 * Tracks user sessions for JWT token revocation
 * Security: Stores token hashes, not actual tokens
 */

module.exports = (sequelize, DataTypes) => {
  const UserSession = sequelize.define('UserSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    
    refreshTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'refresh_token_hash',
    },
    
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
      field: 'ip_address',
    },
    
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
    
    deviceInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'device_info',
    },
    
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    
    isValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_valid',
    },
    
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
    },
    
    revokedReason: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'revoked_reason',
    },
    
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_used_at',
    },
  }, {
    tableName: 'user_sessions',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    paranoid: false, // Hard delete for audit
    
    indexes: [
      {
        fields: ['user_id', 'is_valid'],
        name: 'user_sessions_user_valid_idx',
      },
      {
        fields: ['refresh_token_hash'],
        name: 'user_sessions_token_hash_idx',
      },
      {
        fields: ['expires_at'],
        name: 'user_sessions_expires_idx',
      },
    ],
  });

  UserSession.associate = (models) => {
    UserSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
    
    UserSession.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });
  };

  return UserSession;
};
