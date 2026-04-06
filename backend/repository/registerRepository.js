const pool = require('../db');


async function createUser(email, hashedPassword, role = 'user') {
  try {
    const [result] = await pool.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, role]
    );
    return { id: result.insertId, email, role };
  } catch (err) {
    throw err;
  }
}

module.exports = { createUser };