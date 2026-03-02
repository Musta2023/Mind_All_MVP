import { Injectable, Logger } from '@nestjs/common';
import { AiOrchestrationService } from './ai-orchestration.service';

export interface SearchIntent {
  search_required: boolean;
  reason?: string;
  search_queries?: {
    query: string;
    location?: string;
    data_type: 'list' | 'statistics' | 'contact' | 'competitor' | 'regulation';
  }[];
  extraction_schema?: Record<string, string>;
}

@Injectable()
export class IntelligenceRouterService {
  private readonly logger = new Logger(IntelligenceRouterService.name);

  constructor(private aiService: AiOrchestrationService) {}

  /**
   * Determines if external online data is required to fulfill the user's request.
   */
  async determineRouting(
    userInput: string,
    internalContext: {
      profile: any;
      goals: any[];
      memories: any[];
      tasks?: any[];
      roadmap?: any;
    }
  ): Promise<SearchIntent> {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
You are MindAll Strategic Intelligence Engine.
Your role is to determine whether external online data is required to answer the user's request.

CURRENT DATE: ${today}

INTERNAL CONTEXT AVAILABLE:
- Startup Profile: ${JSON.stringify(internalContext.profile)}
- Current Goals: ${internalContext.goals.map(g => g.title).join(', ')}
- Internal Knowledge: ${internalContext.memories.map(m => m.insight).join(' | ')}
- Operational Tasks: ${internalContext.tasks?.map(t => `[${t.status}] ${t.title} (Updated: ${t.updatedAt.toISOString().split('T')[0]})`).join(', ') || 'No tasks found'}
- Active Roadmap: ${internalContext.roadmap?.summary || 'No active roadmap'}

USER INPUT:
"${userInput}"

STRICT RULES:
1. PRIORITIZE INTERNAL DATA. If the user asks about their own startup (Name: ${internalContext.profile?.name}), tasks, goals, roadmap, or uploaded docs, search_required MUST be false.
2. TEMPORAL MATCHING: If the user asks about "yesterday", "today", or "recent" tasks, match the request against the "Updated" dates in the Operational Tasks list provided above. If matches exist, search_required is false.
3. INTERNAL VS EXTERNAL: If the question is about internal operations (e.g. "What did we do?"), use INTERNAL context.
4. ONLINE RETRIEVAL TRIGGER: 
   - Specific EXTERNAL entity lookups (e.g., "Where is Google?")
   - Market research on competitors (not ${internalContext.profile?.name}).
   - Global regulations or statistics.

OUTPUT FORMAT:
If search required:
{
  "search_required": true,
  "search_queries": [
     { "query": "string", "location": "string", "data_type": "list | statistics | competitor | regulation" }
  ],
  "extraction_schema": { "name": "string", "details": "string" }
}

If NO search required:
{
  "search_required": false,
  "reason": "Sufficient internal context found in vault/profile."
}

Return ONLY valid JSON.
    `;

    try {
      const result = await this.aiService.generateJSON(prompt);
      return result as SearchIntent;
    } catch (error) {
      this.logger.error('[Router] Failed to determine routing, defaulting to internal only:', error);
      return { search_required: false, reason: 'Routing logic failed' };
    }
  }
}
