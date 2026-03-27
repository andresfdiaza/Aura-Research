const mysql = require('mysql2/promise');
require('dotenv').config();


// Pool para la base de datos local
const localPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Amaamama12345.',
  database: process.env.DB_NAME || 'scraping',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Pool para la base de datos del servidor remoto
const remotePool = mysql.createPool({
  host: process.env.REMOTE_DB_HOST || 'ingenieria.unac.edu.co', // Cambia esto por la IP o dominio del servidor si es necesario
  user: process.env.REMOTE_DB_USER || 'investiga',
  password: process.env.REMOTE_DB_PASS || 'Amaamama12345',
  database: process.env.REMOTE_DB_NAME || 'scraping',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = {
  localPool,
  remotePool
};
