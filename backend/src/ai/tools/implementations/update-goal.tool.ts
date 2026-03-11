import { Injectable } from '@nestjs/common';
import { IAiTool, ToolContext } from '../interfaces/ai-tool.interface';
import { StartupService } from '../../../startup/startup.service';

@Injectable()
export class UpdateGoalTool implements IAiTool {
  readonly name = 'updateGoal';
  readonly autoExecute = false;

  constructor(private readonly startupService: StartupService) {}

  async execute(context: ToolContext): Promise<any> {
    const { tenantId, args } = context;
    return this.startupService.updateGoal(tenantId, args.goalId, {
      title: args.title,
      deadline: args.deadline,
      metrics: args.metrics,
      priority: args.priority,
    });
  }
}
