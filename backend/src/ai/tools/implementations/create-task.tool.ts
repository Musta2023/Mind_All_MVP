import { Injectable } from '@nestjs/common';
import { IAiTool, ToolContext } from '../interfaces/ai-tool.interface';
import { StartupService } from '../../../startup/startup.service';

@Injectable()
export class CreateTaskTool implements IAiTool {
  readonly name = 'createTask';
  readonly autoExecute = false;

  constructor(private readonly startupService: StartupService) {}

  async execute(context: ToolContext): Promise<any> {
    const { tenantId, userId, args } = context;
    
    let verifiedGoalId = args.goalId;
    if (verifiedGoalId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(verifiedGoalId)) {
        verifiedGoalId = undefined;
      }
    }

    return this.startupService.createTask(tenantId, userId, {
      title: args.title,
      description: args.description,
      priority: args.priority,
      dueDate: args.dueDate,
      goalId: verifiedGoalId,
      status: args.status,
    });
  }
}
