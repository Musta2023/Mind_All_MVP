/**
 * Enterprise-Grade RAG Document Processing Worker
 * Implements model caching, semantic chunking, and memory safety.
 */

// ==============================
// 1. Model Layer & Safety (Global Singleton)
// ==============================
let extractorInstance = null;

async function loadModel() {
  // Modern Node.js dynamic import (no eval)
  const { pipeline } = await import("@xenova/transformers");
  return await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
}

async function getExtractorWithTimeout() {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("AI Model load timeout (60s).")), 60000)
  );
  return Promise.race([loadModel(), timeout]);
}

/**
 * Robust retry strategy with exponential backoff for inference failures
 */
async function safeLoadExtractor(retries = 3) {
  if (extractorInstance) return extractorInstance;

  for (let i = 0; i < retries; i++) {
    try {
      extractorInstance = await getExtractorWithTimeout();
      return extractorInstance;
    } catch (e) {
      console.warn(`[Worker] Model load attempt ${i + 1} failed: ${e.message}`);
      if (i === retries - 1) throw e;
      // Exponential backoff: 2s, 4s, 8s...
      await new Promise(r => setTimeout(r, 2000 * Math.pow(2, i))); 
    }
  }
}

// Optional: Model Warm-up Function
export async function warmupModel() {
  try {
    await safeLoadExtractor();
    console.log("[Worker] Model warmed up successfully.");
  } catch (error) {
    console.error("[Worker] Model warm-up failed:", error.message);
  }
}

// ==============================
// 2. PDF Extraction Layer
// ==============================
async function extractPdfText(buffer) {
  const pdfModule = require("pdf-parse");
  
  try {
    // Attempt function-based extraction (pdf-parse v1)
    if (typeof pdfModule === "function") {
      const data = await pdfModule(buffer);
      return data.text || "";
    }

    // Attempt class-based extraction (pdf-parse v2+)
    const PDFParseClass = pdfModule.PDFParse || (pdfModule.default ? pdfModule.default.PDFParse : null);
    if (PDFParseClass) {
      const instance = new PDFParseClass({ data: buffer, verbosity: 0 });
      const result = await instance.getText();
      return result.text || "";
    }

    console.warn("[Worker] No compatible PDF parser found in module.");
    return "";
  } catch (error) {
    console.error(`[Worker] PDF extraction error: ${error.message}`);
    // Safe fallback on error
    return "";
  }
}

// ==============================
// 3. Mathematical Operations
// ==============================
/**
 * Optimized dot product for normalized embeddings.
 * Includes vector length mismatch safety.
 */
function fastSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    console.warn("[Worker] Vector dimension mismatch or missing vector during similarity check.");
    return 0; 
  }
  
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

// ==============================
// 4. Semantic Chunking Engine
// ==============================

/**
 * Extracts a word-level overlapping string from the end of the text.
 */
function getWordLevelOverlap(text, overlapRatio = 0.2) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  
  const overlapCount = Math.max(1, Math.floor(words.length * overlapRatio));
  return words.slice(-overlapCount).join(" ");
}

/**
 * Elite-level semantic chunking pipeline.
 */
async function semanticChunkText(text, extractor, threshold = 0.75, maxLength = 1000, minLength = 100) {
  // 1. Paragraph-based splitting
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  if (!paragraphs.length) return [];

  // Memory Pressure Protection: Paragraph Count Guard
  if (paragraphs.length > 500) {
    console.warn(`[Worker] Document too large (${paragraphs.length} paragraphs). Truncating to 500 to prevent memory exhaustion.`);
    paragraphs.length = 500;
  }

  // 2. Batch embedding inference for boundary detection
  const outputs = await extractor(paragraphs, { pooling: "mean", normalize: true });
  const embeddings = Array.isArray(outputs) 
    ? outputs.map(o => Array.from(o.data))
    : [Array.from(outputs.data)];

  const tempChunks = [];
  let currentText = paragraphs[0];
  let currentLeadEmbedding = embeddings[0];

  for (let i = 1; i < paragraphs.length; i++) {
    const similarity = fastSimilarity(currentLeadEmbedding, embeddings[i]);
    const wouldExceedLength = (currentText.length + paragraphs[i].length) > maxLength;

    // Semantic boundary detection
    if (similarity < threshold || wouldExceedLength) {
      
      // Prevent very small fragmented chunks
      if (currentText.length < minLength && i < paragraphs.length - 1) {
        currentText += "\n\n" + paragraphs[i];
      } else {
        tempChunks.push(currentText);
        
        // Sliding window context preservation (word-level)
        const overlapText = getWordLevelOverlap(currentText, 0.2);
        currentText = overlapText ? overlapText + " ... " + paragraphs[i] : paragraphs[i];
        
        // Update leading embedding for the new semantic block
        currentLeadEmbedding = embeddings[i];
      }
    } else {
      // Ensure semantic coherence by keeping related paragraphs together
      currentText += "\n\n" + paragraphs[i];
    }
  }
  
  if (currentText.trim().length > 0) {
    tempChunks.push(currentText.trim());
  }

  // 3. Re-embed final merged chunks in a single batch
  const finalOutputs = await extractor(tempChunks, { pooling: "mean", normalize: true });
  const finalEmbeddings = Array.isArray(finalOutputs)
    ? finalOutputs.map(o => Array.from(o.data))
    : [Array.from(finalOutputs.data)];

  // Ensure mapping safety between chunks and embeddings
  return tempChunks.map((chunkText, idx) => ({
    text: chunkText,
    embedding: finalEmbeddings[idx] || finalEmbeddings[0] // Safe fallback
  }));
}

// ==============================
// 5. Worker Pipeline Endpoints
// ==============================

export async function processDocument({ type, buffer, filename }) {
  try {
    // Worker Performance: Document Size Guard (5MB max)
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error(`Document "${filename || 'unknown'}" exceeds 5MB size limit. Extraction aborted to protect worker memory.`);
    }

    let text = "";
    if (type === "pdf") {
      text = await extractPdfText(Buffer.from(buffer));
    } else if (type === "markdown" || type === "text") {
      text = Buffer.from(buffer).toString("utf-8");
    }

    if (!text.trim()) return [];

    const extractor = await safeLoadExtractor();
    const chunkObjects = await semanticChunkText(text, extractor);
    
    return chunkObjects;
  } catch (error) {
    console.error(`[Worker] Process document failed for ${filename}:`, error.message);
    throw error;
  }
}

export async function generateEmbedding(text) {
  try {
    const extractor = await safeLoadExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error(`[Worker] Single embedding generation failed:`, error.message);
    throw error;
  }
}
