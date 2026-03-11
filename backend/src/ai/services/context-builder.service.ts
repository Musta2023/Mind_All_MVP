import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { MemoryService } from '../memory.service';
import { getSystemInstructionsTemplate } from '../templates/system-instructions';

@Injectable()
export class ContextBuilderService {
  constructor(
    private prisma: PrismaService,
    private memoryService: MemoryService,
  ) {}

  async buildContext(
    tenantId: string,
    conversationId: string,
    userInput: string,
    onlineIntelligence?: any,
    preFetchedData?: {
      profile?: any;
      goals?: any[];
      memories?: any[];
      tasks?: any[];
      roadmap?: any;
      actionLog?: any[];
    }
  ): Promise<string> {
    const profile = preFetchedData?.profile || await this.prisma.startupProfile.findUnique({
      where: { tenantId },
    });

    if (!profile) {
      throw new BadRequestException('Startup profile not found');
    }

    const goals = preFetchedData?.goals || await this.prisma.goal.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { priority: 'desc' },
      take: 10,
    });

    const tasks = preFetchedData?.tasks || await this.prisma.task.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }, { priority: 'desc' }],
      take: 30,
    });

    const actionLog = preFetchedData?.actionLog || await this.prisma.toolExecutionLog.findMany({
      where: { tenantId, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    const roadmap = preFetchedData?.roadmap || await this.prisma.roadmap.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const confirmedMemories = await this.prisma.memoryStore.findMany({
      where: { tenantId, isConfirmed: true, deletedAt: null },
      orderBy: [{ strategyWeight: 'desc' }, { lastUsed: 'desc' }],
      take: 15,
    });

    const relevantMemories = preFetchedData?.memories || await this.memoryService.findRelevantMemories(tenantId, userInput, 10);
    const emergingMemories = relevantMemories.filter(rm => !confirmedMemories.some(cm => cm.id === rm.id));

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const systemInstructions = getSystemInstructionsTemplate();

    const prompt = `
<system_instructions>
${systemInstructions}
</system_instructions>

<business_context>
  <startup_profile>
    Name: ${profile.name}
    Stage: ${profile.stage}
    Description: ${profile.description}
    Target Market: ${profile.target}
    Competitive Edge: ${profile.competitiveEdge}
    Current Metrics: ${JSON.stringify(profile.currentMetrics)}
    Funding Raised: $${profile.fundingRaised}
    Runway: ${profile.runway} months
  </startup_profile>

  <strategic_roadmap>
    Summary: ${roadmap?.summary || 'No active roadmap defined.'}
    ${roadmap?.objectives ? `Objectives: ${JSON.stringify(roadmap.objectives)}` : ''}
    ${roadmap?.initiatives ? `Current Initiatives: ${JSON.stringify(roadmap.initiatives)}` : ''}
  </strategic_roadmap>

  <strategic_goals>
${goals.map((g, i) => `${i + 1}. ${g.title} (Priority: ${g.priority})`).join('\n')}
  </strategic_goals>

  <operational_tasks>
${tasks.map((t, i) => `${i + 1}. [${t.status}] ${t.title} (ID: ${t.id}, Priority: ${t.priority}, Updated: ${t.updatedAt.toISOString().split('T')[0]})`).join('\n')}
  </operational_tasks>

  <strategic_action_log>
${actionLog.map((log, i) => `- ${log.createdAt.toISOString().split('T')[0]} ${log.createdAt.toLocaleTimeString()}: Executed ${log.toolName} with params ${JSON.stringify(log.parameters)}`).join('\n')}
  </strategic_action_log>

  <confirmed_strategy>
${confirmedMemories.map((m) => `- ${m.insight}`).join('\n')}
  </confirmed_strategy>

  <emerging_observations>
${emergingMemories.map((m) => `- ${m.insight}`).join('\n')}
  </emerging_observations>

  ${onlineIntelligence ? `
  <online_intelligence>
  ${JSON.stringify(onlineIntelligence)}
  </online_intelligence>
  ` : ''}

  <recent_conversation_history>
${messages
  .reverse()
  .map((m) => `${m.role === 'user' ? 'Founder' : 'Assistant'}: ${m.content}`)
  .join('\n\n')}
  </recent_conversation_history>
</business_context>

<user_input>
${userInput}
</user_input>

CRITICAL: 
- Use the <operational_tasks> list to answer questions about task status or history. 
- Reference the <strategic_roadmap> when discussing long-term planning.
- If the user asks for a lookup (like 'list tasks'), answer directly using the provided XML context first.
    `;

    return prompt;
  }
}
