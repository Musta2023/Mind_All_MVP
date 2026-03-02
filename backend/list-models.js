const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, ".env") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found");
    return;
  }

  // Use fetch directly to call the listModels endpoint
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log("Available Models:");
    data.models?.forEach(m => {
      console.log(`- ${m.name} (supports: ${m.supportedGenerationMethods.join(", ")})`);
    });
  } catch (error) {
    console.error("Error listing models:", error.message);
  }
}

listModels();
