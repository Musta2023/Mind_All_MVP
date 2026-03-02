import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { get_encoding } from 'tiktoken';

@Injectable()
export class TokenCounterService {
  private tokenizer: any;

  constructor(private prisma: PrismaService) {
    // cl100k_base is a safe baseline for many modern models including Gemini
    this.tokenizer = get_encoding('cl100k_base');
  }

  /**
   * Fast synchronous check to prevent overflowing context window
   * and check against tenant monthly budget.
   * Throws 429 (Too Many Requests) for budget issues.
   */
  async preflightCheck(tenantId: string, prompt: string, maxTokens: number = 8000): Promise<number> {
    const tokens = this.tokenizer.encode(prompt).length;
    
    if (tokens > maxTokens) {
      throw new HttpException(
        `Context window overflow (${tokens} > ${maxTokens}). Please reduce input size.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tokenBudgetMonthly: true, currentMonthTokens: true }
    });

    if (tenant && tenant.currentMonthTokens + tokens > tenant.tokenBudgetMonthly) {
      throw new HttpException(
        'Monthly token budget exceeded. Please upgrade your plan.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return tokens;
  }

  // Simple token estimation as fallback
  estimateTokens(text: string): number {
    return this.tokenizer.encode(text).length;
  }

  async trackTokenUsage(
    tenantId: string,
    endpoint: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<number> {
    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.30;
    const totalCost = inputCost + outputCost;

    // Track usage and update tenant counter in a transaction
    await this.prisma.$transaction([
      this.prisma.aITokenUsage.create({
        data: {
          tenantId,
          endpoint,
          inputTokens,
          outputTokens,
          costUSD: totalCost,
        },
      }),
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          currentMonthTokens: {
            increment: inputTokens + outputTokens
          }
        }
      })
    ]);

    return totalCost;
  }

  async getTotalCostByTenant(tenantId: string): Promise<number> {
    const result = await this.prisma.aITokenUsage.aggregate({
      where: { tenantId },
      _sum: { costUSD: true },
    });

    return result._sum.costUSD || 0;
  }
}
