import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AiOrchestrationService } from './ai-orchestration.service';
import { MemoryService } from './memory.service';

@Injectable()
export class MemoryCompactionService {
  private readonly logger = new Logger(MemoryCompactionService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiOrchestrationService,
    private memoryService: MemoryService,
  ) {}

  /**
   * Summarizes and merges low-salience memories for a tenant.
   * Runs as a background task.
   */
  async compactMemories(tenantId: string) {
    this.logger.log(`[Compaction] Starting memory compaction for tenant: ${tenantId}`);

    // Fetch old, un-summarized memories with low salience
    const memories = await this.prisma.memoryStore.findMany({
      where: {
        tenantId,
        isSummarized: false,
        salience: { lt: 0.6 },
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days old
      },
      take: 20,
    });

    if (memories.length < 5) {
      this.logger.log(`[Compaction] Not enough memories to compact for tenant: ${tenantId}`);
      return;
    }

    const memoryContent = memories.map((m) => `- ${m.insight} (Context: ${m.context})`).join('\n');

    const compactionPrompt = `
You are a memory compaction agent. Summarize the following low-salience strategic insights into 2-3 high-level "Theme-based" insights.
Preserve unique facts, decisions, or metrics, but discard redundant advice.

INSIGHTS TO COMPACT:
${memoryContent}

Return ONLY valid JSON: { "summarized_insights": [{ "insight": "string", "context": "Merged from multiple previous conversations" }] }
    `;

    try {
      const summary = await this.aiService.generateJSON(compactionPrompt);

      for (const item of summary.summarized_insights) {
        const embedding = await this.memoryService.generateEmbedding(item.insight);
        const vectorString = `[${embedding.join(',')}]`;

        // Store the new summarized memory
        await this.prisma.$executeRawUnsafe(`
          INSERT INTO "MemoryStore" ("id", "tenantId", "insight", "context", "salience", "embedding", "isSummarized", "updatedAt", "createdAt", "lastUsed", "frequency")
          VALUES (gen_random_uuid(), $1, $2, $3, 0.8, $4::vector, true, NOW(), NOW(), NOW(), 1)
        `, tenantId, item.insight, item.context, vectorString);
      }

      // Mark original memories as summarized (soft-delete effectively for RAG)
      await this.prisma.memoryStore.updateMany({
        where: { id: { in: memories.map((m) => m.id) } },
        data: { isSummarized: true, deletedAt: new Date() },
      });

      this.logger.log(`[Compaction] Compacted ${memories.length} memories into ${summary.summarized_insights.length} for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`[Compaction] Failed to compact memories for tenant ${tenantId}:`, error);
    }
  }
}
