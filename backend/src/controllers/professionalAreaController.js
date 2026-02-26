/**
 * Professional Area Controller
 * Endpoints específicos para role PROFESSIONAL
 * Todos os endpoints filtram por professional_id = req.user.id
 */

const { Professional, User, Appointment, Client, Service, Establishment } = require('../models');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Helper: Get professional_id from req.user.id
 */
async function getProfessionalId(userId) {
  const professional = await Professional.findOne({
    where: { user_id: userId },
    attributes: ['id', 'establishment_id'],
  });
  
  if (!professional) {
    throw new Error('Professional profile not found');
  }
  
  return professional;
}

/**
 * GET /api/professional/dashboard
 * Dashboard com métricas do profissional
 */
async function getDashboard(req, res, next) {
  try {
    const professional = await getProfessionalId(req.user.id);
    const professionalId = professional.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Total atendimentos hoje
    const appointmentsToday = await Appointment.count({
      where: {
        professional_id: professionalId,
        start_time: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
        status: { [Op.in]: ['CONFIRMED', 'COMPLETED'] },
      },
    });

    // Próximo agendamento
    const nextAppointment = await Appointment.findOne({
      where: {
        professional_id: professionalId,
        start_time: { [Op.gte]: new Date() },
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
      },
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'phone'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'duration'] },
      ],
      order: [['start_time', 'ASC']],
    });

    // Total atendimentos mês
    const appointmentsMonth = await Appointment.count({
      where: {
        professional_id: professionalId,
        start_time: {
          [Op.gte]: startOfMonth,
          [Op.lte]: endOfMonth,
        },
        status: 'COMPLETED',
      },
    });

    // Comissão mês (soma de price_charged * commission_rate)
    const [commissionResult] = await sequelize.query(
      `SELECT 
        COALESCE(SUM(a.price_charged * (p.commission_rate / 100)), 0) as total_commission
      FROM appointments a
      INNER JOIN professionals p ON a.professional_id = p.id
      WHERE a.professional_id = :professionalId
        AND a.status = 'COMPLETED'
        AND a.start_time >= :startOfMonth
        AND a.start_time <= :endOfMonth
        AND a.deleted_at IS NULL`,
      {
        replacements: { professionalId, startOfMonth, endOfMonth },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      message: 'Dashboard carregado com sucesso',
      data: {
        today: {
          appointments: appointmentsToday,
        },
        month: {
          appointments: appointmentsMonth,
          commission: parseFloat(commissionResult.total_commission || 0),
        },
        nextAppointment: nextAppointment || null,
      },
    });
  } catch (error) {
    logger.error('[ProfessionalArea] Dashboard error:', error);
    next(error);
  }
}

/**
 * GET /api/professional/appointments
 * Meus agendamentos com filtros
 */
async function getAppointments(req, res, next) {
  try {
    const professional = await getProfessionalId(req.user.id);
    const professionalId = professional.id;

    const { 
      page = 1, 
      limit = 20, 
      status, 
      startDate, 
      endDate,
      sort = 'start_time',
      order = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { professional_id: professionalId };

    // Filtro por status
    if (status) {
      where.status = status;
    }

    // Filtro por período
    if (startDate || endDate) {
      where.start_time = {};
      if (startDate) {
        where.start_time[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.start_time[Op.lte] = end;
      }
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'phone', 'email'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'duration', 'price'] },
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      message: 'Agendamentos listados com sucesso',
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('[ProfessionalArea] Appointments error:', error);
    next(error);
  }
}

/**
 * GET /api/professional/clients
 * Meus clientes (apenas clientes atendidos por mim)
 */
async function getClients(req, res, next) {
  try {
    const professional = await getProfessionalId(req.user.id);
    const professionalId = professional.id;

    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    // Query para buscar clientes únicos atendidos pelo profissional
    const query = `
      SELECT DISTINCT
        c.id,
        c.name,
        c.phone,
        c.email,
        COUNT(a.id) as total_appointments,
        MAX(a.start_time) as last_appointment
      FROM clients c
      INNER JOIN appointments a ON c.id = a.client_id
      WHERE a.professional_id = :professionalId
        AND a.deleted_at IS NULL
        AND c.deleted_at IS NULL
        ${search ? `AND c.name ILIKE :search` : ''}
      GROUP BY c.id, c.name, c.phone, c.email
      ORDER BY last_appointment DESC
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM clients c
      INNER JOIN appointments a ON c.id = a.client_id
      WHERE a.professional_id = :professionalId
        AND a.deleted_at IS NULL
        AND c.deleted_at IS NULL
        ${search ? `AND c.name ILIKE :search` : ''}
    `;

    const replacements = {
      professionalId,
      limit: parseInt(limit),
      offset,
      ...(search && { search: `%${search}%` }),
    };

    const [clients] = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    const [countResult] = await sequelize.query(countQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    const total = parseInt(countResult.total || 0);

    res.json({
      success: true,
      message: 'Clientes listados com sucesso',
      data: clients,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[ProfessionalArea] Clients error:', error);
    next(error);
  }
}

/**
 * GET /api/professional/earnings
 * Meus ganhos/comissão
 */
async function getEarnings(req, res, next) {
  try {
    const professional = await getProfessionalId(req.user.id);
    const professionalId = professional.id;

    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Período padrão: mês atual
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Total comissão no período
    const [totalResult] = await sequelize.query(
      `SELECT 
        COALESCE(SUM(a.price_charged * (p.commission_rate / 100)), 0) as total_commission,
        COUNT(a.id) as total_appointments
      FROM appointments a
      INNER JOIN professionals p ON a.professional_id = p.id
      WHERE a.professional_id = :professionalId
        AND a.status = 'COMPLETED'
        AND a.start_time >= :startDate
        AND a.start_time <= :endDate
        AND a.deleted_at IS NULL`,
      {
        replacements: { professionalId, startDate: start, endDate: end },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Lista de transações
    const [transactions] = await sequelize.query(
      `SELECT 
        a.id,
        a.start_time,
        a.price_charged,
        (a.price_charged * (p.commission_rate / 100)) as commission,
        p.commission_rate,
        c.name as client_name,
        s.name as service_name
      FROM appointments a
      INNER JOIN professionals p ON a.professional_id = p.id
      INNER JOIN clients c ON a.client_id = c.id
      INNER JOIN services s ON a.service_id = s.id
      WHERE a.professional_id = :professionalId
        AND a.status = 'COMPLETED'
        AND a.start_time >= :startDate
        AND a.start_time <= :endDate
        AND a.deleted_at IS NULL
      ORDER BY a.start_time DESC
      LIMIT :limit OFFSET :offset`,
      {
        replacements: { professionalId, startDate: start, endDate: end, limit: parseInt(limit), offset },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      message: 'Ganhos listados com sucesso',
      data: {
        summary: {
          total_commission: parseFloat(totalResult.total_commission || 0),
          total_appointments: parseInt(totalResult.total_appointments || 0),
        },
        transactions,
        period: { startDate: start, endDate: end },
      },
      pagination: {
        total: parseInt(totalResult.total_appointments || 0),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(totalResult.total_appointments || 0) / limit),
      },
    });
  } catch (error) {
    logger.error('[ProfessionalArea] Earnings error:', error);
    next(error);
  }
}

/**
 * GET /api/professional/performance
 * Minha performance/estatísticas
 */
async function getPerformance(req, res, next) {
  try {
    const professional = await getProfessionalId(req.user.id);
    const professionalId = professional.id;

    const { startDate, endDate } = req.query;

    // Período padrão: últimos 30 dias
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Estatísticas agregadas
    const [stats] = await sequelize.query(
      `SELECT 
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'COMPLETED' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END) as cancelled_appointments,
        COUNT(CASE WHEN a.status = 'NO_SHOW' THEN 1 END) as no_show_appointments,
        COALESCE(AVG(a.price_charged), 0) as average_ticket,
        COALESCE(SUM(a.price_charged), 0) as total_revenue,
        COALESCE(SUM(a.price_charged * (p.commission_rate / 100)), 0) as total_commission
      FROM appointments a
      INNER JOIN professionals p ON a.professional_id = p.id
      WHERE a.professional_id = :professionalId
        AND a.start_time >= :startDate
        AND a.start_time <= :endDate
        AND a.deleted_at IS NULL`,
      {
        replacements: { professionalId, startDate: start, endDate: end },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Serviço mais executado
    const [topServices] = await sequelize.query(
      `SELECT 
        s.id,
        s.name,
        COUNT(a.id) as total,
        COALESCE(SUM(a.price_charged), 0) as revenue
      FROM appointments a
      INNER JOIN services s ON a.service_id = s.id
      WHERE a.professional_id = :professionalId
        AND a.status = 'COMPLETED'
        AND a.start_time >= :startDate
        AND a.start_time <= :endDate
        AND a.deleted_at IS NULL
      GROUP BY s.id, s.name
      ORDER BY total DESC
      LIMIT 5`,
      {
        replacements: { professionalId, startDate: start, endDate: end },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      message: 'Performance carregada com sucesso',
      data: {
        summary: {
          total_appointments: parseInt(stats.total_appointments || 0),
          completed_appointments: parseInt(stats.completed_appointments || 0),
          cancelled_appointments: parseInt(stats.cancelled_appointments || 0),
          no_show_appointments: parseInt(stats.no_show_appointments || 0),
          average_ticket: parseFloat(stats.average_ticket || 0),
          total_revenue: parseFloat(stats.total_revenue || 0),
          total_commission: parseFloat(stats.total_commission || 0),
        },
        top_services: topServices,
        period: { startDate: start, endDate: end },
      },
    });
  } catch (error) {
    logger.error('[ProfessionalArea] Performance error:', error);
    next(error);
  }
}

/**
 * GET /api/professional/profile
 * Meu perfil
 */
async function getProfile(req, res, next) {
  try {
    const professional = await getProfessionalId(req.user.id);

    const fullProfile = await Professional.findByPk(professional.id, {
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar'] 
        },
        { 
          model: Establishment, 
          as: 'establishment', 
          attributes: ['id', 'name', 'phone', 'address'] 
        },
      ],
    });

    res.json({
      success: true,
      message: 'Perfil carregado com sucesso',
      data: fullProfile,
    });
  } catch (error) {
    logger.error('[ProfessionalArea] Profile error:', error);
    next(error);
  }
}

/**
 * PUT /api/professional/profile
 * Atualizar meu perfil (campos limitados)
 */
async function updateProfile(req, res, next) {
  try {
    const professional = await getProfessionalId(req.user.id);
    const { phone, avatar } = req.body;

    // Atualizar apenas campos permitidos no User
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
        error: { code: 'USER_NOT_FOUND', details: null },
      });
    }

    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;

    await user.update(updates);

    // Retornar perfil atualizado
    const updatedProfile = await Professional.findByPk(professional.id, {
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar'] 
        },
      ],
    });

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: updatedProfile,
    });
  } catch (error) {
    logger.error('[ProfessionalArea] Update profile error:', error);
    next(error);
  }
}

/**
 * GET /api/professional/availability
 * Minha disponibilidade (placeholder - implementar conforme modelo)
 */
async function getAvailability(req, res, next) {
  try {
    const professional = await getProfessionalId(req.user.id);

    // TODO: Implementar modelo de disponibilidade
    // Por enquanto, retornar estrutura vazia
    res.json({
      success: true,
      message: 'Disponibilidade carregada com sucesso',
      data: {
        professional_id: professional.id,
        schedule: [],
        note: 'Funcionalidade de disponibilidade em desenvolvimento',
      },
    });
  } catch (error) {
    logger.error('[ProfessionalArea] Availability error:', error);
    next(error);
  }
}

/**
 * PUT /api/professional/availability
 * Atualizar minha disponibilidade (placeholder)
 */
async function updateAvailability(req, res, next) {
  try {
    const professional = await getProfessionalId(req.user.id);

    // TODO: Implementar modelo de disponibilidade
    res.json({
      success: true,
      message: 'Disponibilidade atualizada com sucesso',
      data: {
        professional_id: professional.id,
        note: 'Funcionalidade de disponibilidade em desenvolvimento',
      },
    });
  } catch (error) {
    logger.error('[ProfessionalArea] Update availability error:', error);
    next(error);
  }
}

module.exports = {
  getDashboard,
  getAppointments,
  getClients,
  getEarnings,
  getPerformance,
  getProfile,
  updateProfile,
  getAvailability,
  updateAvailability,
};
