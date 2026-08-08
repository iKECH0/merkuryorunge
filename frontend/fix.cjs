const fs = require('fs');

let file = fs.readFileSync('src/data/curriculum.js', 'utf8');

const map = {
  'Turkce': 'Türkçe',
  'Matematik': 'Matematik',
  'Hayat Bilgisi': 'Hayat Bilgisi',
  'Fen Bilimleri': 'Fen Bilimleri',
  'Sosyal Bilgiler': 'Sosyal Bilgiler',
  'Fizik': 'Fizik',
  'Kimya': 'Kimya',
  'Biyoloji': 'Biyoloji',
  'Tarih': 'Tarih',
  'Cografya': 'Coğrafya',
  'Felsefe': 'Felsefe',
  'Felsefe Grubu': 'Felsefe Grubu',
  'Turk Dili ve Edebiyati': 'Türk Dili ve Edebiyatı',
  'Geometri': 'Geometri'
};

// Fix subjects in t()
file = file.replace(/t\(\"([^\"]+)\",\"([^\"]+)\"/g, (match, grade, subject) => {
  return 't(\"' + grade + '\",\"' + (map[subject] || subject) + '\"';
});

// Topics to fix
const replacements = [
  [/Cember/g, 'Çember'],
  [/Analitigi/g, 'Analitiği'],
  [/Acı/g, 'Açı'],
  [/Acilar/g, 'Açılar'],
  [/Dortgen/g, 'Dörtgen'],
  [/Ucgen/g, 'Üçgen'],
  [/Ozel/g, 'Özel'],
  [/Olme/g, 'Ölçme'],
  [/Olcme/g, 'Ölçme'],
  [/Dunya/g, 'Dünya'],
  [/Giris/g, 'Giriş'],
  [/Baglar/g, 'Bağlar'],
  [/Turleri/g, 'Türleri'],
  [/Anlatim/g, 'Anlatım'],
  [/Bicimleri/g, 'Biçimleri'],
  [/Yazim/g, 'Yazım'],
  [/Cekimleri/g, 'Çekimleri'],
  [/Bozukluklari/g, 'Bozuklukları'],
  [/Isaretleri/g, 'İşaretleri'],
  [/Sozcuk/g, 'Sözcük'],
  [/Cumle/g, 'Cümle'],
  [/Soz /g, 'Söz '],
  [/Dusunce/g, 'Düşünce'],
  [/Edebiyati/g, 'Edebiyatı'],
  [/Ileri/g, 'İleri'],
  [/Siniflandirilmasi/g, 'Sınıflandırılması'],
  [/Canlilar/g, 'Canlılar'],
  [/Hucre/g, 'Hücre'],
  [/Gore/g, 'Göre'],
  [/Donem/g, 'Dönem'],
  [/Yasam/g, 'Yaşam'],
  [/Dogal/g, 'Doğal'],
  [/Cevre/g, 'Çevre'],
  [/Insanlar/g, 'İnsanlar'],
  [/Dagitim/g, 'Dağıtım'],
  [/Uretim/g, 'Üretim'],
  [/Tuketim/g, 'Tüketim'],
  [/Sicaklik/g, 'Sıcaklık'],
  [/Basinc/g, 'Basınç'],
  [/Cozeltiler/g, 'Çözeltiler'],
  [/Cozunurluk/g, 'Çözünürlük'],
  [/Ureme/g, 'Üreme'],
  [/Bosaltim/g, 'Boşaltım'],
  [/Inkilap/g, 'İnkılap'],
  [/Cok/g, 'Çok'],
  [/Gorus/g, 'Görüş'],
  [/Savas/g, 'Savaş'],
  [/Kurtulus/g, 'Kurtuluş'],
  [/Kurulus/g, 'Kuruluş'],
  [/Yukselme/g, 'Yükselme'],
  [/Yaratilis/g, 'Yaratılış'],
  [/Gelisim/g, 'Gelişim'],
  [/Orantı/g, 'Orantı'],
  [/Ilk /g, 'İlk '],
  [/Isi /g, 'Isı '],
  [/Isı, Sicaklik/g, 'Isı, Sıcaklık']
];

replacements.forEach(([regex, replaceWith]) => {
  file = file.replace(regex, replaceWith);
});

fs.writeFileSync('src/data/curriculum.js', file);
console.log('Fixed curriculum.js');

// Now fix frontend/api/ai.js
let aiFile = fs.readFileSync('api/ai.js', 'utf8');

const oldHistoryMap = `        const geminiHistory = history.map(msg => ({
          role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content || "" }]
        }));
        const chat = model.startChat({ history: geminiHistory });`;

const newHistoryMap = `        let geminiHistory = history.map(msg => ({
          role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content || "" }]
        }));
        
        // Ensure first message is user
        while (geminiHistory.length > 0 && geminiHistory[0].role === "model") {
          geminiHistory.shift();
        }
        
        const chat = model.startChat({ history: geminiHistory });`;

aiFile = aiFile.replace(oldHistoryMap, newHistoryMap);
fs.writeFileSync('api/ai.js', aiFile);
console.log('Fixed api/ai.js');
