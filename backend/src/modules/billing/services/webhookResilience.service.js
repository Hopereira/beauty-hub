/**
 * Webhook Resilience Service
 * Handles idempotency, retry logic, and Dead Letter Queue for webhooks
 */

const { v4: uuidv4 } = require('uuid');

class WebhookResilienceService {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.tableName = 'webhook_events';
    
    // Retry configuration
    this.MAX_ATTEMPTS = 5;
    this.RETRY_DELAYS = [60, 300, 900, 3600, 14400]; // seconds: 1m, 5m, 15m, 1h, 4h
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IDEMPOTENCY CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if event was already processed (idempotency)
   * Returns existing event if found, null if new
   */
  async checkIdempotency(provider, eventId) {
    const [results] = await this.sequelize.query(`
      SELECT id, status, completed_at, attempt_count
      FROM ${this.tableName}
      WHERE provider = $1 AND event_id = $2
    `, {
      bind: [provider, eventId],
      type: this.sequelize.QueryTypes.SELECT,
    });

    return results || null;
  }

  /**
   * Check if event should be processed
   */
  async shouldProcess(provider, eventId) {
    const existing = await this.checkIdempotency(provider, eventId);
    
    if (!existing) {
      return { shouldProcess: true, reason: 'new_event' };
    }

    if (existing.status === 'completed') {
      return { 
        shouldProcess: false, 
        reason: 'already_completed',
        completedAt: existing.completed_at,
      };
    }

    if (existing.status === 'processing') {
      return { 
        shouldProcess: false, 
        reason: 'currently_processing',
      };
    }

    if (existing.status === 'dead_letter') {
      return { 
        shouldProcess: false, 
        reason: 'in_dead_letter_queue',
      };
    }

    // Failed but can retry
    if (existing.status === 'failed' && existing.attempt_count < this.MAX_ATTEMPTS) {
      return { shouldProcess: true, reason: 'retry' };
    }

    return { shouldProcess: false, reason: 'max_attempts_reached' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register new webhook event
   */
  async registerEvent(provider, eventId, eventType, payload, tenantId = null) {
    const id = uuidv4();

    try {
      await this.sequelize.query(`
        INSERT INTO ${this.tableName} 
        (id, provider, event_id, event_type, status, payload, tenant_id, attempt_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'pending', $5, $6, 0, NOW(), NOW())
        ON CONFLICT (provider, event_id) DO NOTHING
        RETURNING id
      `, {
        bind: [id, provider, eventId, eventType, JSON.stringify(payload), tenantId],
      });

      return { id, isNew: true };
    } catch (error) {
      // If conflict, return existing
      const existing = await this.checkIdempotency(provider, eventId);
      return { id: existing?.id, isNew: false };
    }
  }

  /**
   * Mark event as processing
   */
  async markProcessing(provider, eventId) {
    await this.sequelize.query(`
      UPDATE ${this.tableName}
      SET status = 'processing',
          last_attempt_at = NOW(),
          attempt_count = attempt_count + 1,
          updated_at = NOW()
      WHERE provider = $1 AND event_id = $2
    `, {
      bind: [provider, eventId],
    });
  }

  /**
   * Mark event as completed
   */
  async markCompleted(provider, eventId, processingTimeMs = null) {
    await this.sequelize.query(`
      UPDATE ${this.tableName}
      SET status = 'completed',
          completed_at = NOW(),
          processing_time_ms = $3,
          error_message = NULL,
          error_stack = NULL,
          updated_at = NOW()
      WHERE provider = $1 AND event_id = $2
    `, {
      bind: [provider, eventId, processingTimeMs],
    });
  }

  /**
   * Mark event as failed
   */
  async markFailed(provider, eventId, error) {
    // Get current attempt count
    const [event] = await this.sequelize.query(`
      SELECT attempt_count FROM ${this.tableName}
      WHERE provider = $1 AND event_id = $2
    `, {
      bind: [provider, eventId],
      type: this.sequelize.QueryTypes.SELECT,
    });

    const attemptCount = event?.attempt_count || 0;
    const shouldMoveToDLQ = attemptCount >= this.MAX_ATTEMPTS;
    const nextRetryDelay = this.RETRY_DELAYS[Math.min(attemptCount, this.RETRY_DELAYS.length - 1)];
    const nextRetryAt = new Date(Date.now() + nextRetryDelay * 1000);

    await this.sequelize.query(`
      UPDATE ${this.tableName}
      SET status = $3,
          error_message = $4,
          error_stack = $5,
          next_retry_at = $6,
          updated_at = NOW()
      WHERE provider = $1 AND event_id = $2
    `, {
      bind: [
        provider,
        eventId,
        shouldMoveToDLQ ? 'dead_letter' : 'failed',
        error.message || 'Unknown error',
        error.stack || null,
        shouldMoveToDLQ ? null : nextRetryAt,
      ],
    });

    return { movedToDLQ: shouldMoveToDLQ, nextRetryAt: shouldMoveToDLQ ? null : nextRetryAt };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETRY PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get events ready for retry
   */
  async getEventsForRetry(limit = 50) {
    const [events] = await this.sequelize.query(`
      SELECT id, provider, event_id, event_type, payload, tenant_id, attempt_count
      FROM ${this.tableName}
      WHERE status = 'failed'
        AND next_retry_at <= NOW()
        AND attempt_count < $1
      ORDER BY next_retry_at ASC
      LIMIT $2
    `, {
      bind: [this.MAX_ATTEMPTS, limit],
      type: this.sequelize.QueryTypes.SELECT,
    });

    return events || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEAD LETTER QUEUE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get events in Dead Letter Queue
   */
  async getDeadLetterEvents(options = {}) {
    const { limit = 100, offset = 0, provider = null } = options;

    let whereClause = "status = 'dead_letter'";
    const binds = [limit, offset];

    if (provider) {
      whereClause += ` AND provider = $3`;
      binds.push(provider);
    }

    const [events] = await this.sequelize.query(`
      SELECT id, provider, event_id, event_type, payload, tenant_id, 
             attempt_count, error_message, created_at, updated_at
      FROM ${this.tableName}
      WHERE ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `, {
      bind: binds,
      type: this.sequelize.QueryTypes.SELECT,
    });

    return events || [];
  }

  /**
   * Retry event from Dead Letter Queue
   */
  async retryFromDLQ(eventId) {
    await this.sequelize.query(`
      UPDATE ${this.tableName}
      SET status = 'pending',
          attempt_count = 0,
          error_message = NULL,
          error_stack = NULL,
          next_retry_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND status = 'dead_letter'
    `, {
      bind: [eventId],
    });

    return true;
  }

  /**
   * Permanently dismiss event from DLQ
   */
  async dismissFromDLQ(eventId, reason = null) {
    await this.sequelize.query(`
      UPDATE ${this.tableName}
      SET status = 'dismissed',
          metadata = jsonb_set(COALESCE(metadata, '{}'), '{dismiss_reason}', $2),
          updated_at = NOW()
      WHERE id = $1 AND status = 'dead_letter'
    `, {
      bind: [eventId, JSON.stringify(reason)],
    });

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get webhook processing statistics
   */
  async getStatistics(hours = 24) {
    const [stats] = await this.sequelize.query(`
      SELECT 
        provider,
        status,
        COUNT(*) as count,
        AVG(processing_time_ms) as avg_processing_time_ms,
        MAX(attempt_count) as max_attempts
      FROM ${this.tableName}
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY provider, status
      ORDER BY provider, status
    `, {
      type: this.sequelize.QueryTypes.SELECT,
    });

    // Calculate summary
    const [summary] = await this.sequelize.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'dead_letter') as dead_letter,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        AVG(processing_time_ms) FILTER (WHERE status = 'completed') as avg_success_time_ms
      FROM ${this.tableName}
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
    `, {
      type: this.sequelize.QueryTypes.SELECT,
    });

    return {
      byProviderAndStatus: stats,
      summary: summary || {},
      period: `last_${hours}_hours`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cleanup old completed events
   */
  async cleanupOldEvents(daysToKeep = 90) {
    const [result] = await this.sequelize.query(`
      DELETE FROM ${this.tableName}
      WHERE status = 'completed'
        AND completed_at < NOW() - INTERVAL '${daysToKeep} days'
      RETURNING id
    `, {
      type: this.sequelize.QueryTypes.DELETE,
    });

    return { deleted: result?.length || 0 };
  }
}

module.exports = WebhookResilienceService;
