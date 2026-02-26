/**
 * Professional Detail Repository
 * Data access layer for professional details
 */

const BaseRepository = require('../../shared/database/baseRepository');

class ProfessionalDetailRepository extends BaseRepository {
  constructor(models) {
    super(models.ProfessionalDetail);
    this.models = models;
  }

  /**
   * Find professional detail by user ID
   */
  async findByUserId(tenantId, userId) {
    return this.model.findOne({
      where: this._scopedWhere(tenantId, { user_id: userId }),
      include: [
        {
          model: this.models.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
        },
        {
          model: this.models.ProfessionalSpecialty,
          as: 'specialties',
          include: [
            {
              model: this.models.Service,
              as: 'service',
            },
          ],
        },
        {
          model: this.models.ProfessionalServiceCommission,
          as: 'commissions',
          include: [
            {
              model: this.models.Service,
              as: 'service',
            },
          ],
        },
      ],
    });
  }

  /**
   * Find all active professionals with filters
   */
  async findAllWithFilters(tenantId, filters = {}) {
    const where = this._scopedWhere(tenantId, {});

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.contract_type) {
      where.contract_type = filters.contract_type;
    }

    const include = [
      {
        model: this.models.User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
      },
      {
        model: this.models.ProfessionalSpecialty,
        as: 'specialties',
        include: [
          {
            model: this.models.Service,
            as: 'service',
          },
        ],
      },
    ];

    // Filter by specialty
    if (filters.specialty_id) {
      include[1].where = { service_id: filters.specialty_id };
      include[1].required = true;
    }

    return this.model.findAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    });
  }

  /**
   * Get professional statistics
   */
  async getStatistics(tenantId, professionalId, startDate, endDate) {
    const { PaymentTransaction } = this.models;

    const where = {
      tenant_id: tenantId,
      professional_id: professionalId,
      payment_status: 'PAID',
    };

    if (startDate && endDate) {
      where.paid_at = {
        [this.models.Sequelize.Op.between]: [startDate, endDate],
      };
    }

    const stats = await PaymentTransaction.findAll({
      where,
      attributes: [
        [this.models.Sequelize.fn('COUNT', this.models.Sequelize.col('id')), 'total_services'],
        [this.models.Sequelize.fn('SUM', this.models.Sequelize.col('total_amount')), 'total_revenue'],
        [this.models.Sequelize.fn('SUM', this.models.Sequelize.col('professional_amount')), 'total_commission'],
      ],
      raw: true,
    });

    return stats[0] || {
      total_services: 0,
      total_revenue: 0,
      total_commission: 0,
    };
  }
}

module.exports = ProfessionalDetailRepository;
