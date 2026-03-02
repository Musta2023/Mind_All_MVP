const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, ".env") });

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTest = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-flash-latest",
    "gemini-pro-latest"
  ];

  for (const modelName of modelsToTest) {
    console.log(`Testing model: ${modelName}...`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello");
      const response = await result.response;
      console.log(`✅ ${modelName} works! Response snippet: ${response.text().substring(0, 20)}...`);
    } catch (error) {
      console.error(`❌ ${modelName} failed: ${error.message}`);
    }
  }
}

testModels();
