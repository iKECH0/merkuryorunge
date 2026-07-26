const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = "AQ.Ab8RN6IHmyBnnQ9-lwMLAEgLPOR9xxNx1grkU7yZDtBm7-bCPw";
  const genAI = new GoogleGenerativeAI(apiKey);
  const studentName = "Ufuk";
  const message = "Merhaba, nasılsın?";
  const history = []; // Start with empty history like first message
  
  const systemInstruction = `Sen Merkür Yörünge eğitim platformunun yapay zeka eğitim koçu 'Merkür AI'sın. Karşındaki öğrencinin adı ${studentName}. Son derece motive edici, samimi, eğlenceli ve bol emojili konuşursun. Görevin öğrencinin ders çalışmasına, motive olmasına ve eğitimle ilgili sorularına yardımcı olmaktır. Eğitim dışı konulara girmezsin.`;

  // Test each model
  const models = ["gemini-flash-lite-latest", "gemini-2.0-flash-lite", "gemini-2.0-flash"];

  for (const modelName of models) {
    try {
      console.log(`\nTesting model: ${modelName}`);
      const chatModel = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction
      });

      let reply = "";
      if (history && history.length > 0) {
        const geminiHistory = history.map(msg => ({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content || '' }]
        }));
        const chat = chatModel.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(message);
        reply = result.response.text();
      } else {
        const result = await chatModel.generateContent(message);
        reply = result.response.text();
      }
      console.log(`✅ ${modelName} WORKS:`, reply.substring(0, 100));
      break;
    } catch (err) {
      console.error(`❌ ${modelName} FAILED:`, err.status || err.message?.substring(0, 100));
    }
  }
}

test();
