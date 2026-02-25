/**
 * Database Module Export
 */

const { sequelize, Sequelize, testConnection, closeConnection } = require('./connection');
const BaseRepository = require('./BaseRepository');

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  closeConnection,
  BaseRepository,
};
