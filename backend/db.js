const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

function parseBool(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
}

const poolConfig = {
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
};

if (process.env.DATABASE_URL) {
  poolConfig.uri = process.env.DATABASE_URL;
} else {
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = Number(process.env.DB_PORT || 3306);
  poolConfig.user = process.env.DB_USER || 'root';
  poolConfig.password = process.env.DB_PASS || '';
  poolConfig.database = process.env.DB_NAME || 'scraping';
}

if (parseBool(process.env.DB_SSL, false)) {
  poolConfig.ssl = {
    rejectUnauthorized: parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
