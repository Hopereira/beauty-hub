/**
 * Audit Service
 * Tracks all sensitive operations for LGPD compliance
 */

const { AuditLog } = require('../models');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Log an audit event
   */
  static async log({
    tenantId,
    userId,
    action,
    entity,
    entityId,
    oldValues,
    newValues,
    ip,
    userAgent,
    requestId,
    status = 'success',
    errorMessage = null,
  }) {
    try {
      // Sanitize sensitive data
      const sanitizedOld = this.sanitize(oldValues);
      const sanitizedNew = this.sanitize(newValues);
      
      await AuditLog.create({
        tenant_id: tenantId,
        user_id: userId,
        action,
        entity,
        entity_id: entityId,
        ip_address: ip,
        user_agent: userAgent,
        request_id: requestId,
        old_values: sanitizedOld,
        new_values: sanitizedNew,
        status,
        error_message: errorMessage,
      });
    } catch (error) {
      // Log to console if audit log fails (don't break the app)
      logger.error('[AUDIT] Failed to log:', error.message);
    }
  }
  
  /**
   * Sanitize sensitive data before logging
   */
  static sanitize(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'token', 'secret', 'credit_card', 'cvv', 'ssn'];
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  /**
   * Log login
   */
  static async logLogin({ userId, tenantId, ip, userAgent, requestId, success, error }) {
    await this.log({
      tenantId,
      userId,
      action: 'login',
      entity: 'user',
      entityId: userId,
      ip,
      userAgent,
      requestId,
      status: success ? 'success' : 'failure',
      errorMessage: error,
    });
  }
  
  /**
   * Log logout
   */
  static async logLogout({ userId, tenantId, ip, userAgent, requestId }) {
    await this.log({
      tenantId,
      userId,
      action: 'logout',
      entity: 'user',
      entityId: userId,
      ip,
      userAgent,
      requestId,
    });
  }
  
  /**
   * Log data export (LGPD Art. 18)
   */
  static async logExport({ userId, tenantId, entity, entityId, ip, requestId }) {
    await this.log({
      tenantId,
      userId,
      action: 'export',
      entity,
      entityId,
      ip,
      requestId,
    });
  }
  
  /**
   * Log data deletion (LGPD Art. 18)
   */
  static async logDeletion({ userId, tenantId, entity, entityId, oldValues, ip, requestId }) {
    await this.log({
      tenantId,
      userId,
      action: 'delete',
      entity,
      entityId,
      oldValues,
      ip,
      requestId,
    });
  }
  
  /**
   * Get audit trail for a user (LGPD compliance)
   */
  static async getUserAuditTrail(userId, { limit = 100, offset = 0 } = {}) {
    return AuditLog.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
  }
}

module.exports = AuditService;
