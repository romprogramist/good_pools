require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function main() {
  const dir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(dir)) {
    console.log('No migrations directory — nothing to do.');
    await pool.end();
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP    DEFAULT now()
    )
  `);

  const applied = await pool.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.rows.map(function (r) { return r.filename; }));

  const files = fs.readdirSync(dir)
    .filter(function (f) { return f.endsWith('.sql'); })
    .sort();

  let ran = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log('Applied:', file);
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Failed:', file, '—', err.message);
      await pool.end();
      process.exit(1);
    } finally {
      client.release();
    }
  }

  if (ran === 0) console.log('No pending migrations.');
  else console.log('Applied', ran, 'migration(s).');

  await pool.end();
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
