const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetDB() {
  try {
    await pool.query('TRUNCATE TABLE topic_curriculum CASCADE;');
    console.log('Database truncated successfully!');
  } catch (err) {
    console.error('Error truncating database:', err);
  } finally {
    await pool.end();
  }
}

resetDB();
