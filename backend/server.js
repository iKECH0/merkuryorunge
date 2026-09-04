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
  "gemini-2.5-flash-lite", // Ultra fast (~0.8s - 1.2s response)
  "gemini-3.1-flash-lite", // Reliable fast backup (~3.8s)
  "gemini-3.5-flash"       // Secondary fallback (~8s)
];

function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function buildLocalReply(studentName, message, studentData = null) {
  const name = studentName || "Öğrenci";
  const normalized = (message || "").toLowerCase();
  
  if (normalized.includes("naber") || normalized.includes("nasılsın") || normalized.includes("selam") || normalized.includes("merhaba")) {
    const greetings = [
      `Selam ${name}! 🚀 Enerjim yerinde, seninle yeni hedeflere odaklanmak için sabırsızlanıyorum! Sen nasılsın, çalışmalar nasıl gidiyor? ✨`,
      `Merhaba ${name}! Harika bir gün olsun! 🌟 Bugün hangi dersle başlıyoruz, zihnin açık mı?`,
      `Selam ${name}! 👋 Ben bomba gibiyim! Bugün seninle rekorlar kırmaya varım, sen ne durumdasın? 💪`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  if (studentData && studentData.totalMinutes) {
    return `${name}, son 7 günde toplam ${studentData.totalMinutes} dakika ve ${studentData.totalQuestions || 0} soru kaydetmişsin! Düzenli çalışman harika ilerliyor, tempoyu koruyup en az çalıştığın derslere 25 dakikalık odak seansları ekleyebilirsin 🚀`;
  }
  if (normalized.includes("plan") || normalized.includes("çalış") || normalized.includes("ders")) {
    return `${name}, bugün 25 dakika odaklanmış çalışma ve 5 dakika kısa mola (Pomodoro tekniği) ile başlamanı öneririm. Kısa ama derin odak her zaman kazandırır! 🎯`;
  }
  if (normalized.includes("sınav") || normalized.includes("deneme") || normalized.includes("stres")) {
    return `${name}, sınav yolculuğu bir maraton. Önemli olan her gün küçük de olsa bir adım atmak. Kendine güven, planına sadık kal! 💪✨`;
  }
  return `Harika bir noktaya değindin ${name}! Eğitim yolculuğunda her zaman yanındayım. Ders planın, hedeflerin veya motivasyonun hakkında ne düşünüyorsun, birlikte konuşalım! 🌌`;
}

// Build a rich, personalized system instruction based on student's actual study data
function buildSystemInstruction(studentName, studentData) {
  const name = studentName || "öğrenci";
  let context = "";

  if (studentData) {
    const { subjects = {}, totalMinutes = 0, totalQuestions = 0, schoolLevel, className, goal } = studentData;
    const subjectEntries = Object.entries(subjects).sort((a, b) => b[1].minutes - a[1].minutes);

    if (subjectEntries.length > 0) {
      const strongest = subjectEntries[0];
      const weakest = subjectEntries[subjectEntries.length - 1];
      const subjectLines = subjectEntries.map(([s, d]) => `  - ${s}: ${d.minutes} dk, ${d.questions} soru`).join("\n");

      context = `
## Öğrenci Çalışma Verileri (Son 7 Gün):
- İsim: ${name}
- Sınıf/Seviye: ${schoolLevel || "Belirtilmemiş"} ${className ? `(${className})` : ""}
- Toplam çalışma: ${totalMinutes} dakika, ${totalQuestions} soru
- Hedef: ${goal ? `${goal} soru/gün` : "Belirtilmemiş"}
- Derse göre dağılım:
${subjectLines}
- En çok odaklandığı ders: ${strongest[0]} (${strongest[1].minutes} dk)
- En az ilgilendiği ders: ${weakest[0]} (${weakest[1].minutes} dk)
`;
    } else {
      context = `\n## Öğrenci Verileri:\n- İsim: ${name}\n- Sınıf/Seviye: ${schoolLevel || "Belirtilmemiş"} ${className ? `(${className})` : ""}\n- Henüz çalışma kaydı yok.\n`;
    }
  }

  return `Sen Merkür Yörünge eğitim platformunun zeki, sıcak ve kişisel eğitim koçu Merkür AI'sin.
${context}
## Görevin ve Kuralların:
1. Öğrencinin gerçek çalışma verileri sana verilmiş. MUTLAKA bu verilere atıfta bulun, genel konuşma.
2. "Naber", "Nasılsın", "Selam", "İyisin mi?" gibi günlük mesajlara insan gibi sıcak, samimi ve kısa karşılık ver. Asla robot gibi konuşma.
3. Her cevap FARKLI olsun. Asla aynı kalıpları tekrarlama.
4. Yanıtlar kısa ve net olsun (3-4 cümle). Uzun essay yazma.
5. Veriye dayalı tavsiye ver: "Matematikte bu hafta 45 dakika kalmışsın, biraz daha ekleyebilirsin 💡" gibi.
6. Motive edici, eğlenceli, bol emojili ama abartısız konuş.
7. Öğrencinin zayıf dersini 2-3 mesajdan sonra nazikçe gündeme getir.
8. Türkçe konuş, Türkçe yanıtla.`;
}

// Generate reply with guaranteed speed, sanitized chat history, and failover
async function generateReply({ studentName, message, history = [], studentData = null, customInstruction = null }) {
  const systemInstruction = customInstruction || buildSystemInstruction(studentName, studentData);

  // Sanitize history: ensure strictly alternating user/model turns, starting with user
  const sanitizedHistory = [];
  if (Array.isArray(history)) {
    for (const msg of history) {
      const role = (msg.role === "assistant" || msg.role === "model") ? "model" : "user";
      const text = (msg.content || "").trim();
      if (!text) continue;
      if (sanitizedHistory.length === 0) {
        if (role === "user") sanitizedHistory.push({ role, parts: [{ text }] });
      } else {
        const last = sanitizedHistory[sanitizedHistory.length - 1];
        if (last.role === role) {
          last.parts[0].text += "\n" + text;
        } else {
          sanitizedHistory.push({ role, parts: [{ text }] });
        }
      }
    }
  }

  // Iterate over models: gemini-2.5-flash-lite returns in ~1s
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
      let textPromise;
      if (sanitizedHistory.length > 0) {
        const chat = model.startChat({ history: sanitizedHistory });
        textPromise = chat.sendMessage(message).then(r => r.response.text());
      } else {
        textPromise = model.generateContent(message).then(r => r.response.text());
      }

      // Max 6s timeout per model - guarantees it NEVER hangs for 50s!
      const reply = await withTimeout(textPromise, 6000);
      if (reply && reply.trim()) {
        return reply.trim();
      }
    } catch (err) {
      console.warn(`Model ${modelName} failed (${err.message}), trying next...`);
    }
  }

  // Safe fallback
  return buildLocalReply(studentName, message, studentData);
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
    try {
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS school_level VARCHAR(50) DEFAULT 'Lise (YKS)'`);
    } catch(e) {}
    try {
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name VARCHAR(50) DEFAULT NULL`);
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS topic_curriculum (
        id SERIAL PRIMARY KEY,
        grade VARCHAR(10) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        topic_name VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_topic_progress (
        id SERIAL PRIMARY KEY,
        student_name VARCHAR(255) NOT NULL,
        topic_id INT REFERENCES topic_curriculum(id) ON DELETE CASCADE,
        is_completed BOOLEAN DEFAULT TRUE,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_name, topic_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS deletion_requests (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
    const { fullName, username, password, inviteCode, schoolLevel, className } = req.body;
    
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
      "INSERT INTO students (full_name, username, password_hash, teacher_id, school_level, class_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, username, teacher_id, school_level, class_name",
      [fullName, username, passwordHash, teacherId, schoolLevel || 'Lise (YKS)', className || null]
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
    const { fullName, username, password, teacherId, schoolLevel, className } = req.body;
    
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
      "INSERT INTO students (full_name, username, password_hash, teacher_id, school_level, class_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, username, teacher_id, school_level, class_name",
      [fullName, username, passwordHash, teacherId, schoolLevel || 'Lise (YKS)', className || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23503') {
      return res.status(401).json({ error: "Oturumunuz geçersiz veya eski bir hesaptan işlem yapıyorsunuz. Lütfen ÇIKIŞ YAP butonuna basıp tekrar giriş yapın." });
    }
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post("/api/auth/teacher/login", async (req, res) => {
  try {
    const { username, password } = req.body;

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
    const teacher_id = req.query.teacher_id || req.query.teacherId;
    let result;
    if (teacher_id && teacher_id !== 'ALL') {
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
app.get("/api/student-info/:studentName", async (req, res) => {
  try {
    const { studentName } = req.params;
    const result = await pool.query(
      "SELECT school_level, class_name FROM students WHERE full_name = $1 LIMIT 1",
      [studentName]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

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
      SELECT l.student_name, 
             SUM(l.duration_minutes) as total_duration, 
             SUM(l.questions_solved) as total_questions,
             (SUM(l.duration_minutes) + (SUM(l.questions_solved) * 2)) as total_points,
             MAX(s.school_level) as school_level
      FROM study_logs l
      LEFT JOIN students s ON l.student_name = s.full_name
      GROUP BY l.student_name 
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
      SELECT l.student_name, 
             SUM(l.duration_minutes) as total_duration, 
             SUM(l.questions_solved) as total_questions,
             (SUM(l.duration_minutes) + (SUM(l.questions_solved) * 2)) as total_points,
             MAX(s.school_level) as school_level
      FROM study_logs l
      LEFT JOIN students s ON l.student_name = s.full_name
      WHERE DATE(l.created_at) = CURRENT_DATE
      GROUP BY l.student_name 
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
    const teacher_id = req.query.teacher_id || req.query.teacherId;
    let filterClause = "";
    let queryParams = [];

    if (teacher_id && teacher_id !== 'ALL') {
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
      SELECT id, full_name as name, class_name, school_level, username
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
// 9. Teacher Delete Student
app.delete("/api/teacher/student/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get student details to delete related goals and logs
    const studentQuery = await pool.query("SELECT full_name FROM students WHERE id = $1", [id]);
    if (studentQuery.rows.length === 0) {
      return res.status(404).json({ error: "Öğrenci bulunamadı" });
    }
    const studentName = studentQuery.rows[0].full_name;

    await pool.query("DELETE FROM student_goals WHERE student_name = $1", [studentName]);
    await pool.query("DELETE FROM study_logs WHERE student_name = $1", [studentName]);
    await pool.query("DELETE FROM students WHERE id = $1", [id]);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

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

// Update student class/level (teacher edits existing student)
app.put("/api/students/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { className, schoolLevel } = req.body;
    const result = await pool.query(
      "UPDATE students SET class_name = $1, school_level = $2 WHERE id = $3 RETURNING id, full_name, class_name, school_level",
      [className || null, schoolLevel, studentId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Öğrenci bulunamadı." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- TOPIC CURRICULUM & PROGRESS ---

// Get all curriculum grouped by grade and subject
app.get("/api/curriculum", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, grade, subject, topic_name, sort_order FROM topic_curriculum ORDER BY grade, subject, sort_order"
    );
    // Group by grade -> subject -> topics
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.grade]) grouped[row.grade] = {};
      if (!grouped[row.grade][row.subject]) grouped[row.grade][row.subject] = [];
      grouped[row.grade][row.subject].push({ id: row.id, topic_name: row.topic_name, sort_order: row.sort_order });
    });
    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Seed curriculum if empty
app.post("/api/curriculum/seed", async (req, res) => {
  try {
    const existing = await pool.query("SELECT COUNT(*) FROM topic_curriculum");
    if (parseInt(existing.rows[0].count) > 0) {
      return res.json({ message: "Already seeded", count: existing.rows[0].count });
    }
    const { topics } = req.body;
    for (const t of topics) {
      await pool.query(
        "INSERT INTO topic_curriculum (grade, subject, topic_name, sort_order) VALUES ($1, $2, $3, $4)",
        [t.grade, t.subject, t.topic_name, t.sort_order]
      );
    }
    res.json({ message: "Seeded successfully", count: topics.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get student's completed topic IDs
app.get("/api/topics/progress/:studentName", async (req, res) => {
  try {
    const { studentName } = req.params;
    const result = await pool.query(
      "SELECT topic_id FROM student_topic_progress WHERE student_name = $1 AND is_completed = TRUE",
      [decodeURIComponent(studentName)]
    );
    res.json(result.rows.map(r => r.topic_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark topic as completed
app.post("/api/topics/progress", async (req, res) => {
  try {
    const { studentName, topicId } = req.body;
    await pool.query(
      "INSERT INTO student_topic_progress (student_name, topic_id, is_completed) VALUES ($1, $2, TRUE) ON CONFLICT (student_name, topic_id) DO UPDATE SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP",
      [studentName, topicId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Unmark topic
app.delete("/api/topics/progress", async (req, res) => {
  try {
    const { studentName, topicId } = req.body;
    await pool.query(
      "DELETE FROM student_topic_progress WHERE student_name = $1 AND topic_id = $2",
      [studentName, topicId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get topic progress summary for all students of a teacher
app.get("/api/topics/teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    // Get all students of this teacher
    const students = await pool.query(
      "SELECT full_name FROM students WHERE teacher_id = $1",
      [teacherId]
    );
    const result = [];
    for (const student of students.rows) {
      const progress = await pool.query(
        "SELECT COUNT(*) as completed FROM student_topic_progress WHERE student_name = $1 AND is_completed = TRUE",
        [student.full_name]
      );
      result.push({
        student_name: student.full_name,
        completed_count: parseInt(progress.rows[0].completed)
      });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// Add a new topic
app.post("/api/curriculum/topic", async (req, res) => {
  try {
    const { grade, subject, topic_name } = req.body;
    if (!grade || !subject || !topic_name) return res.status(400).json({ error: "Eksik alan" });
    const maxOrder = await pool.query(
      "SELECT COALESCE(MAX(sort_order), 0) as max_order FROM topic_curriculum WHERE grade = $1 AND subject = $2",
      [grade, subject]
    );
    const sort_order = parseInt(maxOrder.rows[0].max_order) + 1;
    const result = await pool.query(
      "INSERT INTO topic_curriculum (grade, subject, topic_name, sort_order) VALUES ($1, $2, $3, $4) RETURNING *",
      [grade, subject, topic_name, sort_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Edit a topic name
app.put("/api/curriculum/topic/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { topic_name } = req.body;
    if (!topic_name) return res.status(400).json({ error: "Konu adı boş olamaz" });
    const result = await pool.query(
      "UPDATE topic_curriculum SET topic_name = $1 WHERE id = $2 RETURNING *",
      [topic_name, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Konu bulunamadı" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a topic
app.delete("/api/curriculum/topic/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM topic_curriculum WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add a new subject to a grade
app.post("/api/curriculum/subject", async (req, res) => {
  try {
    const { grade, subject } = req.body;
    if (!grade || !subject) return res.status(400).json({ error: "Eksik alan" });
    const existing = await pool.query(
      "SELECT id FROM topic_curriculum WHERE grade = $1 AND subject = $2 LIMIT 1",
      [grade, subject]
    );
    if (existing.rows.length > 0) return res.status(400).json({ error: "Bu ders zaten mevcut" });
    // Insert a placeholder topic so the subject appears
    await pool.query(
      "INSERT INTO topic_curriculum (grade, subject, topic_name, sort_order) VALUES ($1, $2, $3, 1)",
      [grade, subject, "İlk konuyu ekleyin"]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Reset and re-seed curriculum (force re-seed)
app.post("/api/curriculum/reseed", async (req, res) => {
  try {
    const { topics } = req.body;
    await pool.query("DELETE FROM student_topic_progress");
    await pool.query("DELETE FROM topic_curriculum");
    for (const t of topics) {
      await pool.query(
        "INSERT INTO topic_curriculum (grade, subject, topic_name, sort_order) VALUES ($1, $2, $3, $4)",
        [t.grade, t.subject, t.topic_name, t.sort_order]
      );
    }
    res.json({ message: "Reseed successful", count: topics.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- DELETION REQUESTS ---
app.post("/api/deletion-requests", async (req, res) => {
  try {
    const { name, email, reason } = req.body;
    await pool.query(
      "INSERT INTO deletion_requests (name, email, reason) VALUES ($1, $2, $3)",
      [name, email, reason]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/deletion-requests", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM deletion_requests ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/deletion-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM deletion_requests WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


const aiHandler = async (req, res) => {
  try {
    const action = req.query.action || req.body.action;

    if (action === "chat" || req.url.includes("/chat")) {
      const { studentName, message, history = [], studentData = null } = req.body || {};
      const reply = await generateReply({ studentName, message, history, studentData });
      return res.json({ reply });
    }

    if (action === "coach" || req.url.includes("/coach")) {
      const { studentName, subject, duration, questionsSolved, studentData = null } = req.body || {};
      const prompt = `Öğrenci ${studentName || "öğrenci"} az önce çalışmasını kaydetti. Ders: ${subject || "genel"}. Süre: ${duration || 0} dakika. Çözülen soru: ${questionsSolved || 0}. Enerjik, motive edici, kısa (2-3 cümle) ve emojili geri bildirim ver.`;
      const reply = await generateReply({ studentName, message: prompt, history: [], studentData });
      return res.json({ message: reply });
    }

    if (action === "analyze" || req.url.includes("/analyze")) {
      const { studentName, studentData = null } = req.body || {};
      let prompt;
      if (studentData && Object.keys(studentData.subjects || {}).length > 0) {
        const subjectEntries = Object.entries(studentData.subjects || {}).sort((a, b) => b[1].minutes - a[1].minutes);
        const strongest = subjectEntries[0];
        const weakest = subjectEntries[subjectEntries.length - 1];
        const subjectLines = subjectEntries.map(([s, d]) => `${s}: ${d.minutes} dk, ${d.questions} soru`).join(", ");
        prompt = `Öğrencinin son 7 günlük çalışma analizi yap. Veriler: ${subjectLines}. Toplam: ${studentData.totalMinutes} dakika, ${studentData.totalQuestions} soru. En güçlü ders: ${strongest[0]}. En zayıf ders: ${weakest[0]}. Sadece "soru çöz" demek yerine zaman yönetimi, odaklanma teknikleri ve motivasyon üzerine yaratıcı, kişisel ve farklı bir geri bildirim ver. 3-4 cümle, çok samimi ve emojili.`;
      } else {
        const { logsSummary, strongest, weakest } = req.body || {};
        prompt = `Öğrencinin çalışma verisi: ${logsSummary || "veri yok"}. En güçlü: ${strongest || "belirsiz"}, En zayıf: ${weakest || "belirsiz"}. Yaratıcı ve farklı bir motivasyon ve strateji analizi yap.`;
      }
      const customInstruction = `Sen Merkür Yörünge'nin zeki analiz koçu Merkür AI'sin. Her seferinde tamamen farklı, yaratıcı ve gerçek veriye dayalı analizler sunuyorsun. Asla aynı şeyleri tekrarlama.`;
      const reply = await generateReply({ studentName, message: prompt, history: [], studentData, customInstruction });
      return res.json({ message: reply });
    }

    // Default chat behavior
    const { studentName, message, history = [], studentData = null } = req.body || {};
    const reply = await generateReply({ studentName, message, history, studentData });
    res.json({ reply });
  } catch (err) {
    console.error("AI route error:", err);
    res.status(200).json({ reply: "Şu an bağlantı kurmakta zorlanıyorum ama yardım etmek için buradayım. Biraz sonra tekrar deneyin ✨", error: err.message });
  }
};

app.post("/api/ai", aiHandler);
app.post("/api/ai/chat", aiHandler);
app.post("/api/ai/coach", aiHandler);
app.post("/api/ai/analyze", aiHandler);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
