/**
 * Professional Area Routes
 * Rotas específicas para role PROFESSIONAL
 * Todos os endpoints protegidos com authorize(['PROFESSIONAL'])
 */

const { Router } = require('express');
const professionalAreaController = require('../controllers/professionalAreaController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { paginationSchema } = require('../utils/validators');

const router = Router();

// Todos os endpoints requerem autenticação
router.use(authenticate);

// Todos os endpoints requerem role PROFESSIONAL
router.use(authorize('PROFESSIONAL'));

/**
 * GET /api/professional/dashboard
 * Dashboard com métricas do profissional
 */
router.get('/dashboard', professionalAreaController.getDashboard);

/**
 * GET /api/professional/appointments
 * Meus agendamentos com filtros e paginação
 * Query params: page, limit, status, startDate, endDate, sort, order
 */
router.get('/appointments', validate(paginationSchema, 'query'), professionalAreaController.getAppointments);

/**
 * GET /api/professional/clients
 * Meus clientes (apenas clientes atendidos por mim)
 * Query params: page, limit, search
 */
router.get('/clients', validate(paginationSchema, 'query'), professionalAreaController.getClients);

/**
 * GET /api/professional/earnings
 * Meus ganhos/comissão
 * Query params: startDate, endDate, page, limit
 */
router.get('/earnings', validate(paginationSchema, 'query'), professionalAreaController.getEarnings);

/**
 * GET /api/professional/performance
 * Minha performance/estatísticas
 * Query params: startDate, endDate
 */
router.get('/performance', professionalAreaController.getPerformance);

/**
 * GET /api/professional/profile
 * Meu perfil
 */
router.get('/profile', professionalAreaController.getProfile);

/**
 * PUT /api/professional/profile
 * Atualizar meu perfil (campos limitados: phone, avatar)
 */
router.put('/profile', professionalAreaController.updateProfile);

/**
 * GET /api/professional/availability
 * Minha disponibilidade
 */
router.get('/availability', professionalAreaController.getAvailability);

/**
 * PUT /api/professional/availability
 * Atualizar minha disponibilidade
 */
router.put('/availability', professionalAreaController.updateAvailability);

module.exports = router;
