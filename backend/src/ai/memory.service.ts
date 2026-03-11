import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AiOrchestrationService } from './ai-orchestration.service';
import { ConfigService } from '@nestjs/config';
import Piscina from 'piscina';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { SecurityLogger } from '../common/utils/security-logger';

@Injectable()
export class MemoryService {
  private workerPool: Piscina;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AiOrchestrationService))
    private aiService: AiOrchestrationService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    // Environment-aware worker path resolution
    const isTsNode = !!require.extensions['.ts'] || process.execArgv.join().includes('ts-node');
    const workerPath = path.resolve(__dirname, 'embedding.worker.js');
    
    // Convert to file URL for Windows/ESM compatibility
    const workerUrl = pathToFileURL(workerPath).href;
    console.log(`[Memory] Loading worker from: ${workerUrl} (isTsNode: ${isTsNode})`);

    this.workerPool = new Piscina({
      filename: workerUrl,
      minThreads: 1,
      maxThreads: Math.max(2, Math.floor(require('os').cpus().length / 2)),
      // Handle TypeScript environment if necessary
      execArgv: isTsNode ? ['-r', 'ts-node/register'] : [],
    });
  }

  /**
   * Generates a vector embedding locally using Xenova offloaded to a worker pool
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await this.workerPool.run(text, { name: 'generateEmbedding' });
    } catch (error) {
      console.error('[Memory] Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Ingests a document (PDF/MD), chunks it, embeds it, and stores it in the Vault.
   */
  async ingestDocument(
    tenantId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<void> {
    const type = file.mimetype === 'application/pdf' ? 'pdf' : 'text';
    console.log(`[Memory] Starting ingestion for: ${file.originalname} (Type: ${type})`);
    
    this.eventEmitter.emit('vault.progress', {
      tenantId,
      filename: file.originalname,
      status: 'PROCESSING',
      progress: 10,
      message: 'Extracting content and chunking...',
    });

    try {
      const chunks: { text: string; embedding: number[] }[] = await this.workerPool.run(
        { type, buffer: file.buffer, filename: file.originalname },
        { name: 'processDocument' }
      );

      if (!chunks || chunks.length === 0) {
        console.warn(`[Memory] No chunks extracted from ${file.originalname}. Possibly empty file or parsing failed.`);
        this.eventEmitter.emit('vault.progress', {
          tenantId,
          filename: file.originalname,
          status: 'FAILED',
          progress: 100,
          message: 'No content found in file.',
        });
        return;
      }

      console.log(`[Memory] Extracted ${chunks.length} chunks from ${file.originalname}. Committing to DB...`);

      const totalChunks = chunks.length;
      let processed = 0;

      for (const chunk of chunks) {
        const vectorString = `[${chunk.embedding.join(',')}]`;
        const insight = chunk.text.substring(0, 500); 

        await this.prisma.$executeRawUnsafe(`
          INSERT INTO "MemoryStore" ("id", "tenantId", "insight", "context", "salience", "embedding", "sourceType", "updatedAt", "createdAt", "lastUsed", "frequency")
          VALUES (gen_random_uuid(), $1, $2, $3, 0.9, $4::vector, 'DOCUMENT'::"MemorySourceType", NOW(), NOW(), NOW(), 1)
        `, tenantId, insight, `Source: ${file.originalname}`, vectorString);

        processed++;
        if (processed % 5 === 0 || processed === totalChunks) {
          this.eventEmitter.emit('vault.progress', {
            tenantId,
            filename: file.originalname,
            status: 'CHUNKING',
            progress: 10 + Math.floor((processed / totalChunks) * 80),
            message: `Ingesting chunk ${processed}/${totalChunks}...`,
          });
        }
      }
      
      this.eventEmitter.emit('vault.progress', {
        tenantId,
        filename: file.originalname,
        status: 'COMPLETED',
        progress: 100,
        message: 'Successfully ingested into Knowledge Vault.',
      });

      console.log(`[Memory] Ingested ${chunks.length} chunks from ${file.originalname}`);
    } catch (error) {
      console.error('[Memory] Document ingestion failed:', error);
      this.eventEmitter.emit('vault.progress', {
        tenantId,
        filename: file.originalname,
        status: 'FAILED',
        progress: 100,
        message: `Error: ${error.message}`,
      });
      throw error;
    }
  }

  async storeConfirmedInsight(
    tenantId: string,
    insight: string,
    type: 'FACT' | 'DECISION' | 'HYPOTHESIS',
    context: string,
  ): Promise<void> {
    try {
      // 1. Deduplication check
      const similar = await this.findSimilarMemories(tenantId, insight, 0.95, 1);
      if (similar.length > 0) {
        SecurityLogger.log(`[Memory] Duplicate strategic core insight detected. Skipping...`);
        return;
      }

      const embedding = await this.generateEmbedding(insight);
      const vectorString = `[${embedding.join(',')}]`;

      await this.prisma.$executeRawUnsafe(`
        INSERT INTO "MemoryStore" 
        ("id", "tenantId", "insight", "context", "salience", "embedding", "memoryType", "evidenceScore", "strategyWeight", "isConfirmed", "updatedAt", "createdAt", "lastUsed", "frequency")
        VALUES (gen_random_uuid(), $1, $2, $3, 1.0, $4::vector, $5::"MemoryType", 1.0, 0.9, true, NOW(), NOW(), NOW(), 1)
      `, tenantId, insight, context, vectorString, type);

      SecurityLogger.log(`[Memory] Manually stored confirmed insight: ${insight.substring(0, 50)}...`);
    } catch (error) {
      console.error('[Memory] Failed to store confirmed insight:', error);
      
      // Basic text-based deduplication fallback
      const existing = await this.prisma.memoryStore.findFirst({
        where: { tenantId, insight, deletedAt: null }
      });
      
      if (!existing) {
        await this.prisma.memoryStore.create({
          data: {
            tenantId,
            insight,
            context,
            salience: 1.0,
            memoryType: type as any,
            evidenceScore: 1.0,
            strategyWeight: 0.9,
            isConfirmed: true,
            frequency: 1,
          },
        });
      }
    }
  }

  /**
   * Semantic Retrieval: Finds the most relevant memories for a user query
   */
  async findRelevantMemories(tenantId: string, query: string, limit: number = 5): Promise<any[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const vectorString = `[${queryEmbedding.join(',')}]`;

      const memories: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT id, insight, context, salience,
               (1 - (embedding <=> $1::vector)) as similarity
        FROM "MemoryStore"
        WHERE "tenantId" = $2 
          AND "deletedAt" IS NULL
          AND "embedding" IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $3;
      `, vectorString, tenantId, limit);

      return memories;
    } catch (error) {
      console.error('[Memory] Semantic search failed:', error);
      return this.getTopMemories(tenantId, limit);
    }
  }

  async extractAndStoreMemory(
    tenantId: string,
    response: string,
    context: string,
  ): Promise<void> {
    try {
      const extractionPrompt = `
From the strategic advice below, extract maximum 2-3 key insights.
For each insight, determine its Type and Evidence Score.

ADVICE:
${response}

EPISTEMIC INVARIANTS:
- Type: 
  - DECISION: Founder committed to an action or rule.
  - HYPOTHESIS: A strategic assumption or exploratory idea.
  - FACT: Objective data point or verified truth.
- Evidence Score:
  - 0.0: Pure assertion (Founder opinion).
  - 0.3: Weak signal (Anecdotal feedback).
  - 0.7: Strong signal (Consistent data points).
  - 1.0: Verified fact (Hard data).

Return ONLY valid JSON: { "insights": [{ "insight": "string", "type": "DECISION|HYPOTHESIS|FACT", "evidenceScore": number, "context": "string" }] }
      `;

      const extraction = await this.aiService.generateJSON(extractionPrompt);

      for (const item of extraction.insights) {
        // 1. Semantic Deduplication (Novelty Check)
        const similar = await this.findSimilarMemories(tenantId, item.insight, 0.92, 1);
        
        if (similar.length > 0) {
          SecurityLogger.log(`[Memory] Duplicate detected (sim: ${similar[0].similarity.toFixed(2)}). Merging...`);
          await this.prisma.memoryStore.update({
            where: { id: similar[0].id },
            data: { 
              frequency: { increment: 1 },
              lastUsed: new Date(),
              evidenceScore: Math.max(similar[0].evidenceScore, item.evidenceScore)
            }
          });
          continue;
        }

        // 2. Strategic Drift Detection & Relationship Inference
        const candidates = await this.findSimilarMemories(tenantId, item.insight, 0.75, 3);
        const salience = this.calculateSalience(item.insight, context);
        
        let newMemoryId: string;
        try {
          const embedding = await this.generateEmbedding(item.insight);
          const vectorString = `[${embedding.join(',')}]`;

          // Store the new memory with Level 3.5 fields
          const created: any[] = await this.prisma.$queryRawUnsafe(`
            INSERT INTO "MemoryStore" 
            ("id", "tenantId", "insight", "context", "salience", "embedding", "memoryType", "evidenceScore", "strategyWeight", "updatedAt", "createdAt", "lastUsed", "frequency")
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, $6::"MemoryType", $7, 0.5, NOW(), NOW(), NOW(), 1)
            RETURNING id
          `, tenantId, item.insight, item.context, salience, vectorString, item.type, item.evidenceScore);
          
          newMemoryId = created[0].id;
          SecurityLogger.log(`Stored semantic insight [${item.type}]: ${item.insight.substring(0, 50)}...`);
        } catch (embedError) {
          console.error('[Memory] Failed to store embedding, saving text-only:', embedError);
          const created = await this.prisma.memoryStore.create({
            data: {
              tenantId,
              insight: item.insight,
              context: item.context,
              salience,
              memoryType: item.type as any,
              evidenceScore: item.evidenceScore,
              frequency: 1,
            },
          });
          newMemoryId = created.id;
        }

        // 3. Link relations
        for (const target of candidates) {
          const relation = await this.inferRelation(item.insight, target.insight);
          if (relation.type !== 'NEUTRAL') {
            await this.prisma.memoryRelation.create({
              data: {
                tenantId,
                sourceId: newMemoryId,
                targetId: target.id,
                type: relation.type as any,
                confidence: relation.confidence,
                reasoning: relation.reasoning
              }
            });
            
            if (relation.type === 'CONTRADICTS' && relation.confidence > 0.8) {
              SecurityLogger.log(`[Drift] Strategic conflict detected between new insight and ${target.id}`);
              // In future: set a flag for UI alert
            }
          }
        }
      }
    } catch (error) {
      console.error('[Memory] Failed to extract insights:', error);
    }
  }

  /**
   * Use LLM to infer the relationship between a new insight and an existing one
   */
  private async inferRelation(newInsight: string, existingInsight: string): Promise<{
    type: 'SUPPORTS' | 'CONTRADICTS' | 'REFINES' | 'DERIVED_FROM' | 'NEUTRAL',
    reasoning: string,
    confidence: number
  }> {
    const prompt = `
Compare the two strategic insights below and determine their relationship.

NEW INSIGHT: "${newInsight}"
EXISTING INSIGHT: "${existingInsight}"

RELATION TYPES:
- SUPPORTS: New insight provides additional evidence or agrees with the existing one.
- CONTRADICTS: New insight directly opposes or conflicts with the existing one.
- REFINES: New insight makes the existing one more specific, detailed, or updated.
- DERIVED_FROM: New insight is a logical consequence or sub-point of the existing one.
- NEUTRAL: No clear strategic relationship.

Return ONLY valid JSON: { "type": "TYPE", "reasoning": "string", "confidence": 0.0-1.0 }
    `;

    try {
      return await this.aiService.generateJSON(prompt);
    } catch (error) {
      return { type: 'NEUTRAL', reasoning: 'Inference failed', confidence: 0 };
    }
  }

  private calculateSalience(insight: string, context: string): number {
    const contextWords = context.toLowerCase().split(/\s+/);
    const insightWords = insight.toLowerCase().split(/\s+/);

    const matchCount = insightWords.filter((word) =>
      contextWords.some(
        (ctxWord) =>
          ctxWord.includes(word) || word.includes(ctxWord),
      ),
    ).length;

    return Math.min(1, (matchCount / Math.max(insightWords.length, 1) + 0.7) / 2);
  }

  async getTopMemories(tenantId: string, limit: number = 5) {
    return this.prisma.memoryStore.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ salience: 'desc' }, { lastUsed: 'desc' }],
      take: limit,
    });
  }

  async updateMemoryLastUsed(memoryId: string): Promise<void> {
    await this.prisma.memoryStore.update({
      where: { id: memoryId },
      data: { lastUsed: new Date() },
    });
  }

  /**
   * Finds memories similar to the given text using vector similarity
   */
  async findSimilarMemories(tenantId: string, text: string, threshold: number = 0.85, limit: number = 3): Promise<any[]> {
    try {
      const embedding = await this.generateEmbedding(text);
      const vectorString = `[${embedding.join(',')}]`;

      const results: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT id, insight, "memoryType", "evidenceScore", "strategyWeight", "isConfirmed",
               (1 - (embedding <=> $1::vector)) as similarity
        FROM "MemoryStore"
        WHERE "tenantId" = $2 
          AND "deletedAt" IS NULL
          AND "embedding" IS NOT NULL
          AND (1 - (embedding <=> $1::vector)) > $3
        ORDER BY embedding <=> $1::vector
        LIMIT $4;
      `, vectorString, tenantId, threshold, limit);

      return results;
    } catch (error) {
      console.error('[Memory] Similarity search failed:', error);
      return [];
    }
  }
}
