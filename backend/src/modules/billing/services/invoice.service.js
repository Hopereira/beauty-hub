/**
 * Invoice Service
 * Business logic for invoice management
 */

const { Op } = require('sequelize');
const { INVOICE_STATUS, BILLING_AUDIT_ACTIONS } = require('../../../shared/constants');
const { NotFoundError, ValidationError } = require('../../../shared/errors');

class InvoiceService {
  constructor(models, auditService = null) {
    this.Invoice = models.Invoice;
    this.Subscription = models.Subscription;
    this.Tenant = models.Tenant;
    this.auditService = auditService;
  }

  /**
   * Get invoice by ID
   */
  async getById(invoiceId, tenantId = null) {
    const where = { id: invoiceId };
    if (tenantId) {
      where.tenant_id = tenantId;
    }

    const invoice = await this.Invoice.findOne({
      where,
      include: [{ model: this.Subscription, as: 'subscription' }],
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    return this._formatInvoiceResponse(invoice);
  }

  /**
   * Get invoices for a tenant
   */
  async getByTenantId(tenantId, filters = {}) {
    const where = { tenant_id: tenantId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      where.issue_date = {
        [Op.between]: [filters.startDate, filters.endDate],
      };
    }

    const invoices = await this.Invoice.findAll({
      where,
      order: [['issue_date', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return invoices.map(inv => this._formatInvoiceResponse(inv));
  }

  /**
   * Create invoice
   */
  async createInvoice(data) {
    const invoice = await this.Invoice.create({
      tenant_id: data.tenantId,
      subscription_id: data.subscriptionId,
      number: data.number || this._generateInvoiceNumber(),
      status: data.status || INVOICE_STATUS.PENDING,
      subtotal: data.subtotal,
      discount: data.discount || 0,
      tax: data.tax || 0,
      total: data.total || data.subtotal,
      amount_due: data.amountDue || data.total || data.subtotal,
      currency: data.currency || 'BRL',
      billing_cycle: data.billingCycle,
      payment_method: data.paymentMethod,
      issue_date: data.issueDate || new Date(),
      due_date: data.dueDate,
      period_start: data.periodStart,
      period_end: data.periodEnd,
      items: data.items || [],
      gateway_provider: data.gatewayProvider,
      gateway_invoice_id: data.gatewayInvoiceId,
      notes: data.notes,
      metadata: data.metadata || {},
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.INVOICE_CREATED,
        tenantId: data.tenantId,
        entityType: 'invoice',
        entityId: invoice.id,
        newValues: { number: invoice.number, total: invoice.total },
      });
    }

    return this._formatInvoiceResponse(invoice);
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId, paymentData = {}) {
    const invoice = await this.Invoice.findByPk(invoiceId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status === INVOICE_STATUS.PAID) {
      throw new ValidationError('Invoice is already paid');
    }

    const oldValues = invoice.toJSON();

    await invoice.update({
      status: INVOICE_STATUS.PAID,
      paid_at: paymentData.paidAt || new Date(),
      amount_paid: invoice.total,
      amount_due: 0,
      payment_reference: paymentData.reference,
      gateway_payment_id: paymentData.gatewayPaymentId,
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.INVOICE_PAID,
        tenantId: invoice.tenant_id,
        entityType: 'invoice',
        entityId: invoice.id,
        oldValues,
        newValues: invoice.toJSON(),
      });
    }

    return this._formatInvoiceResponse(invoice);
  }

  /**
   * Mark invoice as overdue
   */
  async markAsOverdue(invoiceId) {
    const invoice = await this.Invoice.findByPk(invoiceId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status !== INVOICE_STATUS.PENDING) {
      return this._formatInvoiceResponse(invoice);
    }

    const oldValues = invoice.toJSON();

    await invoice.update({
      status: INVOICE_STATUS.OVERDUE,
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.log({
        action: BILLING_AUDIT_ACTIONS.INVOICE_OVERDUE,
        tenantId: invoice.tenant_id,
        entityType: 'invoice',
        entityId: invoice.id,
        oldValues,
        newValues: invoice.toJSON(),
      });
    }

    return this._formatInvoiceResponse(invoice);
  }

  /**
   * Record payment attempt
   */
  async recordPaymentAttempt(invoiceId, result) {
    const invoice = await this.Invoice.findByPk(invoiceId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    await invoice.update({
      attempt_count: invoice.attempt_count + 1,
      last_attempt_at: new Date(),
      failure_reason: result.success ? null : result.reason,
    });

    return this._formatInvoiceResponse(invoice);
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices() {
    const invoices = await this.Invoice.findAll({
      where: {
        status: INVOICE_STATUS.PENDING,
        due_date: {
          [Op.lt]: new Date(),
        },
      },
      include: [
        { model: this.Subscription, as: 'subscription' },
        { model: this.Tenant, as: 'tenant', attributes: ['id', 'name', 'slug'] },
      ],
    });

    return invoices.map(inv => this._formatInvoiceResponse(inv, true));
  }

  /**
   * Get invoices due soon (for reminder notifications)
   */
  async getInvoicesDueSoon(daysAhead = 3) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const invoices = await this.Invoice.findAll({
      where: {
        status: INVOICE_STATUS.PENDING,
        due_date: {
          [Op.between]: [new Date(), futureDate],
        },
      },
      include: [
        { model: this.Subscription, as: 'subscription' },
        { model: this.Tenant, as: 'tenant', attributes: ['id', 'name', 'slug', 'owner_email'] },
      ],
    });

    return invoices.map(inv => this._formatInvoiceResponse(inv, true));
  }

  /**
   * Get all invoices (MASTER)
   */
  async getAllInvoices(filters = {}) {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tenantId) {
      where.tenant_id = filters.tenantId;
    }

    if (filters.startDate && filters.endDate) {
      where.issue_date = {
        [Op.between]: [filters.startDate, filters.endDate],
      };
    }

    const invoices = await this.Invoice.findAll({
      where,
      include: [
        { model: this.Tenant, as: 'tenant', attributes: ['id', 'name', 'slug'] },
      ],
      order: [['issue_date', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    });

    return invoices.map(inv => this._formatInvoiceResponse(inv, true));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  _formatInvoiceResponse(invoice, includeInternal = false) {
    const response = {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amounts: {
        subtotal: parseFloat(invoice.subtotal || 0),
        discount: parseFloat(invoice.discount || 0),
        tax: parseFloat(invoice.tax || 0),
        total: parseFloat(invoice.total || 0),
        paid: parseFloat(invoice.amount_paid || 0),
        due: parseFloat(invoice.amount_due || 0),
      },
      currency: invoice.currency,
      billingCycle: invoice.billing_cycle,
      paymentMethod: invoice.payment_method,
      dates: {
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        paidAt: invoice.paid_at,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
      },
      items: invoice.items || [],
      urls: {
        hosted: invoice.hosted_invoice_url,
        pdf: invoice.pdf_url,
      },
    };

    if (invoice.pix_qr_code) {
      response.pix = {
        qrCode: invoice.pix_qr_code,
        qrCodeBase64: invoice.pix_qr_code_base64,
        expiration: invoice.pix_expiration,
      };
    }

    if (includeInternal) {
      response.tenantId = invoice.tenant_id;
      response.subscriptionId = invoice.subscription_id;
      response.gatewayProvider = invoice.gateway_provider;
      response.gatewayInvoiceId = invoice.gateway_invoice_id;
      response.attemptCount = invoice.attempt_count;
      response.lastAttemptAt = invoice.last_attempt_at;
      response.failureReason = invoice.failure_reason;
      response.notes = invoice.notes;
      response.metadata = invoice.metadata;
      response.createdAt = invoice.created_at;
      response.updatedAt = invoice.updated_at;

      if (invoice.tenant) {
        response.tenant = {
          id: invoice.tenant.id,
          name: invoice.tenant.name,
          slug: invoice.tenant.slug,
        };
      }
    }

    return response;
  }

  _generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${year}${month}-${random}`;
  }
}

module.exports = InvoiceService;
