/**
 * Owner Reports Service
 * Business logic with strict tenant isolation using tenant_id
 */

const { QueryTypes } = require('sequelize');

class OwnerReportsService {
  constructor(sequelize) {
    this.sequelize = sequelize;
  }

  async getRevenueByPeriod(tenantId, filters) {
    const { startDate, endDate, groupBy = 'day' } = filters;

    const query = `
      SELECT 
        DATE(date) as period,
        SUM(amount) as total_revenue,
        COUNT(*) as transaction_count
      FROM financial_entries
      WHERE tenant_id = :tenantId
        AND date >= :startDate
        AND date <= :endDate
        AND deleted_at IS NULL
      GROUP BY DATE(date)
      ORDER BY period ASC
    `;

    const results = await this.sequelize.query(query, {
      replacements: { tenantId, startDate, endDate },
      type: QueryTypes.SELECT,
    });

    return {
      data: results,
      meta: {
        startDate,
        endDate,
        totalRevenue: results.reduce((sum, r) => sum + parseFloat(r.total_revenue || 0), 0),
        totalTransactions: results.reduce((sum, r) => sum + parseInt(r.transaction_count || 0), 0),
      },
    };
  }

  async getCommissionByProfessional(tenantId, filters) {
    const { startDate, endDate } = filters;

    const query = `
      SELECT 
        p.id as professional_id,
        u.first_name || ' ' || u.last_name as professional_name,
        COUNT(a.id) as total_appointments,
        SUM(a.price_charged) as total_revenue,
        SUM(a.price_charged * COALESCE(p.commission_rate, 0) / 100) as total_commission
      FROM professionals p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN appointments a ON a.professional_id = p.id 
        AND a.start_time >= :startDate 
        AND a.start_time <= :endDate
        AND a.tenant_id = :tenantId
        AND a.deleted_at IS NULL
      WHERE p.tenant_id = :tenantId
        AND p.deleted_at IS NULL
      GROUP BY p.id, u.first_name, u.last_name
      ORDER BY total_revenue DESC
    `;

    const results = await this.sequelize.query(query, {
      replacements: { tenantId, startDate, endDate },
      type: QueryTypes.SELECT,
    });

    return {
      data: results,
      meta: {
        startDate,
        endDate,
        totalCommission: results.reduce((sum, r) => sum + parseFloat(r.total_commission || 0), 0),
      },
    };
  }

  async getTopServices(tenantId, filters) {
    const { startDate, endDate, limit = 10 } = filters;

    const query = `
      SELECT 
        s.id as service_id,
        s.name as service_name,
        s.category,
        COUNT(a.id) as times_sold,
        SUM(a.price_charged) as total_revenue,
        AVG(a.price_charged) as average_price
      FROM services s
      LEFT JOIN appointments a ON a.service_id = s.id 
        AND a.start_time >= :startDate 
        AND a.start_time <= :endDate
        AND a.tenant_id = :tenantId
        AND a.deleted_at IS NULL
      WHERE s.tenant_id = :tenantId
        AND s.deleted_at IS NULL
      GROUP BY s.id, s.name, s.category
      ORDER BY total_revenue DESC
      LIMIT :limit
    `;

    const results = await this.sequelize.query(query, {
      replacements: { tenantId, startDate, endDate, limit: parseInt(limit) },
      type: QueryTypes.SELECT,
    });

    return {
      data: results,
      meta: {
        startDate,
        endDate,
        totalServices: results.length,
      },
    };
  }

  async getTopProducts(tenantId, filters) {
    const { startDate, endDate, limit = 10 } = filters;

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
        AND im.movement_date >= :startDate 
        AND im.movement_date <= :endDate
        AND im.tenant_id = :tenantId
        AND im.movement_type = 'OUT'
      WHERE p.tenant_id = :tenantId
        AND p.deleted_at IS NULL
      GROUP BY p.id, p.name, p.category, p.stock_quantity, p.sale_price
      ORDER BY total_used DESC
      LIMIT :limit
    `;

    const results = await this.sequelize.query(query, {
      replacements: { tenantId, startDate, endDate, limit: parseInt(limit) },
      type: QueryTypes.SELECT,
    });

    return {
      data: results,
      meta: {
        startDate,
        endDate,
        totalProducts: results.length,
      },
    };
  }

  async getFinancialSummary(tenantId, filters) {
    const { startDate, endDate } = filters;

    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'ENTRY' THEN amount ELSE 0 END), 0) as total_entries,
        COALESCE(SUM(CASE WHEN type = 'EXIT' THEN amount ELSE 0 END), 0) as total_exits,
        COALESCE(SUM(CASE WHEN type = 'ENTRY' THEN amount ELSE -amount END), 0) as net_profit
      FROM (
        SELECT amount, 'ENTRY' as type FROM financial_entries 
        WHERE tenant_id = :tenantId 
          AND entry_date >= :startDate 
          AND entry_date <= :endDate
          AND status = 'PAID'
          AND deleted_at IS NULL
        UNION ALL
        SELECT amount, 'EXIT' as type FROM financial_exits 
        WHERE tenant_id = :tenantId 
          AND exit_date >= :startDate 
          AND exit_date <= :endDate
          AND status = 'PAID'
          AND deleted_at IS NULL
      ) combined
    `;

    const results = await this.sequelize.query(query, {
      replacements: { tenantId, startDate, endDate },
      type: QueryTypes.SELECT,
    });

    const summary = results[0] || { total_entries: 0, total_exits: 0, net_profit: 0 };

    return {
      totalEntries: Number(summary.total_entries),
      totalExits: Number(summary.total_exits),
      netProfit: Number(summary.net_profit),
      startDate,
      endDate,
    };
  }
}

module.exports = OwnerReportsService;
