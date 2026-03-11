import { Injectable } from '@nestjs/common';
import { IAiTool, ToolContext } from '../interfaces/ai-tool.interface';
import { StartupService } from '../../../startup/startup.service';

@Injectable()
export class ListTasksTool implements IAiTool {
  readonly name = 'listTasks';
  readonly autoExecute = true;

  constructor(private readonly startupService: StartupService) {}

  async execute(context: ToolContext): Promise<any> {
    const { tenantId, userId } = context;
    return this.startupService.getTasks(tenantId, userId);
  }

  formatResponse(result: any): string {
    if (Array.isArray(result)) {
      const taskSummary = result.length > 0
        ? result.map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority})`).join('\n')
        : 'No active tasks found.';

      return `\n\n### [INTERNAL] TACTICAL BOARD\n${taskSummary}`;
    }
    return '';
  }
}
