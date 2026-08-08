const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/Ufuk ÇELEBİ/Desktop/PROJELER/merkuryorunge/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'students'`);
    console.log(res.rows);
    const res2 = await pool.query(`INSERT INTO students (full_name, username, password_hash, teacher_id, school_level) VALUES ('Test', 'testx123', 'hash', 1, 'Lise') RETURNING *`);
    console.log(res2.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
