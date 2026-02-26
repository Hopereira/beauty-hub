/**
 * Supplier Service
 */

const { NotFoundError } = require('../../shared/errors');

class SupplierService {
  constructor(repository) {
    this.repository = repository;
  }

  async create(tenantId, data) {
    return this.repository.create(tenantId, { ...data, tenant_id: tenantId });
  }

  async update(tenantId, id, data) {
    const supplier = await this.repository.findById(tenantId, id);
    if (!supplier) throw new NotFoundError('Supplier not found');
    return this.repository.update(tenantId, id, data);
  }

  async getById(tenantId, id) {
    const supplier = await this.repository.findById(tenantId, id);
    if (!supplier) throw new NotFoundError('Supplier not found');
    return supplier;
  }

  async getAll(tenantId, filters = {}) {
    return this.repository.findAllWithFilters(tenantId, filters);
  }

  async delete(tenantId, id) {
    const supplier = await this.repository.findById(tenantId, id);
    if (!supplier) throw new NotFoundError('Supplier not found');
    return this.repository.delete(tenantId, id);
  }
}

module.exports = SupplierService;
