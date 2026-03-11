import { Injectable, Logger } from '@nestjs/common';
import { IAiTool, ToolContext } from '../interfaces/ai-tool.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SearchWebTool implements IAiTool {
  readonly name = 'searchWeb';
  readonly autoExecute = true;
  private readonly logger = new Logger(SearchWebTool.name);

  constructor(private readonly configService: ConfigService) {}

  async execute(context: ToolContext): Promise<any> {
    const apiKey = this.configService.get<string>('TAVILY_API_KEY');
    if (!apiKey) {
      this.logger.warn('TAVILY_API_KEY not set, web search disabled.');
      return { error: 'Web search is currently unavailable.' };
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: context.args.query,
          search_depth: 'advanced',
          include_answer: true,
          max_results: 5,
        }),
      });

      const data = (await response.json()) as any;
      return {
        answer: data.answer,
        results: data.results?.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        })),
        query: context.args.query, // Pass the query for formatting
      };
    } catch (error) {
      this.logger.error('Web search failed:', error);
      throw new Error('Failed to perform web search.');
    }
  }

  formatResponse(result: any): string {
    if (!result || result.error) return '';
    let searchSummary = `\n\n### [INTELLIGENCE] SEARCH RESULTS: ${result.query}\n`;
    if (result.answer) {
      searchSummary += `**Summary:** ${result.answer}\n\n`;
    }
    if (result.results && result.results.length > 0) {
      result.results.forEach((r: any, idx: number) => {
        searchSummary += `${idx + 1}. [${r.title}](${r.url})\n`;
        if (r.content) {
          searchSummary += `   *${r.content.substring(0, 160)}...*\n`;
        }
      });
    } else if (!result.answer) {
      searchSummary += 'No specific results found for this query.';
    }
    return searchSummary;
  }
}
