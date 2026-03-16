'use strict';

/**
 * Migration: Create login_attempts table
 * Required by BruteForceProtection middleware
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('login_attempts', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
      },
      identifier: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email or IP address',
      },
      identifier_type: {
        type: Sequelize.ENUM('email', 'ip'),
        allowNull: false,
      },
      tenant_slug: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IPv4 or IPv6',
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      failure_reason: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Index for fast lookups by identifier + type + time window
    await queryInterface.addIndex('login_attempts', ['identifier', 'identifier_type', 'created_at'], {
      name: 'login_attempts_identifier_type_created_idx',
    });

    // Index for cleanup job
    await queryInterface.addIndex('login_attempts', ['created_at'], {
      name: 'login_attempts_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('login_attempts');
  },
};
