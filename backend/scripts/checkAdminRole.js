const pool = require('../db');
require('dotenv').config();

async function checkAdminRole() {
  try {
    const [user] = await pool.query('SELECT id, email, role FROM users WHERE email = ?', [
      'admin@unac.edu.co',
    ]);

    if (user.length === 0) {
      console.log('❌ Admin user not found in database');
      await pool.end();
      return;
    }

    console.log('👤 Admin user found:');
    console.log('─────────────────────────────────────');
    console.log('Email:', user[0].email);
    console.log('Role: ', user[0].role);
    console.log('─────────────────────────────────────');

    if (user[0].role === 'admin') {
      console.log('✅ Role is correctly set to "admin"');
    } else {
      console.log('❌ Role is:', user[0].role, '(should be "admin")');
      console.log('\nUpdating role to "admin"...');
      await pool.query('UPDATE users SET role = ? WHERE email = ?', ['admin', 'admin@unac.edu.co']);
      console.log('✅ Role updated successfully');
    }

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

checkAdminRole();