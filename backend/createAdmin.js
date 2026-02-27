const bcrypt = require('bcryptjs');
const pool = require('./db');
require('dotenv').config();

async function createAdminUser() {
  const adminEmail = 'admin@unac.edu.co';
  const adminPassword = 'Admin123456!';
  
  try {
    // Check if admin already exists
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
    
    if (existing.length > 0) {
      // Update existing admin
      const hashed = await bcrypt.hash(adminPassword, 10);
      await pool.query('UPDATE users SET password = ?, role = ? WHERE email = ?', [
        hashed,
        'admin',
        adminEmail,
      ]);
      console.log('✓ Admin user updated successfully!');
      console.log('─────────────────────────────────────');
      console.log('Email:    ', adminEmail);
      console.log('Password: ', adminPassword);
      console.log('Role:     ', 'admin');
      console.log('─────────────────────────────────────');
      await pool.end();
      return;
    }

    // Hash the password
    const hashed = await bcrypt.hash(adminPassword, 10);

    // Insert admin user
    const [result] = await pool.query('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [
      adminEmail,
      hashed,
      'admin',
    ]);

    console.log('✓ Admin user created successfully!');
    console.log('─────────────────────────────────────');
    console.log('Email:    ', adminEmail);
    console.log('Password: ', adminPassword);
    console.log('Role:     ', 'admin');
    console.log('─────────────────────────────────────');
    console.log('⚠️  Please save these credentials in a secure location');
    console.log('   and change the password after first login.');
    
    await pool.end();
  } catch (err) {
    console.error('Error creating admin user:', err.message);
    await pool.end();
    process.exit(1);
  }
}

createAdminUser();
