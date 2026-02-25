'use strict';

/**
 * Add tenant_id to existing users table for multi-tenant support
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper to check if column exists
    const columnExists = async (table, column) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = '${column}'
      `);
      return results.length > 0;
    };

    // 1. Add tenant_id column to users
    if (!(await columnExists('users', 'tenant_id'))) {
      await queryInterface.addColumn('users', 'tenant_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    // 2. Add new columns (only if they don't exist)
    if (!(await columnExists('users', 'email_verified_at'))) {
      await queryInterface.addColumn('users', 'email_verified_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!(await columnExists('users', 'last_login_at'))) {
      await queryInterface.addColumn('users', 'last_login_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!(await columnExists('users', 'password_reset_token'))) {
      await queryInterface.addColumn('users', 'password_reset_token', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    if (!(await columnExists('users', 'password_reset_expires'))) {
      await queryInterface.addColumn('users', 'password_reset_expires', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!(await columnExists('users', 'settings'))) {
      await queryInterface.addColumn('users', 'settings', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      });
    }

    if (!(await columnExists('users', 'metadata'))) {
      await queryInterface.addColumn('users', 'metadata', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      });
    }

    // 3. Add MASTER, OWNER, CLIENT to existing role enum (if not exists)
    try {
      await queryInterface.sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'master';`);
      await queryInterface.sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'owner';`);
      await queryInterface.sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'client';`);
    } catch (e) { /* ignore if already exists */ }

    // 4. Add indexes (ignore if exists)
    try {
      await queryInterface.addIndex('users', ['tenant_id'], { name: 'users_tenant_id_idx' });
    } catch (e) { /* ignore */ }

    // 5. Add owner_id FK to tenants
    try {
      await queryInterface.addConstraint('tenants', {
        fields: ['owner_id'],
        type: 'foreign key',
        name: 'tenants_owner_id_fkey',
        references: { table: 'users', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (e) { /* ignore if already exists */ }
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('tenants', 'tenants_owner_id_fkey');
    await queryInterface.removeIndex('users', 'users_is_active_idx');
    await queryInterface.removeIndex('users', 'users_tenant_id_idx');
    await queryInterface.removeColumn('users', 'metadata');
    await queryInterface.removeColumn('users', 'settings');
    await queryInterface.removeColumn('users', 'password_reset_expires');
    await queryInterface.removeColumn('users', 'password_reset_token');
    await queryInterface.removeColumn('users', 'last_login_at');
    await queryInterface.removeColumn('users', 'email_verified_at');
    await queryInterface.removeColumn('users', 'is_active');
    await queryInterface.removeColumn('users', 'tenant_id');
  },
};
