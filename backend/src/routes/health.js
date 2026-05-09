/**
 * Health Check Routes
 * Enterprise monitoring endpoints
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const env = require('../config/env');

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: env.nodeEnv,
  });
});

/**
 * GET /api/health/deep
 * Deep health check with database and dependencies
 */
router.get('/deep', async (req, res) => {
  const checks = {
    database: false,
    database_latency_ms: null,
  };
  
  let statusCode = 200;
  
  // Check database
  try {
    const start = Date.now();
    await sequelize.query('SELECT 1');
    checks.database = true;
    checks.database_latency_ms = Date.now() - start;
  } catch (error) {
    checks.database = false;
    checks.database_error = error.message;
    statusCode = 503;
  }
  
  // Memory usage
  const memory = process.memoryUsage();
  checks.memory = {
    used_mb: Math.round(memory.heapUsed / 1024 / 1024),
    total_mb: Math.round(memory.heapTotal / 1024 / 1024),
    rss_mb: Math.round(memory.rss / 1024 / 1024),
  };
  
  // Check if memory is critical (> 500MB)
  if (memory.heapUsed > 500 * 1024 * 1024) {
    checks.memory.status = 'warning';
  } else {
    checks.memory.status = 'ok';
  }
  
  res.status(statusCode).json({
    status: statusCode === 200 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * GET /api/health/ready
 * Kubernetes-style readiness probe
 */
router.get('/ready', async (req, res) => {
  try {
    await sequelize.query('SELECT 1');
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

/**
 * GET /api/health/live
 * Kubernetes-style liveness probe
 */
router.get('/live', (req, res) => {
  res.status(200).json({ alive: true });
});

/**
 * GET /api/health/metrics
 * Prometheus-style metrics (basic)
 */
router.get('/metrics', (req, res) => {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  
  const metrics = `
# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="heapUsed"} ${memory.heapUsed}
nodejs_memory_usage_bytes{type="heapTotal"} ${memory.heapTotal}
nodejs_memory_usage_bytes{type="rss"} ${memory.rss}

# HELP nodejs_uptime_seconds Process uptime in seconds
# TYPE nodejs_uptime_seconds gauge
nodejs_uptime_seconds ${uptime}
  `.trim();
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

module.exports = router;
