const bcrypt = require('bcryptjs');
const pool = require('./db');
require('dotenv').config();

async function testAdminLogin() {
  try {
    console.log('🧪 Testing admin login...\n');
    
    const email = 'admin@unac.edu.co';
    const password = 'Admin123456!';

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      console.log('❌ Admin user not found');
      await pool.end();
      return;
    }

    const user = rows[0];
    console.log('✅ User found in database');
    console.log('─────────────────────────────────────');
    console.log('Email:', user.email);
    console.log('Role from DB:', user.role);
    console.log('─────────────────────────────────────\n');

    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('❌ Password does not match');
      await pool.end();
      return;
    }

    console.log('✅ Password matches\n');
    
    // Simulate the response that would be sent to frontend
    const response = {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    };

    console.log('📤 Response that would be sent to frontend:');
    console.log('─────────────────────────────────────');
    console.log(JSON.stringify(response, null, 2));
    console.log('─────────────────────────────────────\n');

    if (response.role === 'admin') {
      console.log('✅ Frontend should redirect to /homeadmin');
    } else {
      console.log('❌ Frontend would redirect to /home (WRONG!)');
    }

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

testAdminLogin();
