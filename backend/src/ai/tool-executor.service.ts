import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { IAiTool, ToolContext } from './tools/interfaces/ai-tool.interface';
import { SearchWebTool } from './tools/implementations/search-web.tool';
import { CreateGoalTool } from './tools/implementations/create-goal.tool';
import { UpdateGoalTool } from './tools/implementations/update-goal.tool';
import { UpdateStartupProfileTool } from './tools/implementations/update-startup-profile.tool';
import { CreateTaskTool } from './tools/implementations/create-task.tool';
import { UpdateTaskTool } from './tools/implementations/update-task.tool';
import { ListTasksTool } from './tools/implementations/list-tasks.tool';

@Injectable()
export class ToolExecutorService implements OnModuleInit {
  private readonly logger = new Logger(ToolExecutorService.name);
  private readonly tools = new Map<string, IAiTool>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchWebTool: SearchWebTool,
    private readonly createGoalTool: CreateGoalTool,
    private readonly updateGoalTool: UpdateGoalTool,
    private readonly updateStartupProfileTool: UpdateStartupProfileTool,
    private readonly createTaskTool: CreateTaskTool,
    private readonly updateTaskTool: UpdateTaskTool,
    private readonly listTasksTool: ListTasksTool,
  ) {}

  onModuleInit() {
    this.registerTool(this.searchWebTool);
    this.registerTool(this.createGoalTool);
    this.registerTool(this.updateGoalTool);
    this.registerTool(this.updateStartupProfileTool);
    this.registerTool(this.createTaskTool);
    this.registerTool(this.updateTaskTool);
    this.registerTool(this.listTasksTool);
  }

  private registerTool(tool: IAiTool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): IAiTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Executes a tool called by the AI with strict tenant isolation via Strategy Pattern.
   */
  async executeTool(
    tenantId: string,
    userId: string,
    toolName: string,
    args: any,
  ) {
    this.logger.log(`[Tool] Executing tool ${toolName} for tenant ${tenantId}`);

    const tool = this.tools.get(toolName);
    if (!tool) {
      this.logger.error(`Unknown tool requested: ${toolName}`);
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const context: ToolContext = { tenantId, userId, args };

    try {
      const result = await tool.execute(context);

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
    } catch (error: any) {
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
