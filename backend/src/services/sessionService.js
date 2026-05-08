/**
 * Session Service
 * Manages user sessions for JWT token revocation and security
 * 
 * Features:
 * - Store refresh token hashes (not the tokens themselves)
 * - Revoke sessions on logout
 * - Revoke all sessions on password change
 * - Track session metadata (IP, device)
 */

const crypto = require('crypto');
const { UserSession } = require('../models');
const logger = require('../utils/logger');

class SessionService {
  /**
   * Hash a token using SHA-256
   * We store hashes, not the actual tokens
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create a new session
   */
  static async create(userId, refreshToken, { ip, userAgent, tenantId, expiresIn = '7d' } = {}) {
    try {
      const tokenHash = this.hashToken(refreshToken);
      
      // Calculate expiration
      const expiresAt = new Date();
      if (expiresIn === '7d') {
        expiresAt.setDate(expiresAt.getDate() + 7);
      } else if (typeof expiresIn === 'number') {
        expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      }

      const session = await UserSession.create({
        user_id: userId,
        refresh_token_hash: tokenHash,
        ip_address: ip || null,
        user_agent: userAgent || null,
        tenant_id: tenantId || null,
        expires_at: expiresAt,
        is_valid: true,
      });

      logger.info('[SESSION] Created', {
        sessionId: session.id,
        userId,
        tenantId,
        ip: ip || 'unknown',
      });

      return session;
    } catch (error) {
      logger.error('[SESSION] Failed to create session:', error.message);
      throw error;
    }
  }

  /**
   * Find session by token
   */
  static async findByToken(refreshToken) {
    const tokenHash = this.hashToken(refreshToken);
    
    const session = await UserSession.findOne({
      where: {
        refresh_token_hash: tokenHash,
        is_valid: true,
      },
      include: ['user', 'tenant'],
    });

    if (session && new Date() > session.expires_at) {
      // Session expired, mark as invalid
      await session.update({ is_valid: false });
      return null;
    }

    return session;
  }

  /**
   * Revoke a specific session (logout)
   */
  static async revoke(refreshToken, reason = 'logout') {
    const tokenHash = this.hashToken(refreshToken);
    
    const [updated] = await UserSession.update(
      {
        is_valid: false,
        revoked_at: new Date(),
        revoked_reason: reason,
      },
      {
        where: {
          refresh_token_hash: tokenHash,
          is_valid: true,
        },
      }
    );

    if (updated > 0) {
      logger.info('[SESSION] Revoked', { reason, tokenHash: tokenHash.slice(0, 16) + '...' });
    }

    return updated > 0;
  }

  /**
   * Revoke all sessions for a user (password change, security breach)
   */
  static async revokeAllForUser(userId, reason = 'password_change') {
    const [updated] = await UserSession.update(
      {
        is_valid: false,
        revoked_at: new Date(),
        revoked_reason: reason,
      },
      {
        where: {
          user_id: userId,
          is_valid: true,
        },
      }
    );

    logger.info('[SESSION] Revoked all sessions for user', {
      userId,
      count: updated,
      reason,
    });

    return updated;
  }

  /**
   * Get active sessions for a user
   */
  static async getActiveSessions(userId) {
    return UserSession.findAll({
      where: {
        user_id: userId,
        is_valid: true,
        expires_at: { [require('sequelize').Op.gt]: new Date() },
      },
      order: [['last_used_at', 'DESC']],
      attributes: ['id', 'ip_address', 'user_agent', 'created_at', 'last_used_at', 'device_info'],
    });
  }

  /**
   * Update last used timestamp
   */
  static async updateLastUsed(refreshToken) {
    const tokenHash = this.hashToken(refreshToken);
    
    await UserSession.update(
      { last_used_at: new Date() },
      {
        where: { refresh_token_hash: tokenHash },
        silent: true, // Don't update updated_at
      }
    );
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  static async cleanupExpired() {
    const { Op } = require('sequelize');
    
    const [deleted] = await UserSession.destroy({
      where: {
        [Op.or]: [
          { expires_at: { [Op.lt]: new Date() } },
          { 
            is_valid: false,
            revoked_at: { [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days old
          },
        ],
      },
    });

    logger.info('[SESSION] Cleanup completed', { deleted });
    return deleted;
  }
}

module.exports = SessionService;
