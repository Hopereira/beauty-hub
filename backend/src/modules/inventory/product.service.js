/**
 * Product Service
 * Business logic for product management
 */

const { NotFoundError, ValidationError } = require('../../shared/errors');

class ProductService {
  constructor(repository, inventoryMovementRepository, models) {
    this.repository = repository;
    this.inventoryMovementRepository = inventoryMovementRepository;
    this.models = models;
  }

  async create(tenantId, data) {
    return this.repository.create(tenantId, {
      ...data,
      tenant_id: tenantId,
    });
  }

  async update(tenantId, id, data) {
    const product = await this.repository.findById(tenantId, id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this.repository.update(tenantId, id, data);
  }

  async getById(tenantId, id) {
    const product = await this.repository.findById(tenantId, id, {
      include: [
        {
          model: this.models.Supplier,
          as: 'supplier',
        },
      ],
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  async getAll(tenantId, filters = {}) {
    return this.repository.findAllWithFilters(tenantId, filters);
  }

  async delete(tenantId, id) {
    const product = await this.repository.findById(tenantId, id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this.repository.delete(tenantId, id);
  }

  /**
   * Adjust stock manually
   */
  async adjustStock(tenantId, productId, quantity, notes, userId) {
    const product = await this.repository.findById(tenantId, productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const previousStock = product.stock_quantity;
    const newStock = previousStock + quantity;

    if (newStock < 0) {
      throw new ValidationError('Stock cannot be negative');
    }

    // Update product stock
    await product.update({ stock_quantity: newStock });

    // Create inventory movement
    await this.models.InventoryMovement.create({
      tenant_id: tenantId,
      product_id: productId,
      type: 'ADJUSTMENT',
      quantity: Math.abs(quantity),
      previous_stock: previousStock,
      new_stock: newStock,
      reference_type: 'MANUAL',
      movement_date: new Date(),
      notes,
    });

    return {
      product,
      previous_stock: previousStock,
      new_stock: newStock,
    };
  }
}

module.exports = ProductService;
