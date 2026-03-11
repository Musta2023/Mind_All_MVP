import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AiOrchestrationService } from '@ai/ai-orchestration.service';
import { MemoryService } from '@ai/memory.service';
import { TokenCounterService } from '@ai/token-counter.service';
import { ToolExecutorService } from '@ai/tool-executor.service';
import { IntelligenceRouterService } from '@ai/intelligence-router.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ConversationRepository } from './repositories/conversation.repository';
import { ToolParsingService } from './services/tool-parsing.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiOrchestrationService,
    private memoryService: MemoryService,
    private tokenCounterService: TokenCounterService,
    private toolExecutor: ToolExecutorService,
    private intelligenceRouter: IntelligenceRouterService,
    private conversationRepo: ConversationRepository,
    private toolParser: ToolParsingService,
  ) {}

  async sendMessage(
    tenantId: string,
    userId: string,
    createMessageDto: CreateMessageDto,
    onToken: (token: string) => void,
  ): Promise<{
    conversationId: string;
    messageId: string;
    tokensUsed: number;
    cost: number;
  }> {
    const { message, conversationId: providedConversationId } = createMessageDto;
    const sanitizedInput = this.aiService.sanitizeUserInput(message);

    await this.tokenCounterService.preflightCheck(tenantId, sanitizedInput);

    const conversation = await this.conversationRepo.getOrCreateConversation(
      tenantId,
      userId,
      sanitizedInput,
      providedConversationId
    );

    await this.conversationRepo.saveMessage({
      conversationId: conversation.id,
      tenantId,
      role: 'user',
      content: sanitizedInput,
    });

    await this.conversationRepo.touchConversation(conversation.id);

    const [profile, goals, memories, tasks, roadmap, actionLog] = await Promise.all([
      this.prisma.startupProfile.findUnique({ where: { tenantId } }),
      this.prisma.goal.findMany({ where: { tenantId, deletedAt: null }, orderBy: { priority: 'desc' }, take: 10 }),
      this.memoryService.findRelevantMemories(tenantId, sanitizedInput, 10),
      this.prisma.task.findMany({ where: { tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 30 }),
      this.prisma.roadmap.findFirst({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
      this.prisma.toolExecutionLog.findMany({ where: { tenantId, status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, take: 30 })
    ]);

    const routing = await this.intelligenceRouter.determineRouting(sanitizedInput, {
      profile,
      goals,
      memories,
      tasks,
      roadmap
    });

    let onlineIntelligence = null;
    if (routing.search_required && routing.search_queries) {
      onToken('[System: Searching for real-time intelligence...]\n\n');
      const searchResults = [];
      for (const s of routing.search_queries) {
        const result = await this.toolExecutor.executeTool(tenantId, userId, 'searchWeb', { query: s.query });
        searchResults.push({ query: s.query, result });
      }
      onlineIntelligence = searchResults;
    }

    const prompt = await this.aiService.assembleContext(
      tenantId,
      conversation.id,
      sanitizedInput,
      onlineIntelligence,
      { profile, goals, memories, tasks, roadmap, actionLog }
    );

    const inputTokens = this.tokenCounterService.estimateTokens(prompt);

    let fullResponse = '';
    await this.aiService.streamChat(prompt, (token) => {
      fullResponse += token;
      onToken(token);
    });

    const parsedCalls = this.toolParser.extractToolCalls(fullResponse);

    if (parsedCalls.length > 0) {
      console.log(`[Chat] Detected ${parsedCalls.length} tool calls in response.`);
      let successfulActions = 0;
      
      for (const call of parsedCalls) {
        const tool = this.toolExecutor.getTool(call.toolName);
        
        if (tool) {
          if (tool.autoExecute) {
            console.log(`[Chat] Auto-executing tool: ${call.toolName}`);
            try {
              const result = await this.toolExecutor.executeTool(tenantId, userId, call.toolName, call.args);
              successfulActions++;
              
              if (tool.formatResponse) {
                const toolOutput = tool.formatResponse(result);
                if (toolOutput) {
                  fullResponse += toolOutput;
                  onToken(toolOutput);
                }
              }
            } catch (err: any) {
              console.error(`[Chat] Auto-execution failed for ${call.toolName}:`, err.message);
            }
          } else {
            console.log(`[Chat] Proposing tool for user approval: ${call.toolName}`);
            await this.conversationRepo.logToolExecution(tenantId, userId, call.toolName, call.args, 'PROPOSED');
          }
        } else {
          console.warn(`[Chat] Unknown tool detected: ${call.toolName}`);
        }
      }
      
      if (successfulActions > 0) {
        const syncNote = `\n\n[System: AI successfully synchronized ${successfulActions} strategic actions]`;
        fullResponse += syncNote;
        onToken(syncNote);
      }
    }

    const outputTokens = this.tokenCounterService.estimateTokens(fullResponse);

    const cost = await this.tokenCounterService.trackTokenUsage(
      tenantId,
      'chat',
      inputTokens,
      outputTokens,
    );

    const assistantMessage = await this.conversationRepo.saveMessage({
      conversationId: conversation.id,
      tenantId,
      role: 'assistant',
      content: fullResponse,
      tokensUsed: inputTokens + outputTokens,
      costEstimate: cost,
    });

    this.memoryService
      .extractAndStoreMemory(tenantId, fullResponse, sanitizedInput)
      .catch((err) => console.error('[Chat] Memory extraction failed:', err));

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      tokensUsed: inputTokens + outputTokens,
      cost,
    };
  }

  async getConversations(tenantId: string, userId: string, limit: number = 20, offset: number = 0) {
    const safeLimit = isNaN(Number(limit)) ? 20 : Math.max(1, Number(limit));
    const safeOffset = isNaN(Number(offset)) ? 0 : Math.max(0, Number(offset));
    
    const { conversations, total } = await this.conversationRepo.getConversations(tenantId, userId, safeLimit, safeOffset);

    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        preview: c.messages[0]?.content?.substring(0, 100) || '',
      })),
      total,
    };
  }

  async getConversation(tenantId: string, conversationId: string) {
    const [conversation, confirmedStrategy, emergingObservations] = await Promise.all([
      this.conversationRepo.getConversationFull(tenantId, conversationId),
      this.prisma.memoryStore.findMany({
        where: { tenantId, isConfirmed: true, deletedAt: null },
        orderBy: [{ strategyWeight: 'desc' }, { lastUsed: 'desc' }],
        take: 10,
      }),
      this.prisma.memoryStore.findMany({
        where: { tenantId, isConfirmed: false, deletedAt: null },
        orderBy: { salience: 'desc' },
        take: 5,
      }),
    ]);

    return {
      ...conversation,
      confirmedStrategy,
      emergingObservations,
    };
  }

  async deleteConversation(tenantId: string, conversationId: string) {
    return this.conversationRepo.deleteConversation(tenantId, conversationId);
  }
}
