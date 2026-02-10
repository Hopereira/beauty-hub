const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');
const establishmentRoutes = require('./routes/establishments');
const professionalRoutes = require('./routes/professionals');
const serviceRoutes = require('./routes/services');
const clientRoutes = require('./routes/clients');
const appointmentRoutes = require('./routes/appointments');
const financialRoutes = require('./routes/financial');
const notificationRoutes = require('./routes/notifications');

const app = express();

// ── Security ──
app.use(helmet());

// ── CORS ──
app.use(cors({
  origin: env.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ──
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ── Rate limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
    error: { code: 'RATE_LIMIT_EXCEEDED', details: null },
  },
});
app.use('/api/', limiter);

// ── Auth rate limiting (stricter) ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    error: { code: 'AUTH_RATE_LIMIT', details: null },
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Beauty Hub API is running.', data: { uptime: process.uptime(), timestamp: new Date().toISOString() } });
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/establishments', establishmentRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/notifications', notificationRoutes);

// ── 404 handler ──
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    error: { code: 'ROUTE_NOT_FOUND', details: null },
  });
});

// ── Global error handler ──
app.use(errorHandler);

module.exports = app;
