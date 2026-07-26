require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let dbReady = false;

const geminiApiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6IHmyBnnQ9-lwMLAEgLPOR9xxNx1grkU7yZDtBm7-bCPw";
const genAI = new GoogleGenerativeAI(geminiApiKey);
const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash"
];

function buildLocalReply(studentName, message) {
  const normalized = (message || "").toLowerCase();
  if (normalized.includes("plan") || normalized.includes("çalış") || normalized.includes("ders")) {
    return `${studentName || "Öğrenci"}, bugün kısa ve odaklı bir planla başlamak en iyisi. 25 dakika çalış, 5 dakika mola ver ve bir kısa tekrar yap. Bu düzen çok etkili olur 🚀`;
  }
  if (normalized.includes("sınav") || normalized.includes("deneme")) {
    return `${studentName || "Öğrenci"}, sınav döneminde en önemli şey düzenli tekrar. Günde 3 kısa blok çalış ve her blok sonunda kendini ödüllendir. 💪`;
  }
  return `${studentName || "Öğrenci"}, ben senin eğitim koçu gibi davranıyorum. Hedefin, dersin ya da motivasyonun varsa birlikte planlayalım ✨`;
}

async function generateReply({ studentName, message, history = [] }) {
  const systemInstruction = `Sen Merkur Yorunge eğitim platformunun yapay zeka eğitim koçu Merkur AI'sin. Karşıdaki öğrencinin adı ${studentName || "öğrenci"}. Son derece motive edici, samimi, eğlenceli ve bol emojili konuşursun. Görev öğrencinin ders çalışması, motivasyonu ve eğitimle ilgili sorularına yardımcı olmak.`;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
      if (history && history.length > 0) {
        const geminiHistory = history.map((msg) => ({
          role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content || "" }]
        }));
        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(message);
        return result.response.text();
      }

      const result = await model.generateContent(message);
      return result.response.text();
    } catch (err) {
      const isQuotaError = err?.status === 429 || /quota|too many requests|rate limit/i.test(err?.message || "");
      if (!isQuotaError) {
        console.warn("Gemini call failed, using fallback reply:", err?.message || err);
        return buildLocalReply(studentName, message);
      }
    }
  }

  return buildLocalReply(studentName, message);
}

// Initialize Database Table
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        invite_code VARCHAR(20) UNIQUE NOT NULL,
        is_approved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Geriye dönük uyumluluk için
    try {
      await pool.query(`ALTER TABLE teachers ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`);
      // Mevcut öğretmenleri otomatik onayla
      await pool.query(`UPDATE teachers SET is_approved = TRUE WHERE is_approved = FALSE OR is_approved IS NULL`);
    } catch(e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Geriye dönük uyumluluk için var olan tabloya kolon ekle (Eğer tablo daha önceden varsa)
    try {
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL`);
    } catch(e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS study_logs (
        id SERIAL PRIMARY KEY,
        student_name VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        duration_minutes INT NOT NULL,
        questions_solved INT DEFAULT 0,
        teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      await pool.query(`ALTER TABLE study_logs ADD COLUMN IF NOT EXISTS teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL`);
    } catch(e) {}
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_goals (
        student_name VARCHAR(255) PRIMARY KEY,
        target_questions INT NOT NULL
      )
    `);

    dbReady = true;
    console.log("Database tables initialized.");
  } catch (err) {
    dbReady = false;
    console.error("Error initializing database:", err);
  }
};

initDB();

// API Endpoints

// --- AUTHENTICATION ---
app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, username, password, inviteCode } = req.body;
    
    let teacherId = null;
    if (inviteCode) {
      const teacherResult = await pool.query("SELECT id FROM teachers WHERE invite_code = $1", [inviteCode]);
      if (teacherResult.rows.length === 0) {
        return res.status(400).json({ error: "Geçersiz öğretmen davet kodu." });
      }
      teacherId = teacherResult.rows[0].id;
    }

    // Check if username exists
    const userExists = await pool.query("SELECT * FROM students WHERE username = $1", [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Bu kullanıcı adı zaten alınmış." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user
    const result = await pool.query(
      "INSERT INTO students (full_name, username, password_hash, teacher_id) VALUES ($1, $2, $3, $4) RETURNING id, full_name, username, teacher_id",
      [fullName, username, passwordHash, teacherId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!dbReady) {
      return res.status(200).json({ id: 1, username, full_name: username, teacher_id: null });
    }

    const result = await pool.query("SELECT * FROM students WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Geçersiz kullanıcı adı veya şifre." });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Geçersiz kullanıcı adı veya şifre." });
    }

    res.json({ id: user.id, username: user.username, full_name: user.full_name, teacher_id: user.teacher_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// --- TEACHER AUTHENTICATION ---
app.post("/api/auth/teacher/register", async (req, res) => {
  try {
    const { fullName, username, password } = req.body;
    
    const userExists = await pool.query("SELECT * FROM teachers WHERE username = $1", [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Bu kullanıcı adı zaten alınmış." });
    }

    // Generate random 6 character invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      "INSERT INTO teachers (full_name, username, password_hash, invite_code) VALUES ($1, $2, $3, $4) RETURNING id, full_name, username, invite_code",
      [fullName, username, passwordHash, inviteCode]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post("/api/auth/teacher/add-student", async (req, res) => {
  try {
    const { fullName, username, password, teacherId } = req.body;
    
    // Check if username exists
    const userExists = await pool.query("SELECT * FROM students WHERE username = $1", [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Bu kullanıcı adı zaten alınmış." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user directly under the teacher
    const result = await pool.query(
      "INSERT INTO students (full_name, username, password_hash, teacher_id) VALUES ($1, $2, $3, $4) RETURNING id, full_name, username, teacher_id",
      [fullName, username, passwordHash, teacherId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post("/api/auth/teacher/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!dbReady) {
      return res.status(200).json({ id: 1, username, full_name: username, invite_code: "DEMO" });
    }

    const result = await pool.query("SELECT * FROM teachers WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Geçersiz kullanıcı adı veya şifre." });
    }

    const teacher = result.rows[0];

    if (!teacher.is_approved) {
      return res.status(403).json({ error: "Hesabınız inceleniyor. 1 gün içerisinde Kurucu tarafından onaylanacaktır." });
    }

    const isMatch = await bcrypt.compare(password, teacher.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Geçersiz kullanıcı adı veya şifre." });
    }

    res.json({ id: teacher.id, username: teacher.username, full_name: teacher.full_name, invite_code: teacher.invite_code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
// ----------------------

// 1. Submit a new study log
app.post("/api/logs", async (req, res) => {
  try {
    const { studentName, subject, duration, questionsSolved } = req.body;
    
    // Get teacher_id for this student
    const studentQuery = await pool.query("SELECT teacher_id FROM students WHERE full_name = $1 LIMIT 1", [studentName]);
    const teacherId = studentQuery.rows.length > 0 ? studentQuery.rows[0].teacher_id : null;

    const result = await pool.query(
      "INSERT INTO study_logs (student_name, subject, duration_minutes, questions_solved, teacher_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [studentName, subject, duration, questionsSolved || 0, teacherId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 2. Get all logs (for Teacher Dashboard)
app.get("/api/logs", async (req, res) => {
  try {
    const { teacher_id } = req.query;
    let result;
    if (teacher_id) {
      result = await pool.query(
        "SELECT * FROM study_logs WHERE teacher_id = $1 ORDER BY created_at DESC",
        [teacher_id]
      );
    } else {
      result = await pool.query(
        "SELECT * FROM study_logs ORDER BY created_at DESC"
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 2.1 Get individual logs (for Student Dashboard)
app.get("/api/logs/:studentName", async (req, res) => {
  try {
    const { studentName } = req.params;
    const result = await pool.query(
      "SELECT * FROM study_logs WHERE student_name = $1 ORDER BY created_at DESC",
      [studentName]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 2.2 Get/Set Student Goals
app.get("/api/goals/:studentName", async (req, res) => {
  try {
    const { studentName } = req.params;
    const result = await pool.query(
      "SELECT target_questions FROM student_goals WHERE student_name = $1",
      [studentName]
    );
    res.json(result.rows[0] || { target_questions: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/goals", async (req, res) => {
  try {
    const { studentName, targetQuestions } = req.body;
    const result = await pool.query(
      `INSERT INTO student_goals (student_name, target_questions) 
       VALUES ($1, $2) 
       ON CONFLICT (student_name) 
       DO UPDATE SET target_questions = EXCLUDED.target_questions 
       RETURNING *`,
      [studentName, targetQuestions]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 3. Get leaderboard (Sum of durations grouped by student)
app.get("/api/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT student_name, 
             SUM(duration_minutes) as total_duration, 
             SUM(questions_solved) as total_questions,
             (SUM(duration_minutes) + (SUM(questions_solved) * 2)) as total_points
      FROM study_logs 
      GROUP BY student_name 
      ORDER BY total_points DESC, total_duration DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 3.1 Get Daily Leaderboard
app.get("/api/leaderboard/daily", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT student_name, 
             SUM(duration_minutes) as total_duration, 
             SUM(questions_solved) as total_questions,
             (SUM(duration_minutes) + (SUM(questions_solved) * 2)) as total_points
      FROM study_logs 
      WHERE DATE(created_at) = CURRENT_DATE
      GROUP BY student_name 
      ORDER BY total_points DESC, total_duration DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 4. Get general stats for Teacher Dashboard
app.get("/api/stats", async (req, res) => {
  try {
    const { teacher_id } = req.query;
    let filterClause = "";
    let queryParams = [];

    if (teacher_id) {
      filterClause = "WHERE teacher_id = $1";
      queryParams = [teacher_id];
    }

    const totalQuery = await pool.query(`
      SELECT 
        COUNT(DISTINCT student_name) as total_students,
        COALESCE(SUM(duration_minutes), 0) as total_duration,
        COALESCE(SUM(questions_solved), 0) as total_questions
      FROM study_logs
      ${filterClause}
    `, queryParams);

    const subjectQuery = await pool.query(`
      SELECT subject as name, COALESCE(SUM(duration_minutes), 0) as value 
      FROM study_logs 
      ${filterClause}
      GROUP BY subject 
      ORDER BY value DESC
    `, queryParams);

    const topStudentsQuery = await pool.query(`
      SELECT student_name as name, COALESCE(SUM(duration_minutes), 0) as duration 
      FROM study_logs 
      ${filterClause}
      GROUP BY student_name 
      ORDER BY duration DESC 
      LIMIT 7
    `, queryParams);

    const allStudentsQuery = await pool.query(`
      SELECT full_name as name 
      FROM students 
      ${filterClause}
      ORDER BY full_name ASC
    `, queryParams);

    res.json({
      summary: totalQuery.rows[0],
      subjects: subjectQuery.rows,
      topStudents: topStudentsQuery.rows,
      allStudents: allStudentsQuery.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 5. Get Super Admin Stats (Teachers info)
app.get("/api/admin/stats", async (req, res) => {
  try {
    const teachersResult = await pool.query(`
      SELECT t.id, t.full_name, t.invite_code, t.is_approved,
             COUNT(DISTINCT s.id) as student_count
      FROM teachers t
      LEFT JOIN students s ON t.id = s.teacher_id
      GROUP BY t.id, t.full_name, t.invite_code, t.is_approved
      ORDER BY t.is_approved ASC, student_count DESC
    `);
    
    const logsTotal = await pool.query(`
      SELECT COALESCE(SUM(duration_minutes), 0) as total_duration,
             COALESCE(SUM(questions_solved), 0) as total_questions
      FROM study_logs
    `);

    res.json({
      teachers: teachersResult.rows,
      platformTotals: logsTotal.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 6. Approve Teacher
app.post("/api/admin/approve-teacher", async (req, res) => {
  try {
    const { teacherId } = req.body;
    await pool.query("UPDATE teachers SET is_approved = TRUE WHERE id = $1", [teacherId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 7. Delete Teacher
app.delete("/api/admin/teacher/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM teachers WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 8. Admin Manually Add Teacher
app.post("/api/admin/add-teacher", async (req, res) => {
  try {
    const { fullName, username, password } = req.body;
    
    const userExists = await pool.query("SELECT * FROM teachers WHERE username = $1", [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Bu kullanıcı adı zaten alınmış." });
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // is_approved = true because admin is adding them manually
    const result = await pool.query(
      "INSERT INTO teachers (full_name, username, password_hash, invite_code, is_approved) VALUES ($1, $2, $3, $4, TRUE) RETURNING id, full_name, username, invite_code",
      [fullName, username, passwordHash, inviteCode]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/ai", async (req, res) => {
  try {
    const { studentName, message, history = [] } = req.body || {};
    const reply = await generateReply({ studentName, message, history });
    res.json({ reply });
  } catch (err) {
    console.error("AI route error:", err);
    res.status(200).json({ reply: "Şu an bağlantı kurmakta zorlanıyorum ama yardım etmek için buradayım. Biraz sonra tekrar deneyin ✨", error: err.message });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { studentName, message, history = [] } = req.body || {};
    const reply = await generateReply({ studentName, message, history });
    res.json({ reply });
  } catch (err) {
    console.error("AI chat route error:", err);
    res.status(200).json({ reply: "Şu an bağlantı kurmakta zorlanıyorum ama yardım etmek için buradayım. Biraz sonra tekrar deneyin ✨", error: err.message });
  }
});

app.post("/api/ai/coach", async (req, res) => {
  try {
    const { studentName, subject, duration, questionsSolved } = req.body || {};
    const prompt = `Sen Merkur Yorunge eğitim platformunun yapay zeka koçu Merkur AI'sin. Öğrenci ${studentName || "öğrenci"} az önce çalışmasını kaydetti. Ders: ${subject || "genel"}. Süre: ${duration || 0} dakika. Çözülen soru: ${questionsSolved || 0}. Enerjik, motive edici, kısa ve emoji ile geri bildirim ver.`;
    const reply = await generateReply({ studentName, message: prompt, history: [] });
    res.json({ message: reply });
  } catch (err) {
    console.error("AI coach route error:", err);
    res.status(200).json({ message: "Şu an bağlantı kurmakta zorlanıyorum ama yardım etmek için buradayım. Biraz sonra tekrar deneyin ✨", error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
