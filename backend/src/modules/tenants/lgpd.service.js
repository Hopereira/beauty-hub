/**
 * LGPD Compliance Service
 * Handles data export, deletion, anonymization, and retention policies
 */

const { v4: uuidv4 } = require('uuid');

class LGPDService {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.tableName = 'data_retention_logs';
    
    // Configuration
    this.DEFAULT_RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS) || 365;
    this.ANONYMIZATION_DELAY_DAYS = 30; // Days after deletion request before anonymization
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA EXPORT (Right to Portability)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Export all user data (LGPD Article 18)
   */
  async exportUserData(tenantId, userId, requestedBy) {
    // Log the request
    await this._logAction({
      action: 'data_export_requested',
      tenantId,
      userId,
      requestedBy,
    });

    // Collect all user data
    const userData = {
      exportedAt: new Date().toISOString(),
      requestedBy,
      user: await this._getUserData(tenantId, userId),
      appointments: await this._getUserAppointments(tenantId, userId),
      financialData: await this._getUserFinancialData(tenantId, userId),
      notifications: await this._getUserNotifications(tenantId, userId),
    };

    // Log completion
    await this._logAction({
      action: 'data_export_completed',
      tenantId,
      userId,
      requestedBy,
      details: { recordCount: this._countRecords(userData) },
    });

    return userData;
  }

  /**
   * Export all tenant data
   */
  async exportTenantData(tenantId, requestedBy) {
    await this._logAction({
      action: 'data_export_requested',
      tenantId,
      requestedBy,
      entityType: 'tenant',
      entityId: tenantId,
    });

    const tenantData = {
      exportedAt: new Date().toISOString(),
      tenant: await this._getTenantData(tenantId),
      users: await this._getAllTenantUsers(tenantId),
      clients: await this._getAllTenantClients(tenantId),
      professionals: await this._getAllTenantProfessionals(tenantId),
      appointments: await this._getAllTenantAppointments(tenantId),
      financial: await this._getAllTenantFinancial(tenantId),
      subscriptions: await this._getTenantSubscriptions(tenantId),
      invoices: await this._getTenantInvoices(tenantId),
    };

    // Update tenant
    await this.sequelize.query(`
      UPDATE tenants SET data_exported_at = NOW() WHERE id = $1
    `, { bind: [tenantId] });

    await this._logAction({
      action: 'data_export_completed',
      tenantId,
      requestedBy,
      entityType: 'tenant',
      entityId: tenantId,
      details: { recordCount: this._countRecords(tenantData) },
    });

    return tenantData;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA DELETION (Right to be Forgotten)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Request data deletion for a user
   */
  async requestUserDeletion(tenantId, userId, requestedBy, reason = null) {
    await this._logAction({
      action: 'data_deletion_requested',
      tenantId,
      userId,
      requestedBy,
      details: { reason, scheduledFor: this._getScheduledDeletionDate() },
    });

    // Mark user for deletion
    await this.sequelize.query(`
      UPDATE users
      SET deleted_at = NOW(),
          is_active = false,
          metadata = COALESCE(metadata, '{}')::jsonb || $2
      WHERE id = $1
    `, {
      bind: [userId, JSON.stringify({
        deletion_requested_at: new Date().toISOString(),
        deletion_requested_by: requestedBy,
        deletion_reason: reason,
        scheduled_anonymization: this._getScheduledDeletionDate(),
      })],
    });

    return {
      success: true,
      message: 'Solicitação de exclusão registrada.',
      scheduledAnonymization: this._getScheduledDeletionDate(),
    };
  }

  /**
   * Request tenant data deletion (account cancellation)
   */
  async requestTenantDeletion(tenantId, requestedBy, reason = null) {
    const scheduledDate = this._getScheduledDeletionDate();

    await this._logAction({
      action: 'data_deletion_requested',
      tenantId,
      requestedBy,
      entityType: 'tenant',
      entityId: tenantId,
      details: { reason, scheduledFor: scheduledDate },
    });

    // Schedule tenant deletion
    await this.sequelize.query(`
      UPDATE tenants
      SET scheduled_deletion_at = $2,
          status = 'cancelled'
      WHERE id = $1
    `, { bind: [tenantId, scheduledDate] });

    return {
      success: true,
      message: 'Conta cancelada. Dados serão excluídos permanentemente após o período de retenção.',
      scheduledDeletion: scheduledDate,
      retentionDays: this.ANONYMIZATION_DELAY_DAYS,
    };
  }

  /**
   * Process scheduled deletions (run via cron job)
   */
  async processScheduledDeletions() {
    const results = {
      tenantsProcessed: 0,
      usersAnonymized: 0,
      errors: [],
    };

    // Get tenants scheduled for deletion
    const [tenants] = await this.sequelize.query(`
      SELECT id FROM tenants
      WHERE scheduled_deletion_at IS NOT NULL
        AND scheduled_deletion_at <= NOW()
        AND deleted_at IS NULL
    `, { type: this.sequelize.QueryTypes.SELECT });

    for (const tenant of tenants || []) {
      try {
        await this.anonymizeTenantData(tenant.id);
        results.tenantsProcessed++;
      } catch (error) {
        results.errors.push({ tenantId: tenant.id, error: error.message });
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA ANONYMIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Anonymize all tenant data
   */
  async anonymizeTenantData(tenantId) {
    const transaction = await this.sequelize.transaction();

    try {
      const anonymizedId = `anon_${uuidv4().substring(0, 8)}`;

      // Anonymize users
      await this.sequelize.query(`
        UPDATE users
        SET name = $2,
            email = CONCAT($2, '@deleted.local'),
            password = 'DELETED',
            phone = NULL,
            avatar = NULL
        WHERE tenant_id = $1
      `, { bind: [tenantId, anonymizedId], transaction });

      // Anonymize clients
      await this.sequelize.query(`
        UPDATE clients
        SET name = $2,
            email = NULL,
            phone = NULL,
            cpf = NULL,
            address = NULL,
            notes = NULL
        WHERE tenant_id = $1
      `, { bind: [tenantId, anonymizedId], transaction });

      // Anonymize tenant
      await this.sequelize.query(`
        UPDATE tenants
        SET name = $2,
            email = CONCAT($2, '@deleted.local'),
            phone = NULL,
            document = CONCAT('DEL', $2),
            address = '{}',
            branding = '{}',
            deleted_at = NOW()
        WHERE id = $1
      `, { bind: [tenantId, anonymizedId], transaction });

      await transaction.commit();

      await this._logAction({
        action: 'data_anonymized',
        tenantId,
        entityType: 'tenant',
        entityId: tenantId,
        details: { anonymizedId },
      });

      return { success: true, anonymizedId };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record user consent
   */
  async recordConsent(tenantId, userId, consentType, granted, ipAddress = null) {
    await this._logAction({
      action: granted ? 'consent_given' : 'consent_revoked',
      tenantId,
      userId,
      ipAddress,
      details: { consentType, granted },
    });

    // Update user metadata
    await this.sequelize.query(`
      UPDATE users
      SET metadata = COALESCE(metadata, '{}')::jsonb || $2
      WHERE id = $1
    `, {
      bind: [userId, JSON.stringify({
        [`consent_${consentType}`]: {
          granted,
          timestamp: new Date().toISOString(),
          ip: ipAddress,
        },
      })],
    });

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETENTION POLICY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply retention policy (run via cron job)
   */
  async applyRetentionPolicy() {
    const results = {
      processed: 0,
      errors: [],
    };

    // Get tenants with expired retention
    const [expiredTenants] = await this.sequelize.query(`
      SELECT id, data_retention_days
      FROM tenants
      WHERE status = 'cancelled'
        AND deleted_at IS NULL
        AND cancelled_at IS NOT NULL
        AND cancelled_at + (COALESCE(data_retention_days, $1) || ' days')::interval < NOW()
    `, {
      bind: [this.DEFAULT_RETENTION_DAYS],
      type: this.sequelize.QueryTypes.SELECT,
    });

    for (const tenant of expiredTenants || []) {
      try {
        await this.anonymizeTenantData(tenant.id);
        
        await this._logAction({
          action: 'retention_policy_applied',
          tenantId: tenant.id,
          details: { retentionDays: tenant.data_retention_days || this.DEFAULT_RETENTION_DAYS },
        });
        
        results.processed++;
      } catch (error) {
        results.errors.push({ tenantId: tenant.id, error: error.message });
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT TRAIL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get LGPD audit trail for tenant
   */
  async getAuditTrail(tenantId, options = {}) {
    const { limit = 100, offset = 0 } = options;

    const [logs] = await this.sequelize.query(`
      SELECT * FROM ${this.tableName}
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, {
      bind: [tenantId, limit, offset],
      type: this.sequelize.QueryTypes.SELECT,
    });

    return logs || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  async _logAction({ action, tenantId, userId, requestedBy, entityType, entityId, ipAddress, details }) {
    await this.sequelize.query(`
      INSERT INTO ${this.tableName}
      (id, tenant_id, user_id, action, entity_type, entity_id, requested_by, ip_address, details, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, {
      bind: [
        tenantId || null,
        userId || null,
        action,
        entityType || null,
        entityId || null,
        requestedBy || null,
        ipAddress || null,
        details ? JSON.stringify(details) : null,
      ],
    });
  }

  _getScheduledDeletionDate() {
    const date = new Date();
    date.setDate(date.getDate() + this.ANONYMIZATION_DELAY_DAYS);
    return date;
  }

  _countRecords(data) {
    let count = 0;
    const countObject = (obj) => {
      if (Array.isArray(obj)) {
        count += obj.length;
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(countObject);
      }
    };
    countObject(data);
    return count;
  }

  async _getUserData(tenantId, userId) {
    const [user] = await this.sequelize.query(`
      SELECT id, name, email, phone, role, created_at, updated_at
      FROM users WHERE id = $1 AND tenant_id = $2
    `, { bind: [userId, tenantId], type: this.sequelize.QueryTypes.SELECT });
    return user;
  }

  async _getUserAppointments(tenantId, userId) {
    const [appointments] = await this.sequelize.query(`
      SELECT * FROM appointments
      WHERE tenant_id = $1 AND (professional_id = $2 OR client_id IN (
        SELECT id FROM clients WHERE user_id = $2
      ))
    `, { bind: [tenantId, userId], type: this.sequelize.QueryTypes.SELECT });
    return appointments || [];
  }

  async _getUserFinancialData(tenantId, userId) {
    return [];
  }

  async _getUserNotifications(tenantId, userId) {
    const [notifications] = await this.sequelize.query(`
      SELECT * FROM notifications WHERE tenant_id = $1 AND user_id = $2
    `, { bind: [tenantId, userId], type: this.sequelize.QueryTypes.SELECT });
    return notifications || [];
  }

  async _getTenantData(tenantId) {
    const [tenant] = await this.sequelize.query(`
      SELECT * FROM tenants WHERE id = $1
    `, { bind: [tenantId], type: this.sequelize.QueryTypes.SELECT });
    return tenant;
  }

  async _getAllTenantUsers(tenantId) {
    const [users] = await this.sequelize.query(`
      SELECT id, name, email, role, created_at FROM users WHERE tenant_id = $1
    `, { bind: [tenantId], type: this.sequelize.QueryTypes.SELECT });
    return users || [];
  }

  async _getAllTenantClients(tenantId) {
    const [clients] = await this.sequelize.query(`
      SELECT * FROM clients WHERE tenant_id = $1
    `, { bind: [tenantId], type: this.sequelize.QueryTypes.SELECT });
    return clients || [];
  }

  async _getAllTenantProfessionals(tenantId) {
    const [professionals] = await this.sequelize.query(`
      SELECT * FROM professionals WHERE tenant_id = $1
    `, { bind: [tenantId], type: this.sequelize.QueryTypes.SELECT });
    return professionals || [];
  }

  async _getAllTenantAppointments(tenantId) {
    const [appointments] = await this.sequelize.query(`
      SELECT * FROM appointments WHERE tenant_id = $1
    `, { bind: [tenantId], type: this.sequelize.QueryTypes.SELECT });
    return appointments || [];
  }

  async _getAllTenantFinancial(tenantId) {
    const [entries] = await this.sequelize.query(`
      SELECT * FROM financial_entries WHERE tenant_id = $1
    `, { bind: [tenantId], type: this.sequelize.QueryTypes.SELECT });
    return entries || [];
  }

  async _getTenantSubscriptions(tenantId) {
    const [subscriptions] = await this.sequelize.query(`
      SELECT * FROM subscriptions WHERE tenant_id = $1
    `, { bind: [tenantId], type: this.sequelize.QueryTypes.SELECT });
    return subscriptions || [];
  }

  async _getTenantInvoices(tenantId) {
    const [invoices] = await this.sequelize.query(`
      SELECT * FROM invoices WHERE tenant_id = $1
    `, { bind: [tenantId], type: this.sequelize.QueryTypes.SELECT });
    return invoices || [];
  }
}

module.exports = LGPDService;
