const pool = require('../db');

async function setUser2FASecret(email, secret) {
  await pool.query('UPDATE users SET twofa_secret = ? WHERE email = ?', [secret, email]);
}

module.exports = { setUser2FASecret };