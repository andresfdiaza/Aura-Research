const bcrypt = require('bcryptjs');
const { createUser } = require('../repository/registerRepository');

async function registerUser(email, password) {
  if (!email || !password) {
    const error = new Error('email and password required');
    error.status = 400;
    throw error;
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashed);
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