require('dotenv').config();

const config = {
  development: {
    username: process.env.DB_USER || 'beautyhub_user',
    password: process.env.DB_PASSWORD || 'beautyhub_secret_2026',
    database: process.env.DB_NAME || 'beautyhub_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
    },
  },
  test: {
    username: process.env.DB_USER || 'beautyhub_user',
    password: process.env.DB_PASSWORD || 'beautyhub_secret_2026',
    database: (process.env.DB_NAME || 'beautyhub_db') + '_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
    },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
  },
};

module.exports = config;
