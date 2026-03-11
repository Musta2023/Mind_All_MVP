import { Injectable, Logger } from '@nestjs/common';
import Piscina from 'piscina';
import * as path from 'path';
import { pathToFileURL } from 'url';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private workerPool: Piscina;

  constructor() {
    const isTsNode = !!require.extensions['.ts'] || process.execArgv.join().includes('ts-node');
    const workerPath = path.resolve(__dirname, '..', 'embedding.worker.js'); // Assuming embedding.worker.js is in src/ai/
    
    const workerUrl = pathToFileURL(workerPath).href;
    this.logger.log(`Loading worker from: ${workerUrl} (isTsNode: ${isTsNode})`);

    this.workerPool = new Piscina({
      filename: workerUrl,
      minThreads: 1,
      maxThreads: Math.max(2, Math.floor(require('os').cpus().length / 2)),
      execArgv: isTsNode ? ['-r', 'ts-node/register'] : [],
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await this.workerPool.run(text, { name: 'generateEmbedding' });
    } catch (error) {
      this.logger.error('Embedding generation failed:', error);
      throw error;
    }
  }

  async processDocumentChunks(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<{ text: string; embedding: number[] }[]> {
    const type = file.mimetype === 'application/pdf' ? 'pdf' : 'text';
    return await this.workerPool.run(
      { type, buffer: file.buffer, filename: file.originalname },
      { name: 'processDocument' }
    );
  }
}
