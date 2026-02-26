/**
 * Payment Transaction Service
 * Handles payment processing with automatic split calculation
 */

const { NotFoundError, ValidationError } = require('../../shared/errors');

class PaymentTransactionService {
  constructor(repository, models) {
    this.repository = repository;
    this.models = models;
  }

  /**
   * Calculate split amounts based on commission
   */
  calculateSplit(totalAmount, commissionPercentage, gatewayFee = 0) {
    const professionalPercentage = parseFloat(commissionPercentage);
    const salonPercentage = 100 - professionalPercentage;

    const professionalAmount = (totalAmount * professionalPercentage) / 100;
    const salonAmount = (totalAmount * salonPercentage) / 100;
    const netAmount = totalAmount - gatewayFee;

    return {
      salon_percentage: salonPercentage,
      professional_percentage: professionalPercentage,
      salon_amount: salonAmount,
      professional_amount: professionalAmount,
      gateway_fee: gatewayFee,
      net_amount: netAmount,
    };
  }

  /**
   * Get commission percentage for professional and service
   */
  async getCommissionPercentage(tenantId, professionalId, serviceId) {
    // Check for custom commission for this professional-service combination
    const customCommission = await this.models.ProfessionalServiceCommission.findOne({
      where: {
        tenant_id: tenantId,
        professional_id: professionalId,
        service_id: serviceId,
      },
    });

    if (customCommission) {
      return parseFloat(customCommission.commission_percentage);
    }

    // Use professional's base commission
    const professional = await this.models.ProfessionalDetail.findOne({
      where: {
        id: professionalId,
        tenant_id: tenantId,
      },
    });

    if (!professional) {
      throw new NotFoundError('Professional not found');
    }

    return parseFloat(professional.base_commission_percentage);
  }

  /**
   * Create payment transaction with automatic split
   */
  async create(tenantId, data, userId) {
    const {
      appointment_id,
      client_id,
      professional_id,
      service_id,
      total_amount,
      payment_method,
      gateway_fee = 0,
      notes,
    } = data;

    // Validate entities exist
    const [client, professional, service] = await Promise.all([
      this.models.Client.findOne({ where: { id: client_id, tenant_id: tenantId } }),
      this.models.ProfessionalDetail.findOne({ where: { id: professional_id, tenant_id: tenantId } }),
      this.models.Service.findOne({ where: { id: service_id, tenant_id: tenantId } }),
    ]);

    if (!client) throw new NotFoundError('Client not found');
    if (!professional) throw new NotFoundError('Professional not found');
    if (!service) throw new NotFoundError('Service not found');

    // Get commission percentage
    const commissionPercentage = await this.getCommissionPercentage(
      tenantId,
      professional_id,
      service_id
    );

    // Calculate split
    const split = this.calculateSplit(total_amount, commissionPercentage, gateway_fee);

    // Create transaction
    const transaction = await this.models.PaymentTransaction.create({
      tenant_id: tenantId,
      appointment_id,
      client_id,
      professional_id,
      service_id,
      total_amount,
      ...split,
      payment_method,
      payment_status: 'PAID',
      paid_at: new Date(),
      notes,
    });

    return this.repository.findById(tenantId, transaction.id, {
      include: [
        {
          model: this.models.Client,
          as: 'client',
        },
        {
          model: this.models.ProfessionalDetail,
          as: 'professional',
          include: [
            {
              model: this.models.User,
              as: 'user',
            },
          ],
        },
        {
          model: this.models.Service,
          as: 'service',
        },
      ],
    });
  }

  async getById(tenantId, id) {
    const transaction = await this.repository.findById(tenantId, id, {
      include: [
        {
          model: this.models.Client,
          as: 'client',
        },
        {
          model: this.models.ProfessionalDetail,
          as: 'professional',
          include: [
            {
              model: this.models.User,
              as: 'user',
            },
          ],
        },
        {
          model: this.models.Service,
          as: 'service',
        },
        {
          model: this.models.Appointment,
          as: 'appointment',
        },
      ],
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return transaction;
  }

  async getAll(tenantId, filters = {}) {
    return this.repository.findAllWithFilters(tenantId, filters);
  }

  async getRevenueStats(tenantId, startDate, endDate) {
    return this.repository.getRevenueStats(tenantId, startDate, endDate);
  }

  async getRevenueByProfessional(tenantId, startDate, endDate) {
    return this.repository.getRevenueByProfessional(tenantId, startDate, endDate);
  }

  async getTopServices(tenantId, startDate, endDate, limit = 10) {
    return this.repository.getTopServices(tenantId, startDate, endDate, limit);
  }

  async delete(tenantId, id) {
    const transaction = await this.repository.findById(tenantId, id);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return this.repository.delete(tenantId, id);
  }
}

module.exports = PaymentTransactionService;
