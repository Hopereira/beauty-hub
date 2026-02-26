const bcrypt = require('bcryptjs');
const { User, Establishment, Professional, sequelize } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const logger = require('../utils/logger');

async function register(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { email, password, first_name, last_name, phone, role, salon_name, cnpj, specialty } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: 'Email já cadastrado.',
        error: { code: 'AUTH_EMAIL_EXISTS', details: null },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      first_name,
      last_name,
      phone,
      role: role || 'CLIENT',
    }, { transaction: t });

    // If ADMIN, create establishment
    if (role === 'ADMIN' && salon_name) {
      await Establishment.create({
        user_id: user.id,
        name: salon_name,
        cnpj: cnpj || null,
      }, { transaction: t });
    }

    // If PROFESSIONAL and there's an establishment to link to, we skip here
    // Professional linking is done via the professionals endpoint by an ADMIN

    await t.commit();

    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      tenantId: user.tenant_id || null
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso.',
      data: {
        user: user.toSafeJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

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

    logger.info(`User logged in: ${user.email} (${user.role})`);

    res.json({
      success: true,
      message: 'Login realizado com sucesso.',
      data: {
        user: user.toSafeJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;

    const decoded = verifyRefreshToken(token);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido.',
        error: { code: 'AUTH_REFRESH_INVALID', details: null },
      });
    }

    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      tenantId: user.tenant_id || null
    };
    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({
      success: true,
      message: 'Token renovado com sucesso.',
      data: { accessToken, refreshToken: newRefreshToken },
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

module.exports = { register, login, refreshToken, me };
