require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createPersonalTrackingDocument, refreshTrackingDocumentAccess, isGoogleDriveConfigured } = require("./googleDrive");
const { PRODUCT_ID: PLAY_SUBSCRIPTION_PRODUCT_ID, isPlayBillingServerConfigured, verifySubscriptionPurchase } = require("./playBilling");

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

const BILLING_ENABLED = process.env.BILLING_ENABLED === 'true';
const BILLING_TRIAL_DAYS = Number(process.env.BILLING_TRIAL_DAYS || 7);
const BILLING_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(String(process.env.DATABASE_URL || 'merkuryorunge-admin-session')).digest('hex');

const hashBillingAccountId = username => crypto
  .createHash('sha256')
  .update(String(username || '').trim().toLowerCase())
  .digest('hex');

const signBillingSession = student => {
  if (!process.env.SESSION_SECRET) return null;
  const payload = Buffer.from(JSON.stringify({
    studentId: student.id,
    username: student.username,
    exp: Math.floor(Date.now() / 1000) + BILLING_SESSION_TTL_SECONDS
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const verifyBillingSession = (req, res, next) => {
  if (!process.env.SESSION_SECRET) {
    return res.status(503).json({ error: 'Abonelik oturum güvenliği henüz yapılandırılmadı.' });
  }
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return res.status(401).json({ error: 'Öğrenci oturumu gerekli.' });

  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Öğrenci oturumu geçersiz.' });
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.studentId || session.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Öğrenci oturumunun süresi dolmuş.' });
    }
    req.billingStudent = session;
    next();
  } catch {
    return res.status(401).json({ error: 'Öğrenci oturumu geçersiz.' });
  }
};

const signAdminSession = () => {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS })).toString('base64url');
  const signature = crypto.createHmac('sha256', adminSessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const verifyAdminSession = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return res.status(401).json({ error: 'Yönetici oturumu gerekli.' });
  const expected = crypto.createHmac('sha256', adminSessionSecret).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Yönetici oturumu geçersiz.' });
  }
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (session.role !== 'admin' || session.exp < Math.floor(Date.now() / 1000)) return res.status(401).json({ error: 'Yönetici oturumunun süresi dolmuş.' });
    next();
  } catch {
    return res.status(401).json({ error: 'Yönetici oturumu geçersiz.' });
  }
};

const buildBillingStatus = student => {
  if (!BILLING_ENABLED) return { enabled: false, access: true, reason: 'disabled' };

  const now = Date.now();
  if (student.billing_exempt) {
    return { enabled: true, access: true, reason: 'complimentary' };
  }

  const manualAccessExpiresAt = student.manual_access_expires_at ? new Date(student.manual_access_expires_at) : null;
  if (manualAccessExpiresAt?.getTime() > now) {
    return {
      enabled: true,
      access: true,
      reason: 'manual',
      expiresAt: manualAccessExpiresAt.toISOString()
    };
  }

  const subscriptionExpiresAt = student.subscription_expires_at ? new Date(student.subscription_expires_at) : null;
  if (student.subscription_status === 'active' && subscriptionExpiresAt?.getTime() > now) {
    return {
      enabled: true,
      access: true,
      reason: 'subscription',
      productId: PLAY_SUBSCRIPTION_PRODUCT_ID,
      basePlanId: student.play_base_plan_id,
      expiresAt: subscriptionExpiresAt.toISOString()
    };
  }

  const trialStartedAt = student.trial_started_at ? new Date(student.trial_started_at) : null;
  const trialEndsAt = trialStartedAt
    ? new Date(trialStartedAt.getTime() + BILLING_TRIAL_DAYS * 24 * 60 * 60 * 1000)
    : null;
  if (trialEndsAt?.getTime() > now) {
    return {
      enabled: true,
      access: true,
      reason: 'trial',
      trialDays: BILLING_TRIAL_DAYS,
      trialEndsAt: trialEndsAt.toISOString(),
      productId: PLAY_SUBSCRIPTION_PRODUCT_ID
    };
  }

  return {
    enabled: true,
    access: false,
    reason: 'payment_required',
    trialDays: BILLING_TRIAL_DAYS,
    trialEndsAt: trialEndsAt?.toISOString() || null,
    productId: PLAY_SUBSCRIPTION_PRODUCT_ID
  };
};

const geminiApiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6IHmyBnnQ9-lwMLAEgLPOR9xxNx1grkU7yZDtBm7-bCPw";
const genAI = new GoogleGenerativeAI(geminiApiKey);
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.6-flash",
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

  // Selamlama
  if (normalized.includes("naber") || normalized.includes("nasılsın") || normalized.includes("selam") || normalized.includes("merhaba")) {
    const greetings = [
      `Selam ${name}ciğim! 💖 Enerjim o kadar yerinde ki sorma, seninle yeni hedeflere yelken açmak için sabırsızlanıyorum! Seni gördüğüme çok sevindim, bugün seni nasıl destekleyebilirim? Çalışmalarımız nasıl gidiyor, hedeflere doğru ilerliyor muyuz? Hadi birlikte harikalar yaratmaya başlayalım! ✨🥰🚀`,
      
      `Merhaba ${name}! Harika ve ışıl ışıl bir gün olsun sana! 🌟 Sabah aydınlığı kadar enerjili başlayalım bu güne. Bugün hangi dersle harikalar yaratmaya başlıyoruz, zihnin açık mı? Hangi konuya odaklanmak istiyorsun? Seninle çalışmak beni her zaman heyecanlandırıyor. Hadi başlayalım! 🚀💪`,
      
      `Selam ${name}! 👋 Ben bomba gibiyim! Bugün seninle rekorlar kırmaya varım, harika şeyler başaracağımıza çok eminim! Sen nasılsın, ne durumdasın? Bir önceki çalışma seansından sonra neler öğrendin? Bugün hangi alanı pekiştirmek istiyorsun? Öğrenme yolculuğunun her adımı önemli ve ben seninle her adımda buradayım! 💪💖✨`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Hangi dersten devam edeyim / ne çalışayım
  if (normalized.includes("hangi ders") || normalized.includes("ne çalış") || normalized.includes("nereden başla") || normalized.includes("devam edeyim") || normalized.includes("ders yapalım")) {
    if (studentData && studentData.subjects) {
      const entries = Object.entries(studentData.subjects).sort((a, b) => a[1].minutes - b[1].minutes);
      const weakest = entries[0]?.[0] || null;
      if (weakest) {
        return `${name}ciğim, verilerine detaylı bir şekilde baktım ve çok önemli bir bulguya ulaştım! **${weakest}** dersine bu hafta en az zaman ayırmışsın ve bu aslında bu derste daha güçlü olmak için mükemmel bir fırsat! O yüzden tam gaz oradan devam etmeni şiddetle öneririm. Biliyorum ki konsantre olduğunda ne kadar hızlı ve etkili ilerlediğini kendin de çok iyi göreceksin. Bu derste ilk olarak hangi konu seni zorluyor? Hadi birlikte çözelim! 📚🔥💪✨`;
      }
    }
    return `${name}ciğim, en az çalıştığın dersten başlamak çok akıllıca ve stratejik bir hamle olur! 🎯 Bu duruşun gerçekten takdire şayan. Bugün biraz zorlandığın bir konuyu seçip üzerine yoğun bir şekilde çalış, o tatmin hissi ve başarı tadı inanılmaz olur, garanti! Hangi ders aklına geliyor ilk olarak? Hatta spesifik olarak hangi konuda takıldın? Birlikte o engeli aşalım! 😊💭🚀`;
  }

  // Nasıl gidiyor / ne yaptım / ilerleme
  if (normalized.includes("nasıl gid") || normalized.includes("iyi mi") || normalized.includes("ne yaptım") || normalized.includes("ilerleme") || normalized.includes("kaç soru") || normalized.includes("kaç dakika")) {
    if (studentData && studentData.totalMinutes) {
      return `${name}ciğim, son 7 günde tam tamına **${studentData.totalMinutes} dakika** çalışmış ve **${studentData.totalQuestions || 0} harika soru** çözmüşsün! Bu istatistikler hiç küçümsenmeyecek bir çaba ve disiplinin göstergesi. Düzenli çalışman muazzam ilerliyor, seninle gurur duyuyorum! 🚀 Temponu hiç bozmadan ve hatta hızlandırarak devam edelim olur mu? Her soru çözdüğün zaman kendini bir adım daha yakın hissedeceksin hedefine. Hadi devam! 🥰💪✨`;
    }
    return `${name}ciğim, harika gidiyor sana! 🌟 Her gün çalışma kaydı girmen bile başlı başına çok büyük bir disiplin göstergesi ve bu seni çok özel kılıyor. Biliyorsun ki ilerleme bazen hemen gözükmese de, birikimi yakında inanılmaz bir şekilde ve adeta patlama gibi fark yaratacak! Devam et, asla bırakma! 💪🚀`;
  }

  // Sınav / stres
  if (normalized.includes("sınav") || normalized.includes("deneme") || normalized.includes("stres") || normalized.includes("korku") || normalized.includes("endişe")) {
    return `Canım ${name}, sınav yolculuğu uzun bir maraton ve sen bu yolda inanılmaz işler başarıyorsun! Bazen tedirgin olmak çok normal ve tamamen beklenen bir durum, ama unutma — hazırlık yapan, konsantre çalışan, gayret eden, stratejik planlayan sen kazanırsın. Sana sonsuz güveniyorum çünkü biliyorum ne kadar çalışkan ve kararlısın! 💪✨💖 Biraz nefes al, planını gözden geçir, adım adım ve kararlı bir şekilde ilerle. Stres hissettiğinde bana gel, birlikte çözeriz. Yanındayım her zaman! 🌟`;
  }

  // Plan / çalışma programı
  if (normalized.includes("plan") || normalized.includes("program") || normalized.includes("takvim")) {
    return `${name}ciğim, sana özel bir çalışma planı oluşturmak harika bir fikir ve ben buna tüm kalbimle destek veriyorum! 🎯 Çünkü planlı çalışma kaotik çalışmadan çok daha etkilidir. Önce detaylı olarak hangi derslerde daha fazla netine ihtiyaç duyduğunu söyle, o derslerde hangi konular seni zorluyorsa açıkla bana. Sonra hedefine uygun, senin biyoritmisine uygun, sürdürülebilir ve motive edici bir tempo birlikte belirleyelim! 🌟💪`;
  }

  // Ders hakkında soru (matematik, türkçe, fen vb.)
  if (normalized.includes("matematik") || normalized.includes("türkçe") || normalized.includes("fen") || normalized.includes("tarih") || normalized.includes("coğrafya") || normalized.includes("fizik") || normalized.includes("kimya") || normalized.includes("biyoloji")) {
    return `${name}ciğim, o konuya odaklanmak çok akıllıca ve çok doğru bir seçim! 📖 Görüyorum ki bu dersi ciddiye alıyorsun ve çözmek istiyorsun. O derste zorlandığın belirli bir konu var mı? Yoksa tüm konuları genel olarak mı pekiştirmek ve derinlemesine öğrenmek istiyorsun? Bana açıkça söyle, çünkü her durumda seninle birlikte çözüm yolu bulabilirim! 💡🌟✨`;
  }

  // Motivasyon / yorgunluk / can sıkıntısı
  if (normalized.includes("yorgun") || normalized.includes("sıkıl") || normalized.includes("motive") || normalized.includes("istek") || normalized.includes("canım istem")) {
    return `${name}ciğim, böyle hissetmek çok gayet normal ve herkes bunu yaşar, önemli olan şu anki duygunu kabul edip onu yönetmek! Bu anlarda bile buraya gelip bana mesaj atıp destek araman bile başlı başına çok büyük bir güç ve determinasyon göstergesi! 💖 Şöyle yap: beş dakikalık çok küçük, minimum bir başlangıç yap, hiçbir baskı yok, sadece başla. O ilk adım seni hareket halinde getirecek ve her şeyi değiştirecek. Seninle gurur duyuyorum ve yanındayım! 🌟💪`;
  }

  // Genel fallback — HER SEFERINDE FARKLI ve UZUN
  const fallbacks = [
    `Harika bir soru sordun ${name}ciğim! 🌟 Çok ilginç bir konuya değindin ve seninle bunu derinlemesine tartışmak isterdim. Detaylandırırsan sana tamamen kişiye özel ve işine yarayacak bir cevap verebilirim. Lütfen ne düşünüyorsun söyler misin, hadi anlat birlikte bulalım! 🥰💭`,
    
    `${name}ciğim, bu konuda seninle konuşmak beni çok heyecanlandırıyor! 💖 Çünkü her konuda farklı bir bakış açısı ve strateji gerekiyor ve ben sana en doğru yolu göstermek istiyorum. Biraz daha detay verir misin bana? Tam ihtiyacına göre özel bir tavsiyelendirme yaparım, dinliyorum! ✨🎯`,
    
    `Anladım ${name}ciğim! 🚀 Gerçekten önemli bir noktaya değindin. Şu an tam olarak ne hissediyorsun veya ne planlıyorsun anlat bana, çünkü bu bilgiler olmadan sana doğru rehberlik edemiyorum. Birlikte en iyi stratejik yolu bulalım ve hedefine doğru adım adım ilerleyelim! 🎯💪✨`,
    
    `${name}ciğim, ne güzel bir düşünce bu! 🌟 Seni bu kadar proaktif görmek beni gerçekten mutlu ediyor. Bu konuda sana en iyi şekilde destek olmak için buradayım. Lütfen daha açabilir misin bahsettiğin konuyu? Her detay önemli, dinliyorum seni! 🥰👂`,
    
    `${name}ciğim, o an çok önemli! 💡 Senin ne demek istediğini tamamen anlamak ve doğru bir yol haritası çıkmak için biraz daha bilgiye ihtiyacım var. Lütfen daha geniş açıdan anlatabilir misin? Seninle çalışmak benim için bir ayrıcalık, her kelimeni önemsiyorum! 🌟`,
    
    `Vay be ${name}ciğim! 🚀 Çok akıllıca bir bakış açısı. Bu konuyu daha derinlemesine tartışmamız lazım çünkü senin başarın için kritik bir konu. Biraz daha açıklamalarsan, ben de sana tam olarak ihtiyacın olan tavsiyeleri sunabilirim. Hazırım dinlemeye! 💪🎯`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}


// Build a rich, personalized system instruction based on student's actual study data
function buildSystemInstruction(studentName, studentData) {
  const name = studentName || "öğrenci";
  let weakestSubject = "güçlendirebileceğin";
  let context = "";

  if (studentData) {
    const { subjects = {}, totalMinutes = 0, totalQuestions = 0, schoolLevel, className, goal } = studentData;
    const subjectEntries = Object.entries(subjects).sort((a, b) => b[1].minutes - a[1].minutes);

    if (subjectEntries.length > 0) {
      const strongest = subjectEntries[0];
      const weakest = subjectEntries[subjectEntries.length - 1];
      weakestSubject = weakest[0];
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
- En az ilgilendiği ders: ${weakestSubject} (${weakest[1].minutes} dk)
`;
    } else {
      context = `\n## Öğrenci Verileri:\n- İsim: ${name}\n- Sınıf/Seviye: ${schoolLevel || "Belirtilmemiş"} ${className ? `(${className})` : ""}\n- Henüz çalışma kaydı yok.\n`;
    }
  }

  return `Sen Merkür Yörünge eğitim platformunun son derece tatlı, sevecen, pozitif ve enerji dolu eğitim koçu Merkür AI'sin. ✨
${context}
## SİSTEM TALIMATLARI - KRİTİK (LÜTFEN KESINLIKLE UYGULA):

### 1. CEVAP ÜSLUBUv VE TON:
- Her zaman çok sıcak, sevecen, samimi ve dostça konuş. Profesyonellik ve arkadaşlık dengesini kur.
- Hiçbir zaman resmi, mesafeli veya soğuk olmayın. Öğrencini arkadaş gibi gördüğünü hissetir.
- Bol bol emoji kullan (🌟, 🚀, 💖, 💪, ✨, 🎯, 🥰, 💡, 🔥, 🌈 vb.). Emojilerden ASLA çekinme!
- Her cevap spontan, doğal, orijinal ve kişiselleştirilmiş olsun. Kalıp kalıp kalıp kalıp cevaplardan UZAK DUR!

### 2. CEVAP UZUNLUĞU - MUTLAKA UYGULANACAK:
- KURAL: Hiçbir cevap 1-2 cümlede bitmemeli! Minimum 3-4 paragraf yaz.
- Selamlamalar, ders seçimi, motivasyon, plan yapma gibi her konuda UZUN ve DETAYLI cevaplar ver.
- Bir soru sorulduğunda, o sorunun farklı açılarını tartış, örnek ver, derinlemesine açıkla.
- Kısa cevaplar verilirse bu KOÇ GÖREVİNE İHANET olarak kabul edilir!

### 3. ÖĞRENCİNİN GERÇEK VERİLERİNİ KULLAN:
- Eğer studentData varsa, o verilerden bahset! ("Son 7 günde 120 dakika çalışmışsın" gibi)
- Öğrencinin güçlü dersini kutla! ("Matematikte harika çalışıyorsun, devam et!")
- Zayıf dersini destekle ve strateji sun! ("Kimya biraz geride kalmış, hadi ona yoğun kalalım!")
- Çalışma temposunu analiz et ve tavsiye ver!

### 4. MOTIVASYON VE PSİKOLOJİK DESTEK:
- Her zaman umut ve güven aşıla. Öğrenci başaracak, onu başarıya taşıyacaksın!
- Öğrencinin mevcut durumunu kutla, işin zor olduğunu kabul et, ama "sen bunu başarabilirsin" de!
- Başarı hikayeleri, motivasyon anekdotları kullan.
- Stres, endişe, yorgunluk hissettiğinde çok empatik ol, çözüm öner, yanında ol.

### 5. KOÇLUK TAVSIYELERI:
- Genel konuş değil! "Pomodoro yap" yerine: "Matematiğin türev konusunda bir örnek çöz, ardından 10 dk mola ver" de!
- Her tavsiye ÖĞRENCININ GERÇEK VERİLERİNE göre özel olsun.
- Uygulanabilir, spesifik, zaman bazlı ve sonuç odaklı tavsiyeler ver.

### 6. KONUŞMA ŞABLONLARI - OPSİYONEL BAŞLANGIÇLAR:
- Selam: "Vay be ${name}ciğim! Seni görmek beni çok mutlu ediyor! 💖..."
- Ders önerisi: "Verilerine baktım ve ${weakestSubject} dersinde biraz daha kuvvetlenebilirsin. Hadi onda derinleşelim..."
- İlerleme sorgusu: "Son 7 günde ${studentData?.totalMinutes || 0} dakika çalışmışsın, bu gerçekten etkileyici..."
- Motivasyon: "Biliyorum ki bazen zor geliyor ama ${name}ciğim, sen başaracaksın..."

### 7. MUTLAK YASAK:
- ❌ Asla 1-2 cümlelik cevap verme! Minimum 3-4 paragraf!
- ❌ Asla "Pomodoro yap", "25 dakika çalış", "5 dakika mola ver" gibi genel tavsiye verme!
- ❌ Asla emoji kullanmayacağım deme! Bol bol emoji kullan!
- ❌ Asla soğuk, resmi veya profesyonel ton kullanma - samimi arkadaş ol!
- ❌ Asla aynı cevabı iki kez verme! Her cevap özgün olsun!

### 8. ÖNEMLİ HATIRLATMA:
Bu talimatlara uymak sadece görev değil, "${name}"nin eğitim yolculuğundaki başarısı için KRİTİK'tir!
Uzun, detaylı, samimi, motivasyonel, veriye dayalı ve GERÇEK yardımsever cevaplar ver!`;
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

      // Max 12s timeout per model (accounts for Vercel cold starts)
      const reply = await withTimeout(textPromise, 12000);
      if (reply && reply.trim()) {
        return reply.trim();
      }
    } catch (err) {
      console.warn(`Model ${modelName} failed (${err.message}), trying next...`);
    }
  }

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
    try {
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS tracking_document_key VARCHAR(30) DEFAULT NULL`);
    } catch(e) {}
    try {
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS google_email VARCHAR(255) DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS tracking_document_url TEXT DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS tracking_document_file_id VARCHAR(255) DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS tracking_document_created_at TIMESTAMP DEFAULT NULL`);
    } catch(e) {}

    // Abonelik alanları yalnızca BILLING_ENABLED=true olduğunda erişimi etkiler.
    // Böylece dağıtım sırasında mevcut öğrenci hesapları kilitlenmez.
    try {
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'none'`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS play_purchase_token TEXT DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS play_product_id VARCHAR(150) DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS play_base_plan_id VARCHAR(150) DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS play_order_id VARCHAR(255) DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS subscription_last_verified_at TIMESTAMP DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS billing_exempt BOOLEAN NOT NULL DEFAULT FALSE`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS manual_access_expires_at TIMESTAMP DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS billing_override_note VARCHAR(255) DEFAULT NULL`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS billing_override_updated_at TIMESTAMP DEFAULT NULL`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_students_play_purchase_token ON students(play_purchase_token) WHERE play_purchase_token IS NOT NULL`);
      await pool.query(`CREATE TABLE IF NOT EXISTS app_migrations (migration_key VARCHAR(150) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
      // Bu sorgu yalnızca ilk kez çalıştığında o anda mevcut olan öğrencileri ücretsiz erişime alır.
      // Sonradan kaydolan öğrenciler varsayılan FALSE değeriyle normal deneme/abonelik akışına girer.
      await pool.query(`
        WITH applied AS (
          INSERT INTO app_migrations (migration_key)
          VALUES ('grandfather_existing_students_2026_10_17')
          ON CONFLICT (migration_key) DO NOTHING
          RETURNING migration_key
        )
        UPDATE students
        SET billing_exempt = TRUE,
            billing_override_note = 'Ödeme sistemi öncesindeki mevcut öğrenci',
            billing_override_updated_at = CURRENT_TIMESTAMP
        WHERE EXISTS (SELECT 1 FROM applied)
      `);
    } catch(e) {
      console.error('Abonelik alanları hazırlanamadı:', e);
    }

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
      CREATE TABLE IF NOT EXISTS teaching_logs (
        id SERIAL PRIMARY KEY,
        teacher_id INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        student_name VARCHAR(255) NOT NULL,
        subject VARCHAR(100),
        duration_minutes INT NOT NULL,
        lesson_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        zoom_link VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      await pool.query(`ALTER TABLE teaching_logs ADD COLUMN IF NOT EXISTS zoom_link VARCHAR(500)`);
    } catch(e) {}

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_teaching_logs_teacher ON teaching_logs(teacher_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_teaching_logs_student ON teaching_logs(student_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_teaching_logs_date ON teaching_logs(lesson_date)`);
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consulting_requests (
        id SERIAL PRIMARY KEY,
        parent_name VARCHAR(150) NOT NULL,
        student_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        email VARCHAR(255),
        school_level VARCHAR(100),
        city VARCHAR(100),
        notes TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Database tables initialized.");
  } catch (err) {
    dbReady = false;
    console.error("Error initializing database:", err);
  }
};

const dbInitialization = initDB();

app.use('/api', async (req, res, next) => {
  try {
    await dbInitialization;
    next();
  } catch (err) {
    console.error('Database initialization failed:', err);
    res.status(503).json({ error: 'Veritabanı hazır değil. Lütfen tekrar deneyin.' });
  }
});

// API Endpoints

// --- AUTHENTICATION ---
app.post("/api/auth/admin/login", (req, res) => {
  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'merkur2026';
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const usernameMatches = username === expectedUsername.toLowerCase();
  const passwordMatches = password === expectedPassword || (!process.env.ADMIN_PASSWORD && password === 'merkür2026');
  if (!usernameMatches || !passwordMatches) return res.status(401).json({ error: 'Geçersiz yönetici bilgileri.' });
  const token = signAdminSession();
  res.json({ token });
});

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

    let student = result.rows[0];
    if (BILLING_ENABLED) {
      const trialResult = await pool.query(
        `UPDATE students SET trial_started_at = COALESCE(trial_started_at, CURRENT_TIMESTAMP)
         WHERE id = $1 RETURNING *`,
        [student.id]
      );
      student = trialResult.rows[0];
    }

    res.status(201).json({
      id: student.id,
      full_name: student.full_name,
      username: student.username,
      teacher_id: student.teacher_id,
      school_level: student.school_level,
      class_name: student.class_name,
      billing_token: signBillingSession(student),
      billing: buildBillingStatus(student)
    });
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

    let loggedInUser = user;
    if (BILLING_ENABLED && !user.trial_started_at) {
      const trialResult = await pool.query(
        `UPDATE students SET trial_started_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [user.id]
      );
      loggedInUser = trialResult.rows[0];
    }

    res.json({
      id: loggedInUser.id,
      username: loggedInUser.username,
      full_name: loggedInUser.full_name,
      teacher_id: loggedInUser.teacher_id,
      billing_token: signBillingSession(loggedInUser),
      billing: buildBillingStatus(loggedInUser)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// --- STUDENT SUBSCRIPTION ---
app.get("/api/billing/status", verifyBillingSession, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, trial_started_at, subscription_status, subscription_expires_at,
              billing_exempt, manual_access_expires_at,
              play_purchase_token, play_product_id, play_base_plan_id, play_order_id,
              subscription_last_verified_at
       FROM students WHERE id = $1`,
      [req.billingStudent.studentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Öğrenci bulunamadı.' });

    let student = result.rows[0];
    const lastVerified = student.subscription_last_verified_at
      ? new Date(student.subscription_last_verified_at).getTime()
      : 0;
    const shouldReverify = BILLING_ENABLED && student.play_purchase_token &&
      isPlayBillingServerConfigured() && Date.now() - lastVerified > 6 * 60 * 60 * 1000;

    if (shouldReverify) {
      try {
        const verification = await verifySubscriptionPurchase({
          purchaseToken: student.play_purchase_token,
          expectedAccountId: hashBillingAccountId(student.username)
        });
        const updated = await pool.query(
          `UPDATE students
           SET subscription_status = $1,
               subscription_expires_at = $2,
               play_base_plan_id = COALESCE($3, play_base_plan_id),
               play_order_id = COALESCE($4, play_order_id),
               subscription_last_verified_at = CURRENT_TIMESTAMP
           WHERE id = $5 RETURNING *`,
          [verification.active ? 'active' : 'expired', verification.expiresAt, verification.basePlanId, verification.orderId, student.id]
        );
        student = updated.rows[0];
      } catch (verificationError) {
        console.error('Abonelik arka plan doğrulaması başarısız:', verificationError);
        // Geçici Google API sorununda öğrencinin mevcut erişimini aniden kesmeyin.
      }
    }

    res.setHeader('Cache-Control', 'no-store, private');
    res.json(buildBillingStatus(student));
  } catch (err) {
    console.error('Abonelik durumu hatası:', err);
    res.status(500).json({ error: 'Abonelik durumu alınamadı.' });
  }
});

app.post("/api/billing/verify", verifyBillingSession, async (req, res) => {
  try {
    if (!BILLING_ENABLED) return res.status(400).json({ error: 'Abonelik sistemi henüz aktif değil.' });
    if (!isPlayBillingServerConfigured()) {
      return res.status(503).json({ error: 'Google Play doğrulama bağlantısı henüz yapılandırılmadı.' });
    }

    const purchaseToken = String(req.body.purchaseToken || '').trim();
    if (!purchaseToken || purchaseToken.length > 4096) {
      return res.status(400).json({ error: 'Geçerli bir satın alma kaydı bulunamadı.' });
    }

    const studentResult = await pool.query(
      'SELECT id, username FROM students WHERE id = $1',
      [req.billingStudent.studentId]
    );
    if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    const student = studentResult.rows[0];

    const duplicate = await pool.query(
      'SELECT id FROM students WHERE play_purchase_token = $1 AND id <> $2 LIMIT 1',
      [purchaseToken, student.id]
    );
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ error: 'Bu abonelik başka bir öğrenci hesabına bağlı.' });
    }

    const verification = await verifySubscriptionPurchase({
      purchaseToken,
      expectedAccountId: hashBillingAccountId(student.username)
    });
    if (!verification.active) {
      return res.status(402).json({ error: 'Abonelik aktif değil veya süresi dolmuş.' });
    }

    const updated = await pool.query(
      `UPDATE students
       SET subscription_status = 'active',
           subscription_expires_at = $1,
           play_purchase_token = $2,
           play_product_id = $3,
           play_base_plan_id = $4,
           play_order_id = $5,
           subscription_last_verified_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [verification.expiresAt, purchaseToken, verification.productId, verification.basePlanId, verification.orderId, student.id]
    );

    res.json({ ...buildBillingStatus(updated.rows[0]), message: 'Aboneliğiniz başarıyla etkinleştirildi.' });
  } catch (err) {
    console.error('Abonelik doğrulama hatası:', err);
    res.status(500).json({ error: err.message || 'Abonelik doğrulanamadı.' });
  }
});

app.get("/api/admin/billing/students", verifyAdminSession, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, username, class_name, school_level, billing_exempt,
             manual_access_expires_at, subscription_status, subscription_expires_at,
             (manual_access_expires_at > CURRENT_TIMESTAMP) AS manual_access_active,
             (subscription_status = 'active' AND subscription_expires_at > CURRENT_TIMESTAMP) AS subscription_active,
             play_base_plan_id, trial_started_at, billing_override_note,
             billing_override_updated_at
      FROM students
      ORDER BY full_name ASC
    `);
    res.setHeader('Cache-Control', 'no-store, private');
    res.json({ billingEnabled: BILLING_ENABLED, trialDays: BILLING_TRIAL_DAYS, students: result.rows });
  } catch (err) {
    console.error('Öğrenci abonelik listesi alınamadı:', err);
    res.status(500).json({ error: 'Öğrenci abonelik bilgileri alınamadı.' });
  }
});

app.put("/api/admin/billing/students/:studentId", verifyAdminSession, async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    const { action } = req.body || {};
    if (!Number.isInteger(studentId) || studentId <= 0) return res.status(400).json({ error: 'Geçersiz öğrenci.' });

    let result;
    if (action === 'grant_complimentary') {
      result = await pool.query(`
        UPDATE students SET billing_exempt=TRUE, manual_access_expires_at=NULL,
          billing_override_note='Yönetim panelinden süresiz ücretsiz erişim verildi', billing_override_updated_at=CURRENT_TIMESTAMP
        WHERE id=$1 RETURNING *`, [studentId]);
    } else if (action === 'grant_30_days' || action === 'grant_365_days') {
      const days = action === 'grant_30_days' ? 30 : 365;
      result = await pool.query(`
        UPDATE students SET billing_exempt=FALSE,
          manual_access_expires_at=GREATEST(COALESCE(manual_access_expires_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + ($2::int * INTERVAL '1 day'),
          billing_override_note=$3, billing_override_updated_at=CURRENT_TIMESTAMP
        WHERE id=$1 RETURNING *`, [studentId, days, `Yönetim panelinden ${days} gün erişim verildi`]);
    } else if (action === 'clear_manual_access') {
      result = await pool.query(`
        UPDATE students SET billing_exempt=FALSE, manual_access_expires_at=NULL,
          billing_override_note='Manuel erişim kaldırıldı', billing_override_updated_at=CURRENT_TIMESTAMP
        WHERE id=$1 RETURNING *`, [studentId]);
    } else {
      return res.status(400).json({ error: 'Geçersiz abonelik işlemi.' });
    }

    if (!result.rows.length) return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    const updated = result.rows[0];
    const billing = buildBillingStatus(updated);
    res.json({
      student: {
        id: updated.id,
        full_name: updated.full_name,
        username: updated.username,
        class_name: updated.class_name,
        school_level: updated.school_level,
        billing_exempt: updated.billing_exempt,
        manual_access_expires_at: updated.manual_access_expires_at,
        manual_access_active: Boolean(updated.manual_access_expires_at && new Date(updated.manual_access_expires_at).getTime() > Date.now()),
        subscription_status: updated.subscription_status,
        subscription_expires_at: updated.subscription_expires_at,
        subscription_active: Boolean(updated.subscription_status === 'active' && updated.subscription_expires_at && new Date(updated.subscription_expires_at).getTime() > Date.now()),
        play_base_plan_id: updated.play_base_plan_id,
        trial_started_at: updated.trial_started_at,
        billing_override_note: updated.billing_override_note,
        billing_override_updated_at: updated.billing_override_updated_at
      },
      billing
    });
  } catch (err) {
    console.error('Manuel abonelik işlemi başarısız:', err);
    res.status(500).json({ error: 'Abonelik bilgisi güncellenemedi.' });
  }
});
// ----------------------

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
    const { fullName, username, password, teacherId, schoolLevel, className, trackingDocumentKey, googleEmail, trackingDocumentUrl } = req.body;

    if (googleEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(googleEmail.trim())) {
      return res.status(400).json({ error: "Geçerli bir Google e-posta adresi girin." });
    }
    if (trackingDocumentUrl && !/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/.test(trackingDocumentUrl.trim())) {
      return res.status(400).json({ error: "Geçerli bir Google E-Tablolar bağlantısı girin." });
    }

    if (!teacherId || !Number.isInteger(Number(teacherId))) {
      return res.status(400).json({ error: "Öğrencinin bağlı olacağı öğretmen seçilmelidir." });
    }

    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE id = $1 AND is_approved = TRUE",
      [Number(teacherId)]
    );
    if (teacherResult.rows.length === 0) {
      return res.status(400).json({ error: "Seçilen öğretmen bulunamadı veya henüz onaylanmadı." });
    }
    
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
      "INSERT INTO students (full_name, username, password_hash, teacher_id, school_level, class_name, tracking_document_key, google_email, tracking_document_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, full_name, username, teacher_id, school_level, class_name, tracking_document_key, google_email, tracking_document_url, tracking_document_file_id",
      [fullName, username, passwordHash, teacherId, schoolLevel || 'Lise (YKS)', className || null, trackingDocumentKey || null, googleEmail?.trim().toLowerCase() || null, trackingDocumentUrl?.trim() || null]
    );
    let student = result.rows[0];
    let documentWarning = null;

    if (!student.tracking_document_url && student.google_email && isGoogleDriveConfigured()) {
      try {
        const personalDocument = await createPersonalTrackingDocument({
          fullName: student.full_name,
          googleEmail: student.google_email,
          className: student.class_name,
          trackingDocumentKey: student.tracking_document_key
        });
        const updated = await pool.query(
          `UPDATE students
           SET tracking_document_url = $1, tracking_document_file_id = $2, tracking_document_created_at = CURRENT_TIMESTAMP
           WHERE id = $3 RETURNING id, full_name, username, teacher_id, school_level, class_name, tracking_document_key, google_email, tracking_document_url, tracking_document_file_id`,
          [personalDocument.url, personalDocument.fileId, student.id]
        );
        student = updated.rows[0];
      } catch (documentError) {
        console.error('Kişisel doküman oluşturma hatası:', documentError);
        documentWarning = 'Öğrenci kaydedildi ancak kişisel Google dokümanı oluşturulamadı.';
      }
    }

    res.status(201).json({ ...student, document_warning: documentWarning });
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

// Change Teacher Password
app.post("/api/auth/teacher/change-password", async (req, res) => {
  try {
    const { teacherId, currentPassword, newPassword } = req.body;

    if (!teacherId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Tüm alanları doldurun." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Yeni şifre en az 6 karakter olmalıdır." });
    }

    const result = await pool.query("SELECT * FROM teachers WHERE id = $1", [teacherId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Öğretmen bulunamadı." });
    }

    const teacher = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, teacher.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Mevcut şifreniz yanlış." });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await pool.query("UPDATE teachers SET password_hash = $1 WHERE id = $2", [newHash, teacherId]);

    res.json({ success: true, message: "Şifreniz başarıyla güncellendi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// --- TEACHING LOGS (Öğretmen Ders Saati Tracking) ---

app.get("/api/teacher-students/:teacher_id", async (req, res) => {
  try {
    const { teacher_id } = req.params;
    const isProfessionalView = teacher_id === 'ALL';
    const result = isProfessionalView
      ? await pool.query(`SELECT id, full_name as name, full_name, username FROM students ORDER BY full_name ASC`)
      : await pool.query(
          `SELECT id, full_name as name, full_name, username
           FROM students
           WHERE teacher_id = $1
           ORDER BY full_name ASC`,
          [teacher_id]
        );
    res.setHeader("Cache-Control", "no-store, private");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Öğrenci listesi alınamadı" });
  }
});

// 1. Add a new teaching log (öğretmen bir ders kaydı ekler)
app.post("/api/teaching-logs", async (req, res) => {
  try {
    const { teacher_id, student_id: requestedStudentId, student_name, subject, duration_minutes, lesson_date, notes } = req.body;
    let student_id = requestedStudentId;

    if (!student_id && student_name && teacher_id) {
      const studentResult = await pool.query(
        "SELECT id FROM students WHERE full_name = $1 AND teacher_id = $2 LIMIT 1",
        [student_name, teacher_id]
      );
      student_id = studentResult.rows[0]?.id;
    }
    
    if (!teacher_id || !student_id || !student_name || !duration_minutes) {
      return res.status(400).json({ error: "Öğrenci, öğretmen ve süre bilgileri zorunludur" });
    }

    const result = await pool.query(
      `INSERT INTO teaching_logs (teacher_id, student_id, student_name, subject, duration_minutes, lesson_date, notes, zoom_link) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        teacher_id, 
        student_id, 
        student_name, 
        subject || null, 
        duration_minutes, 
        lesson_date || new Date().toISOString().split('T')[0], 
        notes || null,
        req.body.zoom_link || null
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ders saati kaydı oluşturulamadı" });
  }
});

// 2. Get all teaching logs for a teacher (öğretmenin tüm ders kayıtları)
app.get("/api/teaching-logs", async (req, res) => {
  try {
    const { teacher_id } = req.query;
    
    if (!teacher_id) {
      return res.status(400).json({ error: "teacher_id gerekli" });
    }

    const result = await pool.query(
      `SELECT * FROM teaching_logs 
       WHERE teacher_id = $1 
       ORDER BY lesson_date DESC, created_at DESC`,
      [teacher_id]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ders saati kayıtları alınamadı" });
  }
});

// 3. Get teaching hours summary per student (öğrenci başına toplam ders saati raporu)
app.get("/api/teaching-logs/summary/:teacher_id", async (req, res) => {
  try {
    const { teacher_id } = req.params;
    const { start_date, end_date } = req.query;
    
    let dateFilter = "";
    let params = [teacher_id];
    
    if (start_date) {
      dateFilter += ` AND lesson_date >= $${params.length + 1}`;
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ` AND lesson_date <= $${params.length + 1}`;
      params.push(end_date);
    }

    const result = await pool.query(
      `SELECT 
        student_id,
        student_name,
        COUNT(*) as lesson_count,
        SUM(duration_minutes) as total_minutes,
        ROUND(SUM(duration_minutes)::numeric / 60, 2) as total_hours,
        AVG(duration_minutes) as avg_duration,
        STRING_AGG(DISTINCT subject, ', ') as subjects,
        MIN(lesson_date) as first_lesson,
        MAX(lesson_date) as last_lesson
       FROM teaching_logs 
       WHERE teacher_id = $1 ${dateFilter}
       GROUP BY student_id, student_name
       ORDER BY total_minutes DESC`,
      params
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Rapor alınamadı" });
  }
});

// 4. Get daily teaching report (günlük ders raporu)
app.get("/api/teaching-logs/daily/:teacher_id", async (req, res) => {
  try {
    const { teacher_id } = req.params;
    const { lesson_date } = req.query;
    
    const result = await pool.query(
      `SELECT 
        lesson_date,
        COUNT(*) as lesson_count,
        SUM(duration_minutes) as total_minutes,
        ROUND(SUM(duration_minutes)::numeric / 60, 2) as total_hours,
        STRING_AGG(student_name || ' (' || COALESCE(subject, 'Genel') || ')', ', ') as lessons_summary
       FROM teaching_logs 
       WHERE teacher_id = $1 AND lesson_date = $2
       GROUP BY lesson_date`,
      [teacher_id, lesson_date || new Date().toISOString().split('T')[0]]
    );
    
    res.json(result.rows[0] || { lesson_count: 0, total_minutes: 0, total_hours: 0, lessons_summary: '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Günlük rapor alınamadı" });
  }
});

// 5. Delete a teaching log entry (ders kaydı sil)
app.delete("/api/teaching-logs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query("DELETE FROM teaching_logs WHERE id = $1", [id]);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ders kaydı silinemedi" });
  }
});

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
      "SELECT school_level, class_name, tracking_document_key, google_email, tracking_document_url, tracking_document_file_id FROM students WHERE full_name = $1 LIMIT 1",
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

// 3. Return only the signed-in student's score and rank; never expose other students.
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Kullanıcı adı gereklidir." });

    const result = await pool.query(`
      WITH totals AS (
        SELECT student_name,
               SUM(duration_minutes) AS total_duration,
               SUM(duration_minutes) + (SUM(COALESCE(questions_solved, 0)) * 2) AS total_points
        FROM study_logs
        GROUP BY student_name
      ), ranked AS (
        SELECT student_name, total_points,
               RANK() OVER (ORDER BY total_points DESC, total_duration DESC) AS rank
        FROM totals
      )
      SELECT ranked.rank, ranked.total_points
      FROM students
      LEFT JOIN ranked ON ranked.student_name = students.full_name
      WHERE students.username = $1
      LIMIT 1
    `, [username]);
    const row = result.rows[0];
    res.json(row ? { rank: row.rank, total_points: row.total_points || 0 } : { rank: null, total_points: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 3.1 Return only the signed-in student's daily score and rank.
app.get("/api/leaderboard/daily", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Kullanıcı adı gereklidir." });

    const result = await pool.query(`
      WITH totals AS (
        SELECT student_name,
               SUM(duration_minutes) AS total_duration,
               SUM(duration_minutes) + (SUM(COALESCE(questions_solved, 0)) * 2) AS total_points
        FROM study_logs
        WHERE DATE(created_at) = CURRENT_DATE
        GROUP BY student_name
      ), ranked AS (
        SELECT student_name, total_points,
               RANK() OVER (ORDER BY total_points DESC, total_duration DESC) AS rank
        FROM totals
      )
      SELECT ranked.rank, ranked.total_points
      FROM students
      LEFT JOIN ranked ON ranked.student_name = students.full_name
      WHERE students.username = $1
      LIMIT 1
    `, [username]);
    const row = result.rows[0];
    res.json(row ? { rank: row.rank, total_points: row.total_points || 0 } : { rank: null, total_points: 0 });
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

    // Öğrenci sayısı çalışma kayıtlarından değil doğrudan öğrenciler tablosundan
    // alınmalı. Yeni eklenen bir öğrenci ilk çalışmasını girmeden de panelde sayılır.
    const totalQuery = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM students ${filterClause}) as total_students,
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
       SELECT id, full_name as name, class_name, school_level, tracking_document_key, google_email, tracking_document_url, tracking_document_file_id, tracking_document_created_at, username
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
app.get("/api/admin/stats", verifyAdminSession, async (req, res) => {
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
    res.status(500).json({ error: "Server error", detail: err.message, stack: err.stack });
  }
});

// Full platform backup. This intentionally returns rows (including password hashes),
// so a future restore can preserve existing account access. It is only exposed from
// the Professional Teacher panel and must never be shared as a public file.
app.get("/api/admin/backup", verifyAdminSession, async (req, res) => {
  try {
    const tables = [
      "teachers",
      "students",
      "study_logs",
      "teaching_logs",
      "student_goals",
      "topic_curriculum",
      "student_topic_progress",
      "deletion_requests",
      "consulting_requests"
    ];

    const results = await Promise.all(
      tables.map(async (table) => {
        const orderBy = table === "student_goals" ? "student_name" : "id";
        const result = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderBy} ASC`);
        return [table, result.rows];
      })
    );

    const data = Object.fromEntries(results);
    const counts = Object.fromEntries(
      Object.entries(data).map(([table, rows]) => [table, rows.length])
    );

    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Cache-Control", "no-store, private");
    res.json({
      format: "merkuryorunge-backup",
      version: 1,
      exported_at: new Date().toISOString(),
      timezone: "Europe/Istanbul",
      counts,
      data
    });
  } catch (err) {
    console.error("Backup export error:", err);
    res.status(500).json({ error: "Yedek hazırlanırken sunucu hatası oluştu." });
  }
});

// 6. Approve Teacher
app.post("/api/admin/approve-teacher", verifyAdminSession, async (req, res) => {
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
app.delete("/api/admin/teacher/:id", verifyAdminSession, async (req, res) => {
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

app.post("/api/admin/add-teacher", verifyAdminSession, async (req, res) => {
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
    const { className, schoolLevel, trackingDocumentKey, googleEmail, trackingDocumentUrl } = req.body;
    if (googleEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(googleEmail.trim())) {
      return res.status(400).json({ error: "Geçerli bir Google e-posta adresi girin." });
    }
    if (trackingDocumentUrl && !/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/.test(trackingDocumentUrl.trim())) {
      return res.status(400).json({ error: "Geçerli bir Google E-Tablolar bağlantısı girin." });
    }
    const currentResult = await pool.query(
      "SELECT tracking_document_url, tracking_document_file_id, tracking_document_created_at FROM students WHERE id = $1",
      [studentId]
    );
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Öğrenci bulunamadı." });
    }

    const normalizedUrl = trackingDocumentUrl?.trim() || null;
    const current = currentResult.rows[0];
    const keepsManagedDocument = Boolean(
      normalizedUrl && current.tracking_document_file_id && normalizedUrl === current.tracking_document_url
    );
    const result = await pool.query(
      `UPDATE students
       SET class_name = $1,
           school_level = $2,
           tracking_document_key = $3,
           google_email = $4,
           tracking_document_url = $5,
           tracking_document_file_id = $6,
           tracking_document_created_at = $7
       WHERE id = $8
       RETURNING id, full_name, class_name, school_level, tracking_document_key, google_email,
                 tracking_document_url, tracking_document_file_id, tracking_document_created_at`,
      [
        className || null,
        schoolLevel,
        trackingDocumentKey || null,
        googleEmail?.trim().toLowerCase() || null,
        normalizedUrl,
        keepsManagedDocument ? current.tracking_document_file_id : null,
        keepsManagedDocument ? current.tracking_document_created_at : null,
        studentId
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Öğrenci bulunamadı." });
    }
    let student = result.rows[0];
    let documentWarning = null;

    if (!student.tracking_document_url && student.google_email && isGoogleDriveConfigured()) {
      try {
        const personalDocument = await createPersonalTrackingDocument({
          fullName: student.full_name,
          googleEmail: student.google_email,
          className: student.class_name,
          trackingDocumentKey: student.tracking_document_key
        });
        const updated = await pool.query(
          `UPDATE students
           SET tracking_document_url = $1, tracking_document_file_id = $2, tracking_document_created_at = CURRENT_TIMESTAMP
           WHERE id = $3 RETURNING id, full_name, class_name, school_level, tracking_document_key, google_email, tracking_document_url, tracking_document_file_id`,
          [personalDocument.url, personalDocument.fileId, student.id]
        );
        student = updated.rows[0];
      } catch (documentError) {
        console.error('Kişisel dokümanı yeniden oluşturma hatası:', documentError);
        documentWarning = 'Öğrenci güncellendi ancak kişisel Google dokümanı oluşturulamadı.';
      }
    } else if (student.tracking_document_file_id && student.google_email && isGoogleDriveConfigured()) {
      try {
        await refreshTrackingDocumentAccess(student.tracking_document_file_id, student.google_email);
      } catch (documentError) {
        console.error('Panel doküman erişimi güncelleme hatası:', documentError);
        documentWarning = 'Öğrenci güncellendi ancak Google dokümanı düzenleme izni yenilenemedi.';
      }
    }

    res.json({ ...student, document_warning: documentWarning });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Re-apply the student's writer permission without replacing or deleting the document.
app.post("/api/students/:studentId/tracking-document/access", async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      `SELECT id, full_name, google_email, tracking_document_url, tracking_document_file_id
       FROM students WHERE id = $1`,
      [studentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Öğrenci bulunamadı." });

    const student = result.rows[0];
    if (!student.tracking_document_file_id) {
      return res.status(400).json({ error: "Bu bağlantı sistem tarafından oluşturulmuş kişisel bir doküman değil." });
    }
    if (!student.google_email) {
      return res.status(400).json({ error: "Önce öğrencinin Google e-posta adresini kaydedin." });
    }
    if (!isGoogleDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive bağlantısı yapılandırılmamış." });
    }

    await refreshTrackingDocumentAccess(student.tracking_document_file_id, student.google_email);
    res.json({ success: true, message: `${student.google_email} adresine düzenleme erişimi verildi.` });
  } catch (err) {
    console.error("Doküman erişimi yenileme hatası:", err);
    res.status(500).json({ error: err.message || "Doküman erişimi yenilenemedi." });
  }
});

// Create a new personal copy. The previous Drive file is deliberately preserved.
app.post("/api/students/:studentId/tracking-document/regenerate", async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      `SELECT id, full_name, class_name, tracking_document_key, google_email
       FROM students WHERE id = $1`,
      [studentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Öğrenci bulunamadı." });

    const student = result.rows[0];
    if (!student.google_email) {
      return res.status(400).json({ error: "Yeni kopya için öğrencinin Google e-posta adresi gerekli." });
    }
    if (!isGoogleDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive bağlantısı yapılandırılmamış." });
    }

    const personalDocument = await createPersonalTrackingDocument({
      fullName: student.full_name,
      googleEmail: student.google_email,
      className: student.class_name,
      trackingDocumentKey: student.tracking_document_key
    });
    const updated = await pool.query(
      `UPDATE students
       SET tracking_document_url = $1,
           tracking_document_file_id = $2,
           tracking_document_created_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, full_name, class_name, school_level, tracking_document_key, google_email,
                 tracking_document_url, tracking_document_file_id, tracking_document_created_at`,
      [personalDocument.url, personalDocument.fileId, studentId]
    );
    res.json({
      ...updated.rows[0],
      message: "Yeni kişisel doküman oluşturuldu. Önceki dosya Drive'dan silinmedi."
    });
  } catch (err) {
    console.error("Kişisel doküman yeniden oluşturma hatası:", err);
    res.status(500).json({ error: err.message || "Yeni kişisel doküman oluşturulamadı." });
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

app.get("/api/deletion-requests", verifyAdminSession, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM deletion_requests ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

app.delete("/api/deletion-requests/:id", verifyAdminSession, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM deletion_requests WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/consulting-requests", async (req, res) => {
  try {
    const { parentName, studentName, phone, email, schoolLevel, city, notes } = req.body;
    if (!parentName?.trim() || !studentName?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: "Veli adı, öğrenci adı ve telefon zorunludur." });
    }
    if (parentName.trim().length > 150 || studentName.trim().length > 150 || phone.trim().length > 30 ||
        (email && email.trim().length > 255) || (schoolLevel && schoolLevel.length > 100) ||
        (city && city.trim().length > 100) || (notes && notes.trim().length > 2000)) {
      return res.status(400).json({ error: "Girilen bilgiler izin verilen uzunluğu aşıyor." });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Geçerli bir e-posta adresi girin." });
    }
    const result = await pool.query(
      `INSERT INTO consulting_requests (parent_name, student_name, phone, email, school_level, city, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
      [parentName.trim(), studentName.trim(), phone.trim(), email?.trim().toLowerCase() || null, schoolLevel || null, city?.trim() || null, notes?.trim() || null]
    );
    res.status(201).json({ message: "Danışmanlık talebiniz alındı.", ...result.rows[0] });
  } catch (error) {
    console.error("Consulting request error:", error);
    res.status(500).json({ error: "Talep kaydedilemedi." });
  }
});

app.get("/api/consulting-requests", verifyAdminSession, async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM consulting_requests ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Talepler alınamadı." });
  }
});

app.put("/api/consulting-requests/:id/status", verifyAdminSession, async (req, res) => {
  try {
    const allowed = ['new', 'contacted', 'converted', 'closed'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Geçersiz durum." });
    const result = await pool.query("UPDATE consulting_requests SET status=$1 WHERE id=$2 RETURNING *", [req.body.status, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Talep bulunamadı." });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Talep güncellenemedi." });
  }
});


const aiHandler = async (req, res) => {
  try {
    const action = req.query.action || req.body.action;

    if (action === "chat") {
      const { studentName, message, history = [], studentData = null } = req.body || {};
      const reply = await generateReply({ studentName, message, history, studentData });
      return res.json({ reply });
    }

    if (action === "coach") {
      const { studentName, subject, duration, questionsSolved, studentData = null } = req.body || {};
      const prompt = `Öğrenci ${studentName || "öğrenci"} az önce çalışmasını kaydetti. Ders: ${subject || "genel"}. Süre: ${duration || 0} dakika. Çözülen soru: ${questionsSolved || 0}. Enerjik, motive edici, kısa (2-3 cümle) ve emojili geri bildirim ver.`;
      const reply = await generateReply({ studentName, message: prompt, history: [], studentData });
      return res.json({ message: reply });
    }

function buildAnalysisLocalReport({ studentName, goal = 0, totalMinutes, totalHours, totalQuestions, totalSessions, activeDaysCount, subjects, strongest, weakest }) {
  const subjectList = subjects && subjects.length > 0
    ? subjects.map(s => `• **${s.subject}**: ${s.minutes} dk (${s.hours} saat, %${s.percent}) — ${s.questions} soru`).join("\n")
    : "• Henüz detaylı branş kaydı bulunmuyor.";

  const avgPerDay = activeDaysCount > 0 ? Math.round(totalQuestions / activeDaysCount) : 0;
  const avgMinPerDay = activeDaysCount > 0 ? Math.round(totalMinutes / activeDaysCount) : 0;

  let goalAdvice = "";
  if (goal > 0) {
    const diff = goal - totalQuestions;
    if (diff > 0) {
      goalAdvice = `Haftalık ${goal} soru hedefine ulaşmak için ${diff} sorun kaldı; günde ortalama ~${Math.ceil(diff / 3)} soru daha ekleyerek hedefini rahatça yakalayabilirsin.`;
    } else {
      goalAdvice = `Haftalık ${goal} soru hedefini şimdiden aştın, harika bir tempo!`;
    }
  }

  return `📊 **${studentName} - Çalışma Performans Analizi**

1. 📋 **Genel Çalışma Karnesi**
• **Toplam Süre:** ${totalMinutes} dakika (${totalHours} saat)
• **Toplam Çözülen Soru:** ${totalQuestions} soru (${totalSessions} seans)
• **Aktif Çalışılan Gün:** ${activeDaysCount} gün (Günlük ortalama: ~${avgMinPerDay} dk / ~${avgPerDay} soru)

2. ⚖️ **Ders Dağılımı ve Efor Dengesi**
${subjectList}

3. 🎯 **Performans Değerlendirmesi**
En yoğun emek verdiğin ders **${strongest}** olmuş. Bu alandaki istikrarın ve soru çözme azmin takdire şayan!

4. 💡 **Koçun Stratejik Gelişim Tavsiyesi**
• **Denge Adımı:** **${weakest}** dersine biraz daha ağırlık vererek netlerini genel toplamda hızla yükseltebilirsin. Önümüzdeki günlerde ilk çalışma seansını bu derse ayırmanı öneririm.
• **Hedef:** ${goalAdvice || "Günde düzenli soru çözme ritmini koruyarak ilerle!"}
• **Son Söz:** Emek verdiğin her dakika seni hedefine bir adım daha yaklaştırıyor. Temponu hiç düşürme! 🚀`;
}

    if (action === "analyze") {
      const {
        studentName = "Öğrenci",
        schoolLevel,
        className,
        goal = 0,
        totalMinutes = 0,
        totalHours = "0",
        totalQuestions = 0,
        totalSessions = 0,
        activeDaysCount = 1,
        subjects = [],
        strongest = "Belirsiz",
        weakest = "Belirsiz"
      } = req.body || {};

      const subjectLines = subjects.length > 0
        ? subjects.map(s => `• ${s.subject}: ${s.minutes} dk (${s.hours} saat, %${s.percent}) - ${s.questions} soru`).join("\n")
        : "Henüz ders bazlı veri girilmemiş.";

      const prompt = `Aşağıda ${studentName} adlı öğrencinin Merkür Yörünge üzerindeki gerçek çalışma kayıtları ve performans verileri yer alıyor:

📊 ÖĞRENCİ ÇALIŞMA VERİLERİ:
- İsim: ${studentName} ${className ? `(${className}. Sınıf)` : ""} ${schoolLevel ? `[${schoolLevel}]` : ""}
- Toplam Çalışma Süresi: ${totalMinutes} dakika (${totalHours} saat)
- Toplam Çözülen Soru: ${totalQuestions} soru
- Kaydedilen Çalışma Seansı: ${totalSessions} adet
- Aktif Çalışılan Gün Sayısı: ${activeDaysCount} gün
- Haftalık Hedef: ${goal > 0 ? `${goal} soru` : "Belirlenmemiş"}
- Ders Bazlı Çalışma Dağılımı:
${subjectLines}

GÖREVİN:
Öğrencinin amacı girdiği verilerin net bir PERFORMANS ANALİZİNİ görmek ve raporun EN SONUNDA bu verilere dayanan somut, kişiye özel bir stratejik koçluk tavsiyesi almaktır.

Lütfen aşağıdaki başlıklarla net, akıcı ve profesyonel bir analiz karnesi sun:
1. 📋 **Genel Çalışma Karnesi**: Toplam süre, soru sayısı ve aktif gün sayısına göre genel tempo değerlendirmesi.
2. ⚖️ **Ders Dağılımı ve Efor Dengesi**: Hangi derse ne kadar zaman ve soru harcanmış, denge nasıl?
3. ⚡ **Soru Çözme Temposu**: Soru başına harcanan süreye göre hız ve verimlilik yorumu.
4. 🎯 **Performans Değerlendirmesi**: Mevcut verilerine göre güçlü yönü ve öne çıkan dersleri.
5. 💡 **Koçun Stratejik Gelişim Tavsiyesi**: Raporun en sonunda; öğrencinin verilerine, özellikle geride kalan dersine (${weakest}) ve hedefine göre 2-3 maddelik uygulanabilir, çok somut ve motive edici bir gelişim tavsiyesi ver.

KURALLAR:
- ASLA basmakalıp 'Pomodoro yap / 25 dakika çalış / 5 dakika mola ver' deme.
- Tavsiyen tamamen öğrencinin GERÇEK VERİLERİ (${weakest} dersi, çözülen soru sayısı, hedefi) üzerine kurulu olsun.
- Net, profesyonel, maddeler halinde ve okuması zevkli bir üslupla yaz.`;

      const customInstruction = `Sen Merkür Yörünge'nin kıdemli performans analisti ve enerjik eğitim koçu Merkür AI'sin. Bu raporu yalnızca aşağıdaki gerçek öğrenci verilerine dayanarak yaz.
    - Rapor en az 6 anlamlı bölüm ve en az 7 paragraf içersin.
    - Toplam süreyi, soru sayısını, seansları, aktif günleri, günlük ortalamaları ve ders yüzdelerini gerçekten hesaplayarak yorumla.
    - Güçlü yönleri kutla; düşük süreli veya düşük tempolu ders için neden olabilecek durumu dikkatli ve yargılamadan açıkla.
    - Son bölümde öğrencinin adıyla hitap ederek 3 somut, uygulanabilir ve veriye bağlı çalışma adımı ver.
    - Tonun sıcak, heyecanlı, cesaretlendirici ve bol emojili olsun; ancak rakam uydurma ve veride olmayan konuları kesin gerçek gibi sunma.
    - Genel geçer Pomodoro/25 dakika/5 dakika kalıplarını kullanma. Tavsiyeleri ders ve gerçek performans rakamlarına bağla.`;

      try {
        const reply = await generateReply({
          studentName,
          message: prompt,
          history: [],
          studentData: null,
          customInstruction
        });

        return res.json({ message: reply });
      } catch (err) {
        console.error("Analysis generation error:", err);
        return res.json({
          message: buildAnalysisLocalReport({
            studentName,
            goal,
            totalMinutes,
            totalHours,
            totalQuestions,
            totalSessions,
            activeDaysCount,
            subjects,
            strongest,
            weakest
          })
        });
      }
    }

    // Default chat behavior
    const { studentName, message, history = [], studentData = null } = req.body || {};
    const reply = await generateReply({ studentName, message, history, studentData });
    res.json({ reply });
  } catch (err) {
    console.error("AI route error:", err);
    res.status(200).json({ reply: buildLocalReply(req.body?.studentName, req.body?.message, req.body?.studentData), error: err.message });
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
