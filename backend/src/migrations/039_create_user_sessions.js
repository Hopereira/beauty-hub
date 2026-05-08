'use strict';

/**
 * Migration: Create user_sessions table
 * Purpose: Session management for JWT revocation and security tracking
 * Security: Allows logout from all devices, session invalidation
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      
      // Token identifiers (hashed for security)
      refresh_token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'SHA-256 hash of refresh token',
      },
      
      // Session metadata
      ip_address: {
        type: Sequelize.INET,
        allowNull: true,
      },
      
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      
      device_info: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Parsed device info from user agent',
      },
      
      // Tenant context
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      
      // Session status
      is_valid: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      
      revoked_reason: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'logout, password_change, security_concern',
      },
      
      // Expiration
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Indexes for performance
    await queryInterface.addIndex('user_sessions', ['user_id', 'is_valid'], {
      name: 'user_sessions_user_valid_idx',
    });
    
    await queryInterface.addIndex('user_sessions', ['refresh_token_hash'], {
      name: 'user_sessions_token_hash_idx',
    });
    
    await queryInterface.addIndex('user_sessions', ['expires_at'], {
      name: 'user_sessions_expires_idx',
    });
    
    await queryInterface.addIndex('user_sessions', ['created_at'], {
      name: 'user_sessions_created_idx',
    });

    console.log('[MIGRATION] Table user_sessions created for session management');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_sessions');
    console.log('[MIGRATION] Table user_sessions removed');
  },
};
