require('dotenv').config();

// Parse DATABASE_URL if available (Supabase, Fly Postgres, etc.)
function parseDbConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port, 10) || 5432,
        name: url.pathname.replace('/', ''),
        user: url.username,
        password: decodeURIComponent(url.password),
        ssl: databaseUrl.includes('sslmode=require') || process.env.NODE_ENV === 'production',
      };
    } catch (e) {
      console.error('Failed to parse DATABASE_URL:', e.message);
    }
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'beautyhub_db',
    user: process.env.DB_USER || 'beautyhub_user',
    password: process.env.DB_PASSWORD || 'beautyhub_secret_2026',
    ssl: process.env.DB_SSL === 'true' || false,
  };
}

const nodeEnv = process.env.NODE_ENV || 'development';

// Enforce required secrets in production
if (nodeEnv === 'production') {
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`[env] Missing required production environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  nodeEnv,
  port: parseInt(process.env.PORT, 10) || 5001,

  db: parseDbConfig(),

  jwt: {
    // SECURITY: No fallbacks in production - must be set explicitly
    secret: nodeEnv === 'production' 
      ? (process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required in production'); })())
      : (process.env.JWT_SECRET || 'dev_jwt_secret_CHANGE_IN_PRODUCTION'),
    refreshSecret: nodeEnv === 'production'
      ? (process.env.JWT_REFRESH_SECRET || (() => { throw new Error('JWT_REFRESH_SECRET is required in production'); })())
      : (process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_CHANGE_IN_PRODUCTION'),
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1h',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
