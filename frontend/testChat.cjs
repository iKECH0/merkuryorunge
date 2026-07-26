const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const apiKey = "AQ.Ab8RN6IHmyBnnQ9-lwMLAEgLPOR9xxNx1grkU7yZDtBm7-bCPw";
    const genAI = new GoogleGenerativeAI(apiKey);
    const aiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const systemInstruction = "Sen bir test asistanısın.";
    
    const chat = aiModel.startChat({
      history: [
        { role: 'user', parts: [{ text: 'Merhaba' }] },
        { role: 'model', parts: [{ text: 'Merhaba, nasılsınız?' }] }
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    });
    
    const result = await chat.sendMessage("iyiyim");
    console.log(result.response.text());
  } catch (err) {
    console.error("CHAT ERROR:", err);
  }
}

test();
