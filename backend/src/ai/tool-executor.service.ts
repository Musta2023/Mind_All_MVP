import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { StartupService } from '../startup/startup.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);

  constructor(
    private prisma: PrismaService,
    private startupService: StartupService,
    private configService: ConfigService,
  ) {}

  async searchWeb(query: string) {
    const apiKey = this.configService.get<string>('TAVILY_API_KEY');
    if (!apiKey) {
      this.logger.warn('TAVILY_API_KEY not set, web search disabled.');
      return { error: 'Web search is currently unavailable.' };
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'advanced',
          include_answer: true,
          max_results: 5,
        }),
      });

      const data = (await response.json()) as any;
      return {
        answer: data.answer,
        results: data.results?.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        })),
      };
    } catch (error) {
      this.logger.error('Web search failed:', error);
      throw new Error('Failed to perform web search.');
    }
  }

  /**
   * Executes a tool called by the AI with strict tenant isolation.
   */
  async executeTool(
    tenantId: string,
    userId: string,
    toolName: string,
    args: any,
  ) {
    this.logger.log(`[Tool] Executing tool ${toolName} for tenant ${tenantId}`);

    try {
      let result: any;
      switch (toolName) {
        case 'searchWeb':
          result = await this.searchWeb(args.query);
          break;

        case 'createGoal':
          result = await this.startupService.createGoal(tenantId, {
            title: args.title,
            deadline: args.deadline,
            metrics: args.metrics || {},
            priority: args.priority,
          });
          break;

        case 'updateGoal':
          result = await this.startupService.updateGoal(tenantId, args.goalId, {
            title: args.title,
            deadline: args.deadline,
            metrics: args.metrics,
            priority: args.priority,
          });
          break;

        case 'updateStartupProfile':
          result = await this.startupService.updateProfile(tenantId, args);
          break;

        case 'createTask':
          let verifiedGoalId = args.goalId;
          if (verifiedGoalId) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(verifiedGoalId)) {
              verifiedGoalId = undefined;
            }
          }

          result = await this.startupService.createTask(tenantId, userId, {
            title: args.title,
            description: args.description,
            priority: args.priority,
            dueDate: args.dueDate,
            goalId: verifiedGoalId,
            status: args.status,
          });
          break;

        case 'updateTask':
          result = await this.startupService.updateTask(tenantId, args.taskId, {
            title: args.title,
            description: args.description,
            priority: args.priority,
            dueDate: args.dueDate,
            status: args.status,
          });
          break;

        case 'listTasks':
          result = await this.startupService.getTasks(tenantId, userId);
          break;

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      // Log the successful execution
      await this.prisma.toolExecutionLog.create({
        data: {
          tenantId,
          userId,
          toolName,
          parameters: args,
          result: result as any,
          status: 'SUCCESS',
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`[Tool] Execution failed for tool ${toolName}:`, error);

      // Log the failed execution
      await this.prisma.toolExecutionLog.create({
        data: {
          tenantId,
          userId,
          toolName,
          parameters: args,
          result: { error: error.message } as any,
          status: 'FAILED',
        },
      });

      throw error;
    }
  }
}
