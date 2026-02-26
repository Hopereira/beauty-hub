'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('services', 'category', {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: 'name',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('services', 'category');
  },
};
