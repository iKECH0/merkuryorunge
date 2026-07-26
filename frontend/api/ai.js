import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AQ.Ab8RN6IHmyBnnQ9-lwMLAEgLPOR9xxNx1grkU7yZDtBm7-bCPw";
const genAI = new GoogleGenerativeAI(apiKey);

const MODEL_LIST = [
  "gemini-flash-lite-latest",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash"
];

async function generateWithFallback(buildModel, message, history) {
  for (const modelName of MODEL_LIST) {
    try {
      const model = buildModel(modelName);
      let reply = "";
      if (history && history.length > 0) {
        const geminiHistory = history.map(msg => ({
          role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content || "" }]
        }));
        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(message);
        reply = result.response.text();
      } else {
        const result = await model.generateContent(message);
        reply = result.response.text();
      }
      return reply;
    } catch (err) {
      const status = err.status || (err.message && err.message.includes("429") ? 429 : null);
      if (status === 429) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Tum modeller kota limitine ulasti. Lutfen biraz sonra tekrar deneyin.");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const url = new URL(req.url, "http://" + req.headers.host);
    const action = url.searchParams.get("action");

    if (action === "chat" || req.url.includes("/api/ai/chat")) {
      const { studentName, message, history } = req.body;
      const systemInstruction = "Sen Merkur Yorunge egitim platformunun yapay zeka egitim kocu Merkur AI'sin. Karsindaki ogrencinin adi " + studentName + ". Son derece motive edici, samimi, eglenceli ve bol emojili konusursun. Gorev ogrencinin ders calismasi, motive olmasi ve egitimle ilgili sorulara yardimci olmak.";

      const buildModel = (modelName) => genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction
      });

      const reply = await generateWithFallback(buildModel, message, history);
      return res.status(200).json({ reply });
    }

    if (action === "coach" || req.url.includes("/api/ai/coach")) {
      const { studentName, subject, duration, questionsSolved } = req.body;
      const prompt = "Sen Merkur Yorunge egitim platformunun yapay zeka kocu Merkur AI'sin. Ogrenci " + studentName + " az once calismasini kaydetti. Ders: " + subject + " Sure: " + duration + " dakika. Cozulen Soru: " + questionsSolved + ". Enerjik, motive edici, kisa (2-3 cumle) ve emojili geri bildirim ver.";
      const buildModel = (modelName) => genAI.getGenerativeModel({ model: modelName });
      const message_text = await generateWithFallback(buildModel, prompt, null);
      return res.status(200).json({ message: message_text });
    }

    return res.status(404).json({ error: "Not Found" });

  } catch (err) {
    console.error("AI API Error:", err.message || err);
    return res.status(200).json({
      reply: "Su an cok yogunum, biraz sonra tekrar dener misin? ??",
      error: err.message
    });
  }
}
