const pool = require('./db');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    const [res] = await pool.query('INSERT INTO users (email,password) VALUES (?,?)', [
      'user@example.com',
      hash,
    ]);
    console.log('inserted id', res.insertId);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

main();
