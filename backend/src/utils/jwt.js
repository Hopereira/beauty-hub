const jwt = require('jsonwebtoken');
const env = require('../config/env');

function generateAccessToken(payload) {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.accessTokenExpiration,
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTokenExpiration,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
