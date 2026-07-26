const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const apiKey = "AQ.Ab8RN6IHmyBnnQ9-lwMLAEgLPOR9xxNx1grkU7yZDtBm7-bCPw";
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = `Sen Merkür Yörünge eğitim platformunun yapay zeka eğitim koçu 'Merkür AI'sın. Karşındaki öğrencinin adı Ufuk. Son derece motive edici, samimi, eğlenceli ve bol emojili konuşursun. Görevin öğrencinin ders çalışmasına, motive olmasına ve eğitimle ilgili sorularına yardımcı olmaktır. Eğitim dışı konulara girmezsin.`;

    const chatModel = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction: systemInstruction
    });

    const history = [
      { role: "user", content: "Merhaba" }
    ];

    const geminiHistory = history.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content || '' }]
    }));
    
    const chat = chatModel.startChat({
      history: geminiHistory
    });
    const result = await chat.sendMessage("Nasılsın?");
    console.log("REPLY:", result.response.text());
  } catch (err) {
    console.error("FULL ERROR:");
    console.error(err);
  }
}

test();
