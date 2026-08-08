const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'c:/Users/Ufuk ÇELEBİ/Desktop/PROJELER/merkuryorunge/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('123456', salt);
    await pool.query("UPDATE teachers SET password_hash = $1 WHERE username = 'mehmet keleş'", [hash]);
    console.log('Password reset successfully for mehmet keleş');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
