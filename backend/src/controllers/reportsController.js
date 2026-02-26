const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Revenue by Period Report
 * Aggregates revenue by date range
 */
async function getRevenueByPeriod(req, res) {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const establishmentId = req.user.establishment_id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
        error: { code: 'MISSING_PARAMETERS', details: null },
      });
    }

    // Query real data from financial_entries
    const query = `
      SELECT 
        DATE(date) as period,
        SUM(amount) as total_revenue,
        COUNT(*) as transaction_count
      FROM financial_entries
      WHERE establishment_id = :establishmentId
        AND date >= :startDate
        AND date <= :endDate
        AND deleted_at IS NULL
      GROUP BY DATE(date)
      ORDER BY period ASC
    `;

    const results = await sequelize.query(query, {
      replacements: { establishmentId, startDate, endDate },
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      data: results,
      meta: {
        startDate,
        endDate,
        totalRevenue: results.reduce((sum, r) => sum + parseFloat(r.total_revenue || 0), 0),
        totalTransactions: results.reduce((sum, r) => sum + parseInt(r.transaction_count || 0), 0),
      },
    });
  } catch (error) {
    logger.error('[Reports] Revenue by period error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating revenue report',
      error: { code: 'REVENUE_REPORT_ERROR', details: error.message },
    });
  }
}

/**
 * Commission by Professional Report
 * Aggregates commissions per professional
 */
async function getCommissionByProfessional(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const establishmentId = req.user.establishment_id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
        error: { code: 'MISSING_PARAMETERS', details: null },
      });
    }

    const query = `
      SELECT 
        p.id as professional_id,
        u.first_name || ' ' || u.last_name as professional_name,
        COUNT(a.id) as total_appointments,
        SUM(a.total_price) as total_revenue,
        SUM(a.total_price * COALESCE(psc.commission_percentage, 0) / 100) as total_commission
      FROM professionals p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN appointments a ON a.professional_id = p.id 
        AND a.start_time >= :startDate 
        AND a.start_time <= :endDate
        AND a.deleted_at IS NULL
      LEFT JOIN professional_service_commission psc ON psc.professional_id = p.id
      WHERE p.establishment_id = :establishmentId
        AND p.deleted_at IS NULL
      GROUP BY p.id, u.first_name, u.last_name
      ORDER BY total_revenue DESC
    `;

    const results = await sequelize.query(query, {
      replacements: { establishmentId, startDate, endDate },
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      data: results,
      meta: {
        startDate,
        endDate,
        totalCommission: results.reduce((sum, r) => sum + parseFloat(r.total_commission || 0), 0),
      },
    });
  } catch (error) {
    logger.error('[Reports] Commission by professional error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating commission report',
      error: { code: 'COMMISSION_REPORT_ERROR', details: error.message },
    });
  }
}

/**
 * Top Services Report
 * Most sold services by revenue and quantity
 */
async function getTopServices(req, res) {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const establishmentId = req.user.establishment_id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
        error: { code: 'MISSING_PARAMETERS', details: null },
      });
    }

    const query = `
      SELECT 
        s.id as service_id,
        s.name as service_name,
        s.category,
        COUNT(a.id) as times_sold,
        SUM(a.total_price) as total_revenue,
        AVG(a.total_price) as average_price
      FROM services s
      LEFT JOIN appointments a ON a.service_id = s.id 
        AND a.start_time >= :startDate 
        AND a.start_time <= :endDate
        AND a.deleted_at IS NULL
      WHERE s.establishment_id = :establishmentId
        AND s.deleted_at IS NULL
      GROUP BY s.id, s.name, s.category
      ORDER BY total_revenue DESC
      LIMIT :limit
    `;

    const results = await sequelize.query(query, {
      replacements: { establishmentId, startDate, endDate, limit: parseInt(limit) },
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      data: results,
      meta: {
        startDate,
        endDate,
        totalServices: results.length,
      },
    });
  } catch (error) {
    logger.error('[Reports] Top services error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating top services report',
      error: { code: 'TOP_SERVICES_REPORT_ERROR', details: error.message },
    });
  }
}

/**
 * Top Products Report
 * Most used products in inventory
 */
async function getTopProducts(req, res) {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const establishmentId = req.user.establishment_id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
        error: { code: 'MISSING_PARAMETERS', details: null },
      });
    }

    const query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        SUM(ABS(im.quantity)) as total_used,
        p.stock_quantity as current_stock,
        p.sale_price,
        SUM(ABS(im.quantity) * p.sale_price) as estimated_value
      FROM products p
      LEFT JOIN inventory_movements im ON im.product_id = p.id 
        AND im.movement_type = 'out'
        AND im.created_at >= :startDate 
        AND im.created_at <= :endDate
        AND im.deleted_at IS NULL
      WHERE p.establishment_id = :establishmentId
        AND p.deleted_at IS NULL
      GROUP BY p.id, p.name, p.category, p.stock_quantity, p.sale_price
      ORDER BY total_used DESC
      LIMIT :limit
    `;

    const results = await sequelize.query(query, {
      replacements: { establishmentId, startDate, endDate, limit: parseInt(limit) },
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      data: results,
      meta: {
        startDate,
        endDate,
        totalProducts: results.length,
      },
    });
  } catch (error) {
    logger.error('[Reports] Top products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating top products report',
      error: { code: 'TOP_PRODUCTS_REPORT_ERROR', details: error.message },
    });
  }
}

/**
 * Financial Summary Report
 * Overall financial metrics
 */
async function getFinancialSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const establishmentId = req.user.establishment_id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
        error: { code: 'MISSING_PARAMETERS', details: null },
      });
    }

    // Get revenue
    const revenueQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM financial_entries
      WHERE establishment_id = :establishmentId
        AND date >= :startDate
        AND date <= :endDate
        AND deleted_at IS NULL
    `;

    // Get expenses
    const expensesQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM financial_exits
      WHERE establishment_id = :establishmentId
        AND date >= :startDate
        AND date <= :endDate
        AND deleted_at IS NULL
    `;

    const [revenueResult] = await sequelize.query(revenueQuery, {
      replacements: { establishmentId, startDate, endDate },
      type: QueryTypes.SELECT,
    });

    const [expensesResult] = await sequelize.query(expensesQuery, {
      replacements: { establishmentId, startDate, endDate },
      type: QueryTypes.SELECT,
    });

    const totalRevenue = parseFloat(revenueResult.total_revenue || 0);
    const totalExpenses = parseFloat(expensesResult.total_expenses || 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: profitMargin.toFixed(2),
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    logger.error('[Reports] Financial summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating financial summary',
      error: { code: 'FINANCIAL_SUMMARY_ERROR', details: error.message },
    });
  }
}

module.exports = {
  getRevenueByPeriod,
  getCommissionByProfessional,
  getTopServices,
  getTopProducts,
  getFinancialSummary,
};
