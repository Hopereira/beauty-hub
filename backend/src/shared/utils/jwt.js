/**
 * JWT Utilities
 * Token generation and verification with tenant context
 */

const jwt = require('jsonwebtoken');
const env = require('../../config/env');

/**
 * Generate access token with tenant context
 * @param {object} payload - Token payload
 * @param {string} payload.id - User ID
 * @param {string} payload.email - User email
 * @param {string} payload.role - User role
 * @param {string} payload.tenantId - Tenant ID (null for MASTER)
 * @returns {string} JWT access token
 */
function generateAccessToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId || null,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiry || '1h' }
  );
}

/**
 * Generate refresh token
 * @param {object} payload - Token payload
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      type: 'refresh',
    },
    env.jwt.refreshSecret || env.jwt.secret,
    { expiresIn: env.jwt.refreshExpiry || '7d' }
  );
}

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 * @throws {Error} If token is invalid
 */
function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

/**
 * Verify refresh token
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 * @throws {Error} If token is invalid
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret || env.jwt.secret);
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload or null
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
