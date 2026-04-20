require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db/pool');

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: node create-admin.js <username> <password>');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  try {
    await pool.query(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash = $2',
      [username, hash]
    );
    console.log('Admin user "' + username + '" created/updated.');
  } catch (err) {
    console.error('Error:', err.message);
  }
  await pool.end();
}

main();
