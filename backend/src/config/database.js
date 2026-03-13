require('dotenv').config();

const sharedDefine = {
  timestamps: true,
  underscored: true,
  paranoid: true,
};

// Production config: prefer DATABASE_URL, fall back to individual vars
const productionBase = process.env.DATABASE_URL
  ? {
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      define: sharedDefine,
      pool: {
        max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
        min: 1,
        acquire: 60000,
        idle: 10000,
      },
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
        statement_timeout: 60000,
        idle_in_transaction_session_timeout: 60000,
      },
    }
  : {
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      define: sharedDefine,
      pool: {
        max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
        min: 1,
        acquire: 60000,
        idle: 10000,
      },
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
        statement_timeout: 60000,
        idle_in_transaction_session_timeout: 60000,
      },
    };

const config = {
  development: {
    username: process.env.DB_USER || 'beautyhub_user',
    password: process.env.DB_PASSWORD || 'beautyhub_secret_2026',
    database: process.env.DB_NAME || 'beautyhub_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    define: sharedDefine,
  },
  test: {
    username: process.env.DB_USER || 'beautyhub_user',
    password: process.env.DB_PASSWORD || 'beautyhub_secret_2026',
    database: (process.env.DB_NAME || 'beautyhub_db') + '_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    define: sharedDefine,
  },
  production: productionBase,
};

module.exports = config;
