/**
 * Auth Controller V2 — HTTPOnly Cookies Support
 * 
 * FASE 1: Suporte paralelo (cookies + tokens no body) — backward compatible
 * FASE 2: Cookies obrigatórios, tokens opcionais
 * FASE 3: Remover tokens do body
 * 
 * Feature Flag: USE_HTTPONLY_COOKIES=true para ativar cookies
 */

const bcrypt = require('bcryptjs');
const { User, Establishment, Professional, sequelize } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const env = require('../config/env');

// Feature flag — ativar gradualmente
const USE_HTTPONLY_COOKIES = process.env.USE_HTTPONLY_COOKIES === 'true';

// Cookie options (secure, httpOnly, sameSite)
const ACCESS_TOKEN_COOKIE = {
  httpOnly: true,
  secure: env.nodeEnv === 'production', // Só HTTPS em produção
  sameSite: 'strict',
  maxAge: 60 * 60 * 1000, // 1 hora
  path: '/',
};

const REFRESH_TOKEN_COOKIE = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  path: '/api/auth/refresh-token', // Só disponível para refresh
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper: Setar cookies ou retornar tokens no body
// ═══════════════════════════════════════════════════════════════════════════

function setAuthTokens(res, accessToken, refreshToken, useCookies = false) {
  if (useCookies || USE_HTTPONLY_COOKIES) {
    res.cookie('access_token', accessToken, ACCESS_TOKEN_COOKIE);
    res.cookie('refresh_token', refreshToken, REFRESH_TOKEN_COOKIE);
    
    logger.info('[AUTH] Cookies httpOnly definidos');
    
    // FASE 1: Ainda retorna tokens no body para compatibilidade
    return { 
      accessToken, 
      refreshToken,
      _cookiesSet: true, // Flag para frontend saber
    };
  }
  
  // FASE 0 (atual): Apenas tokens no body
  return { accessToken, refreshToken };
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth/refresh-token' });
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════════════

async function register(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { email, password, first_name, last_name, phone, role, salon_name, cnpj, specialty, useCookies } = req.body;
    const normalizedRole = (role || 'client').toLowerCase();

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: 'Email já cadastrado.',
        error: { code: 'AUTH_EMAIL_EXISTS', details: null },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Aumentado para 12
    const user = await User.create({
      email,
      password: hashedPassword,
      first_name,
      last_name,
      phone,
      role: normalizedRole,
    }, { transaction: t });

    // If ADMIN/owner, create establishment
    if ((normalizedRole === 'admin' || normalizedRole === 'owner') && salon_name) {
      await Establishment.create({
        user_id: user.id,
        name: salon_name,
        cnpj: cnpj || null,
      }, { transaction: t });
    }

    await t.commit();

    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      tenantId: user.tenant_id || null
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const tokens = setAuthTokens(res, accessToken, refreshToken, useCookies);

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso.',
      data: {
        user: user.toSafeJSON(),
        ...tokens,
      },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════

async function login(req, res, next) {
  try {
    const { email, password, useCookies } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas.',
        error: { code: 'AUTH_INVALID_CREDENTIALS', details: null },
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas.',
        error: { code: 'AUTH_INVALID_CREDENTIALS', details: null },
      });
    }

    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      tenantId: user.tenant_id || null
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Registrar sessão (para revogação futura)
    // await SessionService.create(user.id, refreshToken);

    const tokens = setAuthTokens(res, accessToken, refreshToken, useCookies);

    logger.info(`[AUTH] User logged in: ${user.email} (${user.role})`);

    res.json({
      success: true,
      message: 'Login realizado com sucesso.',
      data: {
        user: user.toSafeJSON(),
        ...tokens,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REFRESH TOKEN
// ═══════════════════════════════════════════════════════════════════════════

async function refreshToken(req, res, next) {
  try {
    // FASE 1: Aceita tanto body quanto cookie
    const tokenFromBody = req.body?.refreshToken;
    const tokenFromCookie = req.cookies?.refresh_token;
    const token = tokenFromBody || tokenFromCookie;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token não fornecido.',
        error: { code: 'AUTH_REFRESH_MISSING', details: null },
      });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido.',
        error: { code: 'AUTH_REFRESH_INVALID', details: null },
      });
    }

    // Verificar se sessão foi revogada (FASE 2)
    // const session = await SessionService.findByToken(token);
    // if (!session || session.revoked) { ... }

    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      tenantId: user.tenant_id || null
    };
    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Revogar token antigo, criar novo (FASE 2)
    // await SessionService.revoke(token);
    // await SessionService.create(user.id, newRefreshToken);

    // Atualizar cookies se estavam sendo usados
    const useCookies = !!tokenFromCookie || req.body?.useCookies;
    const tokens = setAuthTokens(res, accessToken, newRefreshToken, useCookies);

    res.json({
      success: true,
      message: 'Token renovado com sucesso.',
      data: tokens,
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido ou expirado.',
        error: { code: 'AUTH_REFRESH_EXPIRED', details: null },
      });
    }
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════════════════

async function logout(req, res, next) {
  try {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    
    if (token) {
      // Revogar sessão (FASE 2)
      // await SessionService.revoke(token);
    }

    // Limpar cookies
    clearAuthCookies(res);

    logger.info(`[AUTH] User logged out: ${req.user?.email || 'unknown'}`);

    res.json({
      success: true,
      message: 'Logout realizado com sucesso.',
    });
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ME (Profile)
// ═══════════════════════════════════════════════════════════════════════════

async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Establishment, as: 'establishment' },
        { model: Professional, as: 'professional' },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.',
        error: { code: 'USER_NOT_FOUND', details: null },
      });
    }

    res.json({
      success: true,
      message: 'Perfil obtido com sucesso.',
      data: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { 
  register, 
  login, 
  refreshToken, 
  logout,
  me,
  // Helpers para outros controllers
  setAuthTokens,
  clearAuthCookies,
};
