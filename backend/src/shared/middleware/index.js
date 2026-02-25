/**
 * Middleware Exports
 */

const auth = require('./auth');
const tenantResolver = require('./tenantResolver');
const errorHandler = require('./errorHandler');
const validation = require('./validation');
const { BruteForceProtection, createBruteForceProtection } = require('./bruteForceProtection');

module.exports = {
  ...auth,
  ...tenantResolver,
  ...errorHandler,
  ...validation,
  BruteForceProtection,
  createBruteForceProtection,
};
