const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const models = ['embedding-001', 'text-embedding-004'];
  
  for (const modelName of models) {
    try {
      console.log(`Manually testing ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.embedContent("Hello world");
      console.log(`SUCCESS with ${modelName}: Dimensions: ${result.embedding.values.length}`);
      return;
    } catch (e) {
      console.log(`FAILED with ${modelName}: ${e.message.split('\n')[0]}`);
    }
  }
}
test();