const bcrypt = require('bcryptjs');
const { createUser } = require('../repository/registerRepository');

async function registerUser(email, password, role = 'user') {
  if (!email || !password) {
    const error = new Error('email and password required');
    error.status = 400;
    throw error;
  }
  // Solo permitir roles válidos
  const validRoles = ['admin', 'investigador'];
  let safeRole = validRoles.includes(role) ? role : 'investigador';
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashed, safeRole);
    return user;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const error = new Error('Email already exists');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

module.exports = { registerUser };