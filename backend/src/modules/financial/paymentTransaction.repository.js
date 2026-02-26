/**
 * Payment Transaction Repository
 */

const BaseRepository = require('../../shared/database/baseRepository');
const { Op } = require('sequelize');

class PaymentTransactionRepository extends BaseRepository {
  constructor(models) {
    super(models.PaymentTransaction);
    this.models = models;
  }

  async findAllWithFilters(tenantId, filters = {}) {
    const where = this._scopedWhere(tenantId, {});

    if (filters.professional_id) {
      where.professional_id = filters.professional_id;
    }

    if (filters.service_id) {
      where.service_id = filters.service_id;
    }

    if (filters.client_id) {
      where.client_id = filters.client_id;
    }

    if (filters.payment_method) {
      where.payment_method = filters.payment_method;
    }

    if (filters.payment_status) {
      where.payment_status = filters.payment_status;
    }

    if (filters.startDate && filters.endDate) {
      where.paid_at = {
        [Op.between]: [filters.startDate, filters.endDate],
      };
    }

    return this.model.findAll({
      where,
      include: [
        {
          model: this.models.Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'phone'],
        },
        {
          model: this.models.ProfessionalDetail,
          as: 'professional',
          include: [
            {
              model: this.models.User,
              as: 'user',
              attributes: ['id', 'first_name', 'last_name'],
            },
          ],
        },
        {
          model: this.models.Service,
          as: 'service',
          attributes: ['id', 'name', 'price'],
        },
        {
          model: this.models.Appointment,
          as: 'appointment',
          attributes: ['id', 'start_time', 'end_time', 'status'],
        },
      ],
      order: [['paid_at', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    });
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(tenantId, startDate, endDate) {
    const where = {
      tenant_id: tenantId,
      payment_status: 'PAID',
    };

    if (startDate && endDate) {
      where.paid_at = {
        [Op.between]: [startDate, endDate],
      };
    }

    const stats = await this.model.findAll({
      where,
      attributes: [
        [this.models.Sequelize.fn('COUNT', this.models.Sequelize.col('id')), 'total_transactions'],
        [this.models.Sequelize.fn('SUM', this.models.Sequelize.col('total_amount')), 'total_revenue'],
        [this.models.Sequelize.fn('SUM', this.models.Sequelize.col('salon_amount')), 'salon_revenue'],
        [this.models.Sequelize.fn('SUM', this.models.Sequelize.col('professional_amount')), 'professional_commission'],
        [this.models.Sequelize.fn('SUM', this.models.Sequelize.col('gateway_fee')), 'total_fees'],
      ],
      raw: true,
    });

    return stats[0] || {
      total_transactions: 0,
      total_revenue: 0,
      salon_revenue: 0,
      professional_commission: 0,
      total_fees: 0,
    };
  }

  /**
   * Get revenue by professional
   */
  async getRevenueByProfessional(tenantId, startDate, endDate) {
    const where = {
      tenant_id: tenantId,
      payment_status: 'PAID',
    };

    if (startDate && endDate) {
      where.paid_at = {
        [Op.between]: [startDate, endDate],
      };
    }

    return this.model.findAll({
      where,
      attributes: [
        'professional_id',
        [this.models.Sequelize.fn('COUNT', this.models.Sequelize.col('PaymentTransaction.id')), 'total_services'],
        [this.models.Sequelize.fn('SUM', this.models.Sequelize.col('total_amount')), 'total_revenue'],
        [this.models.Sequelize.fn('SUM', this.models.Sequelize.col('professional_amount')), 'total_commission'],
      ],
      include: [
        {
          model: this.models.ProfessionalDetail,
          as: 'professional',
          include: [
            {
              model: this.models.User,
              as: 'user',
              attributes: ['id', 'first_name', 'last_name'],
            },
          ],
        },
      ],
      group: ['professional_id', 'professional.id', 'professional.user.id'],
      raw: false,
    });
  }

  /**
   * Get top services
   */
  async getTopServices(tenantId, startDate, endDate, limit = 10) {
    const where = {
      tenant_id: tenantId,
      payment_status: 'PAID',
    };

    if (startDate && endDate) {
      where.paid_at = {
        [Op.between]: [startDate, endDate],
      };
    }

    return this.model.findAll({
      where,
      attributes: [
        'service_id',
        [this.models.Sequelize.fn('COUNT', this.models.Sequelize.col('PaymentTransaction.id')), 'total_count'],
        [this.models.Sequelize.fn('SUM', this.models.Sequelize.col('total_amount')), 'total_revenue'],
      ],
      include: [
        {
          model: this.models.Service,
          as: 'service',
          attributes: ['id', 'name', 'price'],
        },
      ],
      group: ['service_id', 'service.id'],
      order: [[this.models.Sequelize.literal('total_count'), 'DESC']],
      limit,
      raw: false,
    });
  }
}

module.exports = PaymentTransactionRepository;
