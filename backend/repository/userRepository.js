const pool = require('../db');

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}


async function listUsers() {
  const [rows] = await pool.query('SELECT id, email, role, twofa_secret FROM users ORDER BY id');
  // Agrega un campo 2fa_enabled: true/false
  return rows.map(user => ({
    id: user.id,
    email: user.email,
    role: user.role,
    twofa_enabled: !!user.twofa_secret
  }));
}

async function updateUser(id, email, role) {
  const [result] = await pool.query(
    'UPDATE users SET email = ?, role = ? WHERE id = ?',
    [email, role, id]
  );
  return result.affectedRows > 0;
}
async function deleteUser(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findUserByEmail, listUsers, updateUser, deleteUser };
