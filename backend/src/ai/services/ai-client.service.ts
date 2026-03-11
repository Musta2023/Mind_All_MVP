import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiResilienceService } from './ai-resilience.service';

@Injectable()
export class AiClientService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private resilienceService: AiResilienceService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async streamChat(
    prompt: string,
    onToken: (token: string) => void,
  ): Promise<string> {
    return this.resilienceService.withRetry(async (modelName) => {
      const model = this.genAI.getGenerativeModel({ model: modelName });
      let fullResponse = '';

      const stream = await model.generateContentStream(prompt);

      for await (const chunk of stream.stream) {
        const text = chunk.candidates[0]?.content?.parts[0]?.text || '';
        if (text) {
          fullResponse += text;
          onToken(text);
        }
      }

      return fullResponse;
    });
  }

  async generateJSON(prompt: string, maxRetries: number = 3): Promise<any> {
    const text = await this.resilienceService.withRetry(async (modelName) => {
      const model = this.genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(prompt);
      return response.response.text();
    }, maxRetries);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new BadRequestException('No JSON found in AI response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new BadRequestException('Failed to parse AI JSON response');
    }
  }
}
