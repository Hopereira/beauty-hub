/**
 * Brute Force Protection Middleware
 * Prevents credential stuffing and brute force attacks
 */

const { HTTP_STATUS, ERROR_CODES } = require('../constants');

class BruteForceProtection {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.tableName = 'login_attempts';
    
    // Configuration
    this.MAX_ATTEMPTS_PER_EMAIL = 5;
    this.MAX_ATTEMPTS_PER_IP = 20;
    this.LOCKOUT_DURATION_MINUTES = 15;
    this.WINDOW_MINUTES = 15;
    this.ACCOUNT_LOCKOUT_ATTEMPTS = 10;
  }

  /**
   * Middleware to check if login should be allowed
   */
  checkLoginAllowed() {
    return async (req, res, next) => {
      try {
        const email = req.body.email?.toLowerCase();
        const ip = this._getClientIP(req);
        const tenantSlug = req.body.tenant || req.headers['x-tenant-slug'];

        // Check email-based rate limit
        if (email) {
          const emailCheck = await this._checkIdentifier(email, 'email', this.MAX_ATTEMPTS_PER_EMAIL);
          if (!emailCheck.allowed) {
            return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
              success: false,
              error: {
                code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
                message: `Muitas tentativas de login. Tente novamente em ${emailCheck.retryAfterMinutes} minutos.`,
                retryAfter: emailCheck.retryAfterMinutes * 60,
              },
            });
          }
        }

        // Check IP-based rate limit
        const ipCheck = await this._checkIdentifier(ip, 'ip', this.MAX_ATTEMPTS_PER_IP);
        if (!ipCheck.allowed) {
          return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
            success: false,
            error: {
              code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
              message: `Muitas tentativas de login deste IP. Tente novamente em ${ipCheck.retryAfterMinutes} minutos.`,
              retryAfter: ipCheck.retryAfterMinutes * 60,
            },
          });
        }

        // Attach method to record attempt
        req.recordLoginAttempt = async (success, failureReason = null) => {
          await this.recordAttempt({
            email,
            ip,
            tenantSlug,
            success,
            failureReason,
            userAgent: req.headers['user-agent'],
          });

          // Check for account lockout
          if (!success && email) {
            await this._checkAccountLockout(email, tenantSlug);
          }
        };

        next();
      } catch (error) {
        console.error('[BruteForce] Error checking login:', error);
        // Don't block login on error
        next();
      }
    };
  }

  /**
   * Check if identifier is rate limited
   */
  async _checkIdentifier(identifier, type, maxAttempts) {
    const windowStart = new Date(Date.now() - this.WINDOW_MINUTES * 60 * 1000);

    const [result] = await this.sequelize.query(`
      SELECT COUNT(*) as attempts
      FROM ${this.tableName}
      WHERE identifier = $1
        AND identifier_type = $2
        AND success = false
        AND created_at >= $3
    `, {
      bind: [identifier, type, windowStart],
      type: this.sequelize.QueryTypes.SELECT,
    });

    const attempts = parseInt(result?.attempts || 0, 10);

    if (attempts >= maxAttempts) {
      // Calculate retry after
      const [oldest] = await this.sequelize.query(`
        SELECT MIN(created_at) as oldest
        FROM ${this.tableName}
        WHERE identifier = $1
          AND identifier_type = $2
          AND success = false
          AND created_at >= $3
      `, {
        bind: [identifier, type, windowStart],
        type: this.sequelize.QueryTypes.SELECT,
      });

      const oldestAttempt = new Date(oldest?.oldest || Date.now());
      const unlockTime = new Date(oldestAttempt.getTime() + this.WINDOW_MINUTES * 60 * 1000);
      const retryAfterMinutes = Math.ceil((unlockTime - Date.now()) / (60 * 1000));

      return {
        allowed: false,
        attempts,
        maxAttempts,
        retryAfterMinutes: Math.max(1, retryAfterMinutes),
      };
    }

    return {
      allowed: true,
      attempts,
      maxAttempts,
      remaining: maxAttempts - attempts,
    };
  }

  /**
   * Record login attempt
   */
  async recordAttempt({ email, ip, tenantSlug, success, failureReason, userAgent }) {
    const queries = [];

    // Record by email
    if (email) {
      queries.push(
        this.sequelize.query(`
          INSERT INTO ${this.tableName} 
          (id, identifier, identifier_type, tenant_slug, success, ip_address, user_agent, failure_reason, created_at)
          VALUES (gen_random_uuid(), $1, 'email', $2, $3, $4, $5, $6, NOW())
        `, {
          bind: [email, tenantSlug, success, ip, userAgent, failureReason],
        })
      );
    }

    // Record by IP
    if (ip) {
      queries.push(
        this.sequelize.query(`
          INSERT INTO ${this.tableName} 
          (id, identifier, identifier_type, tenant_slug, success, ip_address, user_agent, failure_reason, created_at)
          VALUES (gen_random_uuid(), $1, 'ip', $2, $3, $4, $5, $6, NOW())
        `, {
          bind: [ip, tenantSlug, success, ip, userAgent, failureReason],
        })
      );
    }

    await Promise.all(queries);

    // Reset on successful login
    if (success && email) {
      await this._resetAttempts(email);
    }
  }

  /**
   * Check if account should be locked
   */
  async _checkAccountLockout(email, tenantSlug) {
    const windowStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour window

    const [result] = await this.sequelize.query(`
      SELECT COUNT(*) as attempts
      FROM ${this.tableName}
      WHERE identifier = $1
        AND identifier_type = 'email'
        AND success = false
        AND created_at >= $2
    `, {
      bind: [email, windowStart],
      type: this.sequelize.QueryTypes.SELECT,
    });

    const attempts = parseInt(result?.attempts || 0, 10);

    if (attempts >= this.ACCOUNT_LOCKOUT_ATTEMPTS) {
      // Lock the user account
      await this.sequelize.query(`
        UPDATE users
        SET locked_at = NOW(),
            lock_reason = 'too_many_failed_attempts',
            failed_login_attempts = $2
        WHERE email = $1 AND tenant_id = (
          SELECT id FROM tenants WHERE slug = $3 LIMIT 1
        )
      `, {
        bind: [email, attempts, tenantSlug],
      });

      console.warn(`[BruteForce] Account locked: ${email} after ${attempts} failed attempts`);
    } else {
      // Update failed attempts counter
      await this.sequelize.query(`
        UPDATE users
        SET failed_login_attempts = $2,
            last_failed_login_at = NOW()
        WHERE email = $1
      `, {
        bind: [email, attempts],
      });
    }
  }

  /**
   * Reset failed attempts on successful login
   */
  async _resetAttempts(email) {
    await this.sequelize.query(`
      UPDATE users
      SET failed_login_attempts = 0,
          last_failed_login_at = NULL
      WHERE email = $1
    `, {
      bind: [email],
    });
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(email, tenantSlug) {
    const [result] = await this.sequelize.query(`
      SELECT locked_at, lock_reason
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1 AND t.slug = $2
    `, {
      bind: [email, tenantSlug],
      type: this.sequelize.QueryTypes.SELECT,
    });

    if (result?.locked_at) {
      const lockedAt = new Date(result.locked_at);
      const unlockTime = new Date(lockedAt.getTime() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);

      if (Date.now() < unlockTime) {
        return {
          locked: true,
          reason: result.lock_reason,
          unlockAt: unlockTime,
          minutesRemaining: Math.ceil((unlockTime - Date.now()) / (60 * 1000)),
        };
      } else {
        // Auto-unlock
        await this.sequelize.query(`
          UPDATE users
          SET locked_at = NULL,
              lock_reason = NULL,
              failed_login_attempts = 0
          WHERE email = $1
        `, {
          bind: [email],
        });
      }
    }

    return { locked: false };
  }

  /**
   * Unlock account manually
   */
  async unlockAccount(email) {
    await this.sequelize.query(`
      UPDATE users
      SET locked_at = NULL,
          lock_reason = NULL,
          failed_login_attempts = 0
      WHERE email = $1
    `, {
      bind: [email],
    });

    return true;
  }

  /**
   * Get client IP address
   */
  _getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  /**
   * Cleanup old login attempts
   */
  async cleanup(daysToKeep = 30) {
    const [result] = await this.sequelize.query(`
      DELETE FROM ${this.tableName}
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      RETURNING id
    `, {
      type: this.sequelize.QueryTypes.DELETE,
    });

    return { deleted: result?.length || 0 };
  }

  /**
   * Get login statistics
   */
  async getStatistics(hours = 24) {
    const [stats] = await this.sequelize.query(`
      SELECT 
        COUNT(*) FILTER (WHERE success = true) as successful_logins,
        COUNT(*) FILTER (WHERE success = false) as failed_logins,
        COUNT(DISTINCT identifier) FILTER (WHERE identifier_type = 'email' AND success = false) as unique_failed_emails,
        COUNT(DISTINCT identifier) FILTER (WHERE identifier_type = 'ip' AND success = false) as unique_failed_ips
      FROM ${this.tableName}
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
    `, {
      type: this.sequelize.QueryTypes.SELECT,
    });

    return stats || {};
  }
}

/**
 * Create middleware instance
 */
function createBruteForceProtection(sequelize) {
  return new BruteForceProtection(sequelize);
}

module.exports = {
  BruteForceProtection,
  createBruteForceProtection,
};
