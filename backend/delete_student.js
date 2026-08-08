require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
});

async function deleteStudent(name) {
  try {
    const studentName = name.trim();
    console.log("Deleting records for student_name:", studentName);

    // Since we don't know if it's "ufuk celebi" or "Ufuk Çelebi", we'll check both.
    const names = [studentName, "ufuk celebi", "Ufuk Çelebi", "Ufuk celebi", "ufuk Çelebi"];

    for (let n of names) {
      const res1 = await pool.query('DELETE FROM study_logs WHERE LOWER(student_name) = LOWER($1)', [n]);
      const res2 = await pool.query('DELETE FROM student_goals WHERE LOWER(student_name) = LOWER($1)', [n]);
      const res3 = await pool.query('DELETE FROM student_topic_progress WHERE LOWER(student_name) = LOWER($1)', [n]);
      const res4 = await pool.query('DELETE FROM students WHERE LOWER(full_name) = LOWER($1) OR LOWER(username) = LOWER($1)', [n]);

      if (res1.rowCount > 0) console.log(`Deleted from study_logs for ${n}:`, res1.rowCount);
      if (res2.rowCount > 0) console.log(`Deleted from student_goals for ${n}:`, res2.rowCount);
      if (res3.rowCount > 0) console.log(`Deleted from student_topic_progress for ${n}:`, res3.rowCount);
      if (res4.rowCount > 0) console.log(`Deleted from students for ${n}:`, res4.rowCount);
    }

    console.log("Deletion complete.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

deleteStudent("Ufuk Çelebi");
