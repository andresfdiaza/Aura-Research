// Script para reiniciar el 2FA de un usuario (pone twofa_secret en NULL)
const pool = require('../db');

async function reset2FA(email) {
  const [result] = await pool.query('UPDATE users SET twofa_secret = NULL WHERE email = ?', [email]);
  if (result.affectedRows > 0) {
    console.log(`2FA reiniciado para ${email}`);
  } else {
    console.log(`Usuario no encontrado: ${email}`);
  }
  process.exit(0);
}

const email = process.argv[2];
if (!email) {
  console.log('Uso: node scripts/reset2fa.js <email>');
  process.exit(1);
}
reset2FA(email);
