import { Injectable, Logger, BadRequestException } from '@nestjs/common';

@Injectable()
export class AiResilienceService {
  private readonly logger = new Logger(AiResilienceService.name);
  
  // Expanded model rotation to handle capacity issues across different tiers
  private readonly models = [
    'gemini-2.5-flash',      // Tier 1: Latest Flash
    'gemini-2.0-flash',      // Tier 2: Stable Flash 2.0
    'gemini-flash-latest',   // Tier 3: Stable Flash 1.5
    'gemini-2.0-flash-lite', // Tier 4: Lite version 2.0
    'gemini-flash-lite-latest' // Tier 5: Lite version 1.5 (8B)
  ];

  /**
   * Executes an AI operation with aggressive model rotation and exponential backoff.
   * Target: Recovers from 429 (Rate Limit) and 503 (Overloaded) errors.
   */
  async withRetry<T>(
    operation: (modelName: string) => Promise<T>,
    maxRetries: number = 5,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Rotate models: try primary first, then cycle through fallbacks
      const modelIndex = (attempt - 1) % this.models.length;
      const currentModel = this.models[modelIndex];

      try {
        return await operation(currentModel);
      } catch (error: any) {
        lastError = error;
        const status = error.status || error.response?.status;

        // 429: Rate Limit, 503: Service Unavailable/Overloaded
        if (status === 503 || status === 429) {
          if (attempt === maxRetries) break;

          // Backoff logic: 429 needs more time than 503
          const baseDelay = status === 429 ? 6000 : 3000;
          
          // Exponential backoff with 20% jitter to prevent thundering herd
          const exponentialDelay = Math.pow(2, attempt - 1) * baseDelay;
          const jitter = exponentialDelay * 0.2 * Math.random();
          const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30s
          
          this.logger.warn(
            `[AI Resilience] Model ${currentModel} failed with ${status}. ` +
            `Attempt ${attempt}/${maxRetries}. Rotating and retrying in ${Math.round(delay)}ms...`
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For non-retryable errors (e.g., 400 Bad Request), fail immediately
        throw error;
      }
    }

    this.logger.error('[AI Resilience] Critical Failure: All models and retry attempts exhausted.', lastError);
    throw new BadRequestException(
      'AI Intelligence Link is currently saturated. Our secondary neural tiers are also at capacity. Please wait 30-60 seconds.',
    );
  }
}
