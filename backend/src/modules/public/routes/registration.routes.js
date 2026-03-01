/**
 * Public Registration Routes
 * No authentication required
 */

const express = require('express');

function createRegistrationRoutes(controller) {
  const router = express.Router();

  // Register new tenant
  router.post('/register', controller.register.bind(controller));

  return router;
}

module.exports = createRegistrationRoutes;
