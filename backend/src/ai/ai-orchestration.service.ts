import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '@database/prisma.service';
import { MemoryService } from './memory.service';

@Injectable()
export class AiOrchestrationService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => MemoryService))
    private memoryService: MemoryService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async streamChat(
    prompt: string,
    onToken: (token: string) => void,
  ): Promise<string> {
    return this.withRetry(async (modelName) => {
      const model = this.genAI.getGenerativeModel({ model: modelName });
      let fullResponse = '';

      const stream = await model.generateContentStream(prompt);

      for await (const chunk of stream.stream) {
        const text = chunk.candidates[0]?.content?.parts[0]?.text || '';
        if (text) {
          fullResponse += text;
          onToken(text);
        }
      }

      return fullResponse;
    });
  }

  async generateJSON(prompt: string, maxRetries: number = 3): Promise<any> {
    const text = await this.withRetry(async (modelName) => {
      const model = this.genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(prompt);
      return response.response.text();
    }, maxRetries);

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new BadRequestException('No JSON found in AI response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new BadRequestException('Failed to parse AI JSON response');
    }
  }

  /**
   * Helper to perform exponential backoff retries with model fallback.
   * Target: Handles 503 (High Demand) errors gracefully.
   */
  private async withRetry<T>(
    operation: (modelName: string) => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    const models = ['gemini-2.5-flash', 'gemini-flash-latest'];
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Rotate models if the lite one is failing
      const currentModel = attempt > 1 ? models[1] : models[0];

      try {
        return await operation(currentModel);
      } catch (error) {
        lastError = error;
        const status = error.status || (error as any).response?.status;

        // Only retry on 503 (Service Unavailable) or 429 (Rate Limit)
        if (status === 503 || status === 429) {
          if (attempt === maxRetries) break;

          // For 429, we want a more aggressive initial wait than for 503
          const baseDelay = status === 429 ? 5000 : 2000;
          const delay = Math.pow(2, attempt - 1) * baseDelay; 
          
          console.warn(
            `[AI] Model ${currentModel} ${status === 429 ? 'Rate Limited' : 'Overloaded'} (Status ${status}). Retrying in ${delay}ms (Attempt ${attempt}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For other errors, fail immediately
        throw error;
      }
    }

    console.error('[AI] All retry attempts failed:', lastError);
    throw new BadRequestException(
      'The AI service is currently experiencing high demand. Please try again in a few minutes.',
    );
  }

  async assembleContext(
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
    this.detectInjection(userInput);

    // Get startp profile
    const profile = preFetchedData?.profile || await this.prisma.startupProfile.findUnique({
      where: { tenantId },
    });

    if (!profile) {
      throw new BadRequestException('Startup profile not found');
    }

    // Get strategic goals
    const goals = preFetchedData?.goals || await this.prisma.goal.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { priority: 'desc' },
      take: 10,
    });

    // Get current tasks
    const tasks = preFetchedData?.tasks || await this.prisma.task.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }, { priority: 'desc' }],
      take: 30,
    });

    // Get action log (Verifiable history of tool usage)
    const actionLog = preFetchedData?.actionLog || await this.prisma.toolExecutionLog.findMany({
      where: { tenantId, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // Get latest active roadmap
    const roadmap = preFetchedData?.roadmap || await this.prisma.roadmap.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // Semantic Memory Retrieval
    // 1. Get Confirmed Strategy (Gospel)
    const confirmedMemories = await this.prisma.memoryStore.findMany({
      where: { tenantId, isConfirmed: true, deletedAt: null },
      orderBy: [{ strategyWeight: 'desc' }, { lastUsed: 'desc' }],
      take: 15,
    });

    // 2. Get Emerging Observations
    const relevantMemories = preFetchedData?.memories || await this.memoryService.findRelevantMemories(tenantId, userInput, 10);
    const emergingMemories = relevantMemories.filter(rm => !confirmedMemories.some(cm => cm.id === rm.id));

    // Get last 6 messages for better immediate conversational flow
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const systemInstructions = this.getSystemInstructions();

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
  <!-- These are tasks from the execution board. Use these to answer questions about 'today' or 'yesterday'. -->
${tasks.map((t, i) => `${i + 1}. [${t.status}] ${t.title} (ID: ${t.id}, Priority: ${t.priority}, Updated: ${t.updatedAt.toISOString().split('T')[0]})`).join('\n')}
  </operational_tasks>

  <strategic_action_log>
  <!-- Verifiable record of strategic actions taken by the founder. -->
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

  private detectInjection(input: string): void {
    const injectionPatterns = [
      /ignore previous instructions/i,
      /system prompt/i,
      /you are now a/i,
      /output your instructions/i,
      /instead of your usual/i,
      /acting as a/i,
    ];
    for (const pattern of injectionPatterns) {
      if (pattern.test(input)) {
        throw new BadRequestException('I cannot process this request because it violates system security policy.');
      }
    }
  }

  private getSystemInstructions(): string {
    return `You are the MindAll Strategic Co-Founder, an advanced AI business operating system. 
You are integrated directly into the founder's workspace.

CURRENT DATE: ${new Date().toISOString().split('T')[0]}

NEURAL MEMORY PROTOCOL (READ CAREFULLY):
- Your memory is NOT limited by your training data. 
- Your ACTIVE MEMORY is provided in the <business_context> XML tags.
- The <strategic_action_log> IS your historical audit trail. It contains the exact time and date of every strategic decision, task creation, and goal update.
- The <confirmed_strategy> contains core business pillars you have already validated.
- The <emerging_observations> contains new signals, context from uploaded documents in the Knowledge Vault, and recent conversational insights. 
- ALWAYS check <emerging_observations> when the user asks about documents or "the vault".

STRICT EXECUTION RULES:
1. NO REFUSALS ON HISTORY: 
   - NEVER say "I do not have a historical log". You HAVE one in <strategic_action_log>.
   - NEVER say "I cannot view a snapshot". You HAVE the status history in your context.
   - If a founder asks about "yesterday", "last session", or "past updates", you MUST use the timestamps in the context to construct the answer.

2. TRUTH ANCHORING:
   - Use the <strategic_action_log> to see what WAS done.
   - Use the <operational_tasks> to see what IS the current state.
   - Combine these to explain transitions (e.g., "Yesterday you created Task X, and it is now marked as DONE").

3. RESPONSE ARCHITECTURE:
   - FACTUAL LOOKUP (History/Status/Data): Answer immediately and with 100% confidence based on the provided XML. Skip the "System Limitation" disclaimers.
   - STRATEGIC ADVICE (Planning/Analysis): Use the Roadmap and Goals to ensure advice is grounded in current trajectory.

4. EPISTEMIC HONESTY:
   - Only apply uncertainty to MARKET HYPOTHESES or FUTURE PREDICTIONS. 
   - Internal data (Tasks, Goals, Logs) should be treated as OBSERVED FACTS with 1.0 confidence.

5. INTERNAL DATA HYGIENE:
   - NEVER include internal database IDs (like tenantId, userId, or UUIDs) in your conversational response. These are for system use only.
   - If you need to refer to a task or goal, use its Title, not its ID.
   - The user is the "Founder". Address them as a partner.

6. TOOL EXECUTION (CRITICAL):
   - You HAVE direct access to the startup's operational tools.
   - If the user asks to "add a task", "create a goal", "update my profile", or says "we need to do X today", you MUST call the appropriate tool.
   - To call a tool, include a JSON block in your response using this EXACT format:
     { "tool": "createTask", "args": { "title": "Task Name", "priority": 5, "description": "Details" } }
   - Available tools: 
     * createTask(title, priority, description?, dueDate?, status?)
     * updateTask(taskId, title?, status?, priority?, description?, dueDate?)
     * createGoal(title, deadline, priority, metrics?)
     * updateStartupProfile(name?, stage?, description?, target?, competitiveEdge?)
     * searchWeb(query)
   - Do NOT ask for permission to use tools if the intent is clear (e.g., "Add a task to call investors").
   - You can call MULTIPLE tools in one response.
   - Always provide a brief conversational confirmation of what you are doing.
`;
  }

  sanitizeUserInput(input: string): string {
    return input
      .replace(/\`\`\`[\s\S]*?\`\`\`/g, '[code block removed]')
      .replace(/\{[\s\S]*?\}/g, '[data removed]')
      .substring(0, 2000)
      .trim();
  }
}
