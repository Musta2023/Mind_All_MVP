import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AiOrchestrationService } from '@ai/ai-orchestration.service';
import { MemoryService } from '@ai/memory.service';
import { TokenCounterService } from '@ai/token-counter.service';
import { ToolExecutorService } from '@ai/tool-executor.service';
import { IntelligenceRouterService } from '@ai/intelligence-router.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiOrchestrationService,
    private memoryService: MemoryService,
    private tokenCounterService: TokenCounterService,
    private toolExecutor: ToolExecutorService,
    private intelligenceRouter: IntelligenceRouterService,
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

    // 1. Preflight budget and context check
    await this.tokenCounterService.preflightCheck(tenantId, sanitizedInput);

    // Get or create conversation
    let conversation = null;
    
    if (providedConversationId) {
      conversation = await this.prisma.conversation.findFirst({
        where: { id: providedConversationId, tenantId },
      });
    }

    if (!conversation) {
      const profile = await this.prisma.startupProfile.findUnique({
        where: { tenantId },
      });

      if (!profile) {
        throw new BadRequestException('Startup profile not found');
      }

      // Generate a short title from the first 40 chars of the message
      const title = sanitizedInput.substring(0, 40) + (sanitizedInput.length > 40 ? '...' : '');

      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          userId,
          profileId: profile.id,
          title: title || 'New Strategic Chat',
        },
      });
    }

    // Store user message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        tenantId,
        role: 'user',
        content: sanitizedInput,
      },
    });

    // Update conversation updatedAt manually to bring it to top of list
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Assemble context
    // 1. Fetch routing data
    const [profile, goals, memories, tasks, roadmap, actionLog] = await Promise.all([
      this.prisma.startupProfile.findUnique({ where: { tenantId } }),
      this.prisma.goal.findMany({ where: { tenantId, deletedAt: null }, orderBy: { priority: 'desc' }, take: 10 }),
      this.memoryService.findRelevantMemories(tenantId, sanitizedInput, 10),
      this.prisma.task.findMany({ where: { tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 30 }),
      this.prisma.roadmap.findFirst({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
      this.prisma.toolExecutionLog.findMany({ where: { tenantId, status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, take: 30 })
    ]);

    // 2. Intelligence Routing: Decide if web search is needed
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
        const result = await this.toolExecutor.searchWeb(s.query);
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

    // Count tokens
    const inputTokens = this.tokenCounterService.estimateTokens(prompt);

    // Stream response from AI
    let fullResponse = '';
    await this.aiService.streamChat(prompt, (token) => {
      fullResponse += token;
      onToken(token);
    });

    // 2. Post-LLM Tool Extraction & Execution (MULTI-TOOL SUPPORT)
    // Robust extraction: Finds all { "tool": ... } blocks by matching braces recursively
    const matches: string[] = [];
    const startRegex = /\{[\s\r\n]*"tool"/g;
    let startMatch;
    let searchIndex = 0;

    while ((startMatch = startRegex.exec(fullResponse)) !== null) {
      const actualStart = startMatch.index;
      if (actualStart < searchIndex) continue;

      // Find matching closing brace
      let braceCount = 0;
      let foundEnd = false;
      for (let i = actualStart; i < fullResponse.length; i++) {
        if (fullResponse[i] === '{') braceCount++;
        if (fullResponse[i] === '}') braceCount--;
        
        if (braceCount === 0) {
          matches.push(fullResponse.substring(actualStart, i + 1));
          searchIndex = i + 1;
          startRegex.lastIndex = i + 1;
          foundEnd = true;
          break;
        }
      }
      if (!foundEnd) break;
    }

    if (matches.length > 0) {
      console.log(`[Chat] Detected ${matches.length} tool calls in response.`);
      let successfulActions = 0;
      for (const jsonStr of matches) {
        try {
          // Clean the JSON string from common LLM artifacts
          let cleanedJson = jsonStr
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
            .trim();

          // Handle literal newlines inside JSON string values
          cleanedJson = cleanedJson.replace(/(?<=:[\s]*".*)\n(?=.*")/g, '\\n');

          const parsed = JSON.parse(cleanedJson);
          const toolName = parsed.tool || parsed.tool_call;
          const args = parsed.args || parsed.parameters;
          
          if (toolName && args) {
            const autoExecuteTools = ['listTasks', 'searchWeb'];
            
            if (autoExecuteTools.includes(toolName)) {
              console.log(`[Chat] Auto-executing tool: ${toolName}`);
              const result = await this.toolExecutor.executeTool(tenantId, userId, toolName, args);
              successfulActions++;
              
              if (toolName === 'listTasks' && Array.isArray(result)) {
                const taskSummary = result.length > 0 
                  ? result.map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority})`).join('\n')
                  : 'No active tasks found.';
                
                const toolOutput = `\n\n### [INTERNAL] TACTICAL BOARD\n${taskSummary}`;
                fullResponse += toolOutput;
                onToken(toolOutput);
              }
            } else {
              console.log(`[Chat] Proposing tool for user approval: ${toolName}`);
            }

            // Log all detections
            this.prisma.toolExecutionLog.create({
              data: {
                tenantId,
                userId,
                toolName,
                parameters: args,
                status: autoExecuteTools.includes(toolName) ? 'SUCCESS' : 'PROPOSED'
              }
            }).catch(() => {});
          }
        } catch (err) {
          console.error('[Chat] Tool parsing/execution failed for block:', jsonStr.substring(0, 50), err.message);
        }
      }
      
      if (successfulActions > 0) {
        const syncNote = `\n\n[System: AI successfully synchronized ${successfulActions} strategic actions]`;
        fullResponse += syncNote;
        onToken(syncNote); // STREAM SYNC NOTE TO USER
      }
    }

    const outputTokens = this.tokenCounterService.estimateTokens(fullResponse);

    // Track token usage
    const cost = await this.tokenCounterService.trackTokenUsage(
      tenantId,
      'chat',
      inputTokens,
      outputTokens,
    );

    // Store assistant message
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        tenantId,
        role: 'assistant',
        content: fullResponse,
        tokensUsed: inputTokens + outputTokens,
        costEstimate: cost,
      },
    });

    // Extract and store memory insights (async, non-blocking)
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

  async getConversations(
    tenantId: string,
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    const safeLimit = isNaN(Number(limit)) ? 20 : Math.max(1, Number(limit));
    const safeOffset = isNaN(Number(offset)) ? 0 : Math.max(0, Number(offset));

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { tenantId, userId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.conversation.count({
        where: { tenantId, userId, deletedAt: null },
      }),
    ]);

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
      this.prisma.conversation.findFirst({
        where: { id: conversationId, tenantId, deletedAt: null },
        include: {
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
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

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      ...conversation,
      confirmedStrategy,
      emergingObservations,
    };
  }

  async deleteConversation(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
