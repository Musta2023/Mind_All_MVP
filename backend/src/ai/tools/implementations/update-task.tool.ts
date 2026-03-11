import { Injectable } from '@nestjs/common';
import { IAiTool, ToolContext } from '../interfaces/ai-tool.interface';
import { StartupService } from '../../../startup/startup.service';

@Injectable()
export class UpdateTaskTool implements IAiTool {
  readonly name = 'updateTask';
  readonly autoExecute = false;

  constructor(private readonly startupService: StartupService) {}

  async execute(context: ToolContext): Promise<any> {
    const { tenantId, args } = context;
    return this.startupService.updateTask(tenantId, args.taskId, {
      title: args.title,
      description: args.description,
      priority: args.priority,
      dueDate: args.dueDate,
      status: args.status,
    });
  }
}
