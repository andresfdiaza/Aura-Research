const pool = require('./db');
require('dotenv').config();

async function addRoleColumn() {
  try {
    console.log('Checking and adding role column to users table...');
    
    // Check if column exists
    const [cols] = await pool.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
    
    if (cols.length > 0) {
      console.log('✓ Role column already exists');
    } else {
      // Add the column
      await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'");
      console.log('✓ Role column added successfully');
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

addRoleColumn();
