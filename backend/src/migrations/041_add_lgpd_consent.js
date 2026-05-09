'use strict';

/**
 * Migration: Add LGPD Consent fields to users
 * Purpose: Track explicit consent for terms and privacy policy
 * LGPD Compliance: Art. 7º, Art. 8º
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add consent fields to users table
    await queryInterface.addColumn('users', 'lgpd_consent_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    
    await queryInterface.addColumn('users', 'lgpd_consent_version', {
      type: Sequelize.STRING(10),
      allowNull: true,
    });
    
    await queryInterface.addColumn('users', 'lgpd_consent_ip', {
      type: Sequelize.INET,
      allowNull: true,
    });
    
    await queryInterface.addColumn('users', 'terms_accepted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    
    await queryInterface.addColumn('users', 'terms_version', {
      type: Sequelize.STRING(10),
      allowNull: true,
    });
    
    await queryInterface.addColumn('users', 'marketing_consent', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
    
    await queryInterface.addColumn('users', 'marketing_consent_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    
    // Create image_consents table for facial/image data (FASE 7)
    await queryInterface.createTable('image_consents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'SET NULL',
      },
      // Consent types
      facial_recognition: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Consent for facial recognition/AI analysis',
      },
      ai_filters: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Consent for AI beauty filters',
      },
      image_storage: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Consent for storing personal images',
      },
      marketing_use: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Consent to use images in marketing',
      },
      // Consent metadata
      consented_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      consent_version: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      consent_ip: {
        type: Sequelize.INET,
        allowNull: true,
      },
      // Withdrawal
      withdrawn_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      withdrawn_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
    
    await queryInterface.addIndex('image_consents', ['user_id'], {
      name: 'idx_image_consents_user',
    });
    
    console.log('[MIGRATION] LGPD consent fields added');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'lgpd_consent_at');
    await queryInterface.removeColumn('users', 'lgpd_consent_version');
    await queryInterface.removeColumn('users', 'lgpd_consent_ip');
    await queryInterface.removeColumn('users', 'terms_accepted_at');
    await queryInterface.removeColumn('users', 'terms_version');
    await queryInterface.removeColumn('users', 'marketing_consent');
    await queryInterface.removeColumn('users', 'marketing_consent_at');
    await queryInterface.dropTable('image_consents');
  },
};
