const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/Ufuk ÇELEBİ/Desktop/PROJELER/merkuryorunge/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query("SELECT id, full_name, username FROM teachers WHERE full_name ILIKE '%mehmet%'");
    console.log('Teacher:', res.rows);
    if (res.rows.length > 0) {
      const tid = res.rows[0].id;
      const st = await pool.query('SELECT full_name, username FROM students WHERE teacher_id = $1', [tid]);
      console.log('Students under this teacher:', st.rows);
    }
    
    // Also list all teachers just in case
    const all = await pool.query("SELECT id, full_name, username FROM teachers");
    console.log('All Teachers:', all.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
