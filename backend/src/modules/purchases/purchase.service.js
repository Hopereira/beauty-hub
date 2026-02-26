/**
 * Purchase Service
 * Handles purchase creation with automatic stock update
 */

const { NotFoundError, ValidationError } = require('../../shared/errors');

class PurchaseService {
  constructor(repository, models) {
    this.repository = repository;
    this.models = models;
  }

  /**
   * Create purchase with items and update stock
   */
  async create(tenantId, data, userId) {
    const { supplier_id, items, payment_method, payment_status, notes } = data;

    // Validate supplier
    const supplier = await this.models.Supplier.findOne({
      where: { id: supplier_id, tenant_id: tenantId },
    });
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new ValidationError('Purchase must have at least one item');
    }

    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += parseFloat(item.unit_cost) * parseInt(item.quantity);
    }

    // Create purchase
    const purchase = await this.models.Purchase.create({
      tenant_id: tenantId,
      supplier_id,
      total_amount: totalAmount,
      purchase_date: new Date(),
      payment_method,
      payment_status: payment_status || 'PENDING',
      notes,
    });

    // Create items and update stock
    for (const item of items) {
      const product = await this.models.Product.findOne({
        where: { id: item.product_id, tenant_id: tenantId },
      });

      if (!product) {
        throw new NotFoundError(`Product ${item.product_id} not found`);
      }

      // Create purchase item
      await this.models.PurchaseItem.create({
        tenant_id: tenantId,
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: parseFloat(item.unit_cost) * parseInt(item.quantity),
      });

      // Update product stock
      const previousStock = product.stock_quantity;
      const newStock = previousStock + parseInt(item.quantity);
      await product.update({ stock_quantity: newStock });

      // Create inventory movement
      await this.models.InventoryMovement.create({
        tenant_id: tenantId,
        product_id: item.product_id,
        type: 'ENTRY',
        quantity: item.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reference_type: 'PURCHASE',
        reference_id: purchase.id,
        movement_date: new Date(),
        notes: `Purchase from ${supplier.name}`,
      });
    }

    // Return purchase with items
    return this.repository.findById(tenantId, purchase.id, {
      include: [
        {
          model: this.models.Supplier,
          as: 'supplier',
        },
        {
          model: this.models.PurchaseItem,
          as: 'items',
          include: [
            {
              model: this.models.Product,
              as: 'product',
            },
          ],
        },
      ],
    });
  }

  async getById(tenantId, id) {
    const purchase = await this.repository.findById(tenantId, id, {
      include: [
        {
          model: this.models.Supplier,
          as: 'supplier',
        },
        {
          model: this.models.PurchaseItem,
          as: 'items',
          include: [
            {
              model: this.models.Product,
              as: 'product',
            },
          ],
        },
      ],
    });

    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    return purchase;
  }

  async getAll(tenantId, filters = {}) {
    return this.repository.findAllWithFilters(tenantId, filters);
  }

  async delete(tenantId, id) {
    const purchase = await this.repository.findById(tenantId, id);
    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    return this.repository.delete(tenantId, id);
  }
}

module.exports = PurchaseService;
