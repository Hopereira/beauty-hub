/**
 * Billing Audit Service
 * Logs all billing-related actions for compliance and debugging
 */

const { v4: uuidv4 } = require('uuid');

class BillingAuditService {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.tableName = 'billing_audit_logs';
  }

  /**
   * Log a billing action
   */
  async log(data) {
    const {
      action,
      tenantId,
      userId,
      entityType,
      entityId,
      oldValues,
      newValues,
      metadata,
      ipAddress,
      userAgent,
    } = data;

    try {
      await this.sequelize.query(`
        INSERT INTO ${this.tableName} 
        (id, tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, metadata, ip_address, user_agent, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, {
        bind: [
          uuidv4(),
          tenantId || null,
          userId || null,
          action,
          entityType,
          entityId || null,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          metadata ? JSON.stringify(metadata) : null,
          ipAddress || null,
          userAgent || null,
        ],
        type: this.sequelize.QueryTypes.INSERT,
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('Failed to log audit entry:', error.message);
    }
  }

  /**
   * Get audit logs for an entity
   */
  async getByEntity(entityType, entityId, options = {}) {
    const [logs] = await this.sequelize.query(`
      SELECT * FROM ${this.tableName}
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `, {
      bind: [
        entityType,
        entityId,
        options.limit || 50,
        options.offset || 0,
      ],
      type: this.sequelize.QueryTypes.SELECT,
    });

    return logs;
  }

  /**
   * Get audit logs for a tenant
   */
  async getByTenant(tenantId, options = {}) {
    const whereClause = ['tenant_id = $1'];
    const binds = [tenantId];
    let bindIndex = 2;

    if (options.action) {
      whereClause.push(`action = $${bindIndex}`);
      binds.push(options.action);
      bindIndex++;
    }

    if (options.startDate) {
      whereClause.push(`created_at >= $${bindIndex}`);
      binds.push(options.startDate);
      bindIndex++;
    }

    if (options.endDate) {
      whereClause.push(`created_at <= $${bindIndex}`);
      binds.push(options.endDate);
      bindIndex++;
    }

    binds.push(options.limit || 100);
    binds.push(options.offset || 0);

    const [logs] = await this.sequelize.query(`
      SELECT * FROM ${this.tableName}
      WHERE ${whereClause.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${bindIndex} OFFSET $${bindIndex + 1}
    `, {
      bind: binds,
      type: this.sequelize.QueryTypes.SELECT,
    });

    return logs;
  }

  /**
   * Get all audit logs (MASTER)
   */
  async getAll(options = {}) {
    const whereClause = [];
    const binds = [];
    let bindIndex = 1;

    if (options.action) {
      whereClause.push(`action = $${bindIndex}`);
      binds.push(options.action);
      bindIndex++;
    }

    if (options.tenantId) {
      whereClause.push(`tenant_id = $${bindIndex}`);
      binds.push(options.tenantId);
      bindIndex++;
    }

    if (options.entityType) {
      whereClause.push(`entity_type = $${bindIndex}`);
      binds.push(options.entityType);
      bindIndex++;
    }

    if (options.startDate) {
      whereClause.push(`created_at >= $${bindIndex}`);
      binds.push(options.startDate);
      bindIndex++;
    }

    if (options.endDate) {
      whereClause.push(`created_at <= $${bindIndex}`);
      binds.push(options.endDate);
      bindIndex++;
    }

    binds.push(options.limit || 100);
    binds.push(options.offset || 0);

    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const [logs] = await this.sequelize.query(`
      SELECT * FROM ${this.tableName}
      ${whereStr}
      ORDER BY created_at DESC
      LIMIT $${bindIndex} OFFSET $${bindIndex + 1}
    `, {
      bind: binds,
      type: this.sequelize.QueryTypes.SELECT,
    });

    return logs;
  }
}

module.exports = BillingAuditService;
