const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const apiKey = "AQ.Ab8RN6IHmyBnnQ9-IwMLAEgLPOR9xxNx1grkU7yZDTBm7-bCPw";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("Test");
    console.log("SUCCESS:", result.response.text());
  } catch (err) {
    console.error("ERROR 1.5-flash:", err.message);
    try {
        const genAI2 = new GoogleGenerativeAI(apiKey);
        const model2 = genAI2.getGenerativeModel({ model: "gemini-pro" });
        const result2 = await model2.generateContent("Test");
        console.log("SUCCESS gemini-pro:", result2.response.text());
    } catch (e2) {
        console.error("ERROR gemini-pro:", e2.message);
    }
  }
}

test();
