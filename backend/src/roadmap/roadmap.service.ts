import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AiOrchestrationService } from '@ai/ai-orchestration.service';
import { TokenCounterService } from '@ai/token-counter.service';
import { validateRoadmap } from './schemas/roadmap.schema';

@Injectable()
export class RoadmapService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiOrchestrationService,
    private tokenCounterService: TokenCounterService,
  ) {}

  async generateRoadmap(
    tenantId: string,
    onToken: (token: string) => void,
  ): Promise<{
    roadmap: any;
    savedId: string;
    tokensUsed: number;
    cost: number;
  }> {
    // Get startup context
    const profile = await this.prisma.startupProfile.findUnique({
      where: { tenantId },
    });

    if (!profile) {
      throw new BadRequestException('Startup profile not found');
    }

    // Get goals
    const goals = await this.prisma.goal.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { priority: 'desc' },
      take: 5,
    });

    // Build prompt
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
You are creating a 90-day strategic roadmap for an early-stage startup.

Current Date: ${today}

Startup: ${profile.name}
Stage: ${profile.stage}
Description: ${profile.description}
Current Metrics: ${JSON.stringify(profile.currentMetrics)}
Target Market: ${profile.target}
Runway: ${profile.runway} months

Current Goals:
${goals.map((g) => `- ${g.title}`).join('\n')}

Create a comprehensive 90-day roadmap with:
1. Executive summary (1-2 sentences)
2. 2-5 strategic objectives with CLEAR, QUANTIFIABLE success metrics (e.g., "100 users", "$1k MRR").
3. 3-10 concrete initiatives with:
   - Specific deadlines (MUST be between ${today} and ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]})
   - Concrete tasks with owners
   - Effort estimates

CRITICAL: All dates must be in the year ${new Date().getFullYear()}. Do not use 2024.

Return ONLY valid JSON matching this structure exactly:
{
  "summary": "Executive summary of the roadmap",
  "objectives": [
    {
      "title": "Objective title",
      "why": "Why this matters for the startup",
      "success_metric": "How to measure success (BE SPECIFIC)"
    }
  ],
  "initiatives": [
    {
      "title": "Initiative title",
      "deadline": "YYYY-MM-DD",
      "tasks": [
        {
          "title": "Task description",
          "owner": "Team member or role",
          "effort": "low | medium | high"
        }
      ]
    }
  ]
}
    `;

    const inputTokens = this.tokenCounterService.estimateTokens(prompt);

    // Stream response
    let fullResponse = '';
    await this.aiService.streamChat(prompt, (token) => {
      fullResponse += token;
      onToken(token);
    });

    const outputTokens = this.tokenCounterService.estimateTokens(fullResponse);

    // Parse and validate JSON
    let roadmapData: any;
    try {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      roadmapData = JSON.parse(jsonMatch[0]);

      if (!validateRoadmap(roadmapData)) {
        throw new Error('Invalid roadmap structure');
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse roadmap: ${error.message}`,
      );
    }

    // Track token usage
    const cost = await this.tokenCounterService.trackTokenUsage(
      tenantId,
      'roadmap',
      inputTokens,
      outputTokens,
    );

    // Save roadmap
    const saved = await this.prisma.roadmap.create({
      data: {
        tenantId,
        summary: roadmapData.summary,
        objectives: roadmapData.objectives,
        initiatives: roadmapData.initiatives,
        rawResponse: fullResponse,
      },
    });

    return {
      roadmap: roadmapData,
      savedId: saved.id,
      tokensUsed: inputTokens + outputTokens,
      cost,
    };
  }

  async getRoadmaps(
    tenantId: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    const safeLimit = isNaN(Number(limit)) ? 10 : Math.max(1, Number(limit));
    const safeOffset = isNaN(Number(offset)) ? 0 : Math.max(0, Number(offset));

    const [roadmaps, total] = await Promise.all([
      this.prisma.roadmap.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
      }),
      this.prisma.roadmap.count({
        where: { tenantId, deletedAt: null },
      }),
    ]);

    return { roadmaps, total };
  }

  async getRoadmap(tenantId: string, roadmapId: string) {
    const roadmap = await this.prisma.roadmap.findFirst({
      where: { id: roadmapId, tenantId, deletedAt: null },
    });

    if (!roadmap) {
      throw new BadRequestException('Roadmap not found');
    }

    return roadmap;
  }

  async deleteRoadmap(tenantId: string, roadmapId: string) {
    const roadmap = await this.prisma.roadmap.findFirst({
      where: { id: roadmapId, tenantId, deletedAt: null },
    });

    if (!roadmap) {
      throw new BadRequestException('Roadmap not found');
    }

    return this.prisma.roadmap.update({
      where: { id: roadmapId },
      data: { deletedAt: new Date() },
    });
  }
}
