const pool = require('../db');

async function createUser(email, hashedPassword) {
  try {
    const [result] = await pool.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );
    return { id: result.insertId, email };
  } catch (err) {
    throw err;
  }
}

module.exports = { createUser };