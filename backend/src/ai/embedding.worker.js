const path = require('path');

async function getExtractor() {
  // Dynamic import for ESM @xenova/transformers
  const { pipeline } = await (eval('import("@xenova/transformers")'));
  return await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
}

async function extractPdfText(buffer) {
  const pdfModule = require('pdf-parse');
  
  try {
    // 1. Attempt standard function-based extraction (pdf-parse 1.x)
    if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      return data.text || '';
    }

    // 2. Handle class-based extraction (pdf-parse 2.x+)
    // The required module might be an object containing the PDFParse class
    const PDFParseClass = pdfModule.PDFParse || (pdfModule.default ? pdfModule.default.PDFParse : null);
    
    if (PDFParseClass) {
      const instance = new PDFParseClass({ 
        data: buffer,
        verbosity: 0 // Minimize logs
      });
      const result = await instance.getText();
      return result.text || '';
    }

    console.error('[Worker] No valid PDF extraction method found in module');
    return '';
  } catch (error) {
    console.error('[Worker] PDF extraction error:', error.message);
    return '';
  }
}


function chunkText(text, maxLength = 1000) {
  // Simple semantic chunking: split by paragraphs or sentences
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += para + '\n\n';
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

async function processDocumentWorker({ type, buffer, filename }) {
  let text = '';
  if (type === 'pdf') {
    text = await extractPdfText(Buffer.from(buffer));
  } else if (type === 'markdown' || type === 'text') {
    text = Buffer.from(buffer).toString('utf-8');
  }

  const chunks = chunkText(text);
  const extractor = await getExtractor();
  
  const results = [];
  for (const chunk of chunks) {
    const output = await extractor(chunk, { pooling: 'mean', normalize: true });
    results.push({
      text: chunk,
      embedding: Array.from(output.data)
    });
  }

  return results;
}

async function generateEmbeddingWorker(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

module.exports = {
  generateEmbedding: generateEmbeddingWorker,
  processDocument: processDocumentWorker
};
