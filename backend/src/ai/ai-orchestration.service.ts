import { Injectable, BadRequestException } from '@nestjs/common';
import { AiClientService } from './services/ai-client.service';
import { ContextBuilderService } from './services/context-builder.service';

@Injectable()
export class AiOrchestrationService {
  constructor(
    private aiClientService: AiClientService,
    private contextBuilder: ContextBuilderService,
  ) {}

  async streamChat(
    prompt: string,
    onToken: (token: string) => void,
  ): Promise<string> {
    return this.aiClientService.streamChat(prompt, onToken);
  }

  async generateJSON(prompt: string, maxRetries: number = 3): Promise<any> {
    return this.aiClientService.generateJSON(prompt, maxRetries);
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
    return this.contextBuilder.buildContext(
      tenantId,
      conversationId,
      userInput,
      onlineIntelligence,
      preFetchedData,
    );
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

  sanitizeUserInput(input: string): string {
    return input
      .replace(/\`\`\`[\s\S]*?\`\`\`/g, '[code block removed]')
      .replace(/\{[\s\S]*?\}/g, '[data removed]')
      .substring(0, 2000)
      .trim();
  }
}
