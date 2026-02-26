'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('establishments', 'payment_settings', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await queryInterface.addColumn('establishments', 'bank_account', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await queryInterface.addColumn('establishments', 'pagarme_recipient_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('establishments', 'payment_settings');
    await queryInterface.removeColumn('establishments', 'bank_account');
    await queryInterface.removeColumn('establishments', 'pagarme_recipient_id');
  },
};
