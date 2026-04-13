require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT) || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || 'fie_explorer_3d',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',

  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
};

module.exports = env;
