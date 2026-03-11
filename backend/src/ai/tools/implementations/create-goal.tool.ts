import { Injectable } from '@nestjs/common';
import { IAiTool, ToolContext } from '../interfaces/ai-tool.interface';
import { StartupService } from '../../../startup/startup.service';

@Injectable()
export class CreateGoalTool implements IAiTool {
  readonly name = 'createGoal';
  readonly autoExecute = false;

  constructor(private readonly startupService: StartupService) {}

  async execute(context: ToolContext): Promise<any> {
    const { tenantId, args } = context;
    return this.startupService.createGoal(tenantId, {
      title: args.title,
      deadline: args.deadline,
      metrics: args.metrics || {},
      priority: args.priority,
    });
  }
}
