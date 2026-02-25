/**
 * Invoice Model
 * Represents billing invoices for subscriptions
 */

const { DataTypes } = require('sequelize');
const { INVOICE_STATUS } = require('../../shared/constants');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // References
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id',
      },
    },

    // Invoice number
    number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    // Status
    status: {
      type: DataTypes.ENUM(...Object.values(INVOICE_STATUS)),
      allowNull: false,
      defaultValue: INVOICE_STATUS.DRAFT,
    },

    // Amounts
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amount_due: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'BRL',
    },

    // Dates
    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Period
    period_start: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    period_end: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    // Line items
    items: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      // Structure: [{ description, quantity, unit_price, total }]
    },

    // Payment info
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    payment_reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Stripe integration
    stripe_invoice_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    stripe_payment_intent_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    hosted_invoice_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pdf_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Notes
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  }, {
    tableName: 'invoices',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['subscription_id'] },
      { fields: ['number'], unique: true },
      { fields: ['status'] },
      { fields: ['due_date'] },
      { fields: ['issue_date'] },
      { fields: ['stripe_invoice_id'] },
    ],
    hooks: {
      beforeValidate: (invoice) => {
        // Calculate amount_due
        invoice.amount_due = parseFloat(invoice.total) - parseFloat(invoice.amount_paid);
      },
    },
  });

  // Instance methods
  Invoice.prototype.isPaid = function() {
    return this.status === INVOICE_STATUS.PAID;
  };

  Invoice.prototype.isOverdue = function() {
    if (this.status === INVOICE_STATUS.OVERDUE) return true;
    if ([INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED].includes(this.status)) return false;
    return new Date(this.due_date) < new Date();
  };

  Invoice.prototype.markAsPaid = async function(paymentReference = null) {
    this.status = INVOICE_STATUS.PAID;
    this.paid_at = new Date();
    this.amount_paid = this.total;
    this.amount_due = 0;
    if (paymentReference) {
      this.payment_reference = paymentReference;
    }
    return this.save();
  };

  Invoice.prototype.addItem = function(item) {
    const items = [...this.items];
    items.push({
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.unit_price,
      total: (item.quantity || 1) * item.unit_price,
    });
    this.items = items;
    this._recalculateTotals();
  };

  Invoice.prototype._recalculateTotals = function() {
    const subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    this.subtotal = subtotal;
    this.total = subtotal - parseFloat(this.discount) + parseFloat(this.tax);
    this.amount_due = this.total - parseFloat(this.amount_paid);
  };

  // Class methods
  Invoice.generateNumber = async function() {
    const year = new Date().getFullYear();
    const count = await this.count({
      where: sequelize.where(
        sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM created_at')),
        year
      ),
    });
    return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  };

  return Invoice;
};
