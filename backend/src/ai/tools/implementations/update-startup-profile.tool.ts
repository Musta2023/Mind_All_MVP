import { Injectable } from '@nestjs/common';
import { IAiTool, ToolContext } from '../interfaces/ai-tool.interface';
import { StartupService } from '../../../startup/startup.service';

@Injectable()
export class UpdateStartupProfileTool implements IAiTool {
  readonly name = 'updateStartupProfile';
  readonly autoExecute = false;

  constructor(private readonly startupService: StartupService) {}

  async execute(context: ToolContext): Promise<any> {
    const { tenantId, args } = context;
    return this.startupService.updateProfile(tenantId, args);
  }
}
