import { Injectable, Logger } from '@nestjs/common';

export interface ParsedToolCall {
  toolName: string;
  args: any;
  originalString: string;
}

@Injectable()
export class ToolParsingService {
  private readonly logger = new Logger(ToolParsingService.name);

  /**
   * Extracts JSON block representations of tool calls from a raw LLM response.
   * Uses robust brace matching.
   */
  extractToolCalls(fullResponse: string): ParsedToolCall[] {
    const matches: string[] = [];
    const startRegex = /\{[\s\r\n]*"tool"/g;
    let startMatch;
    let searchIndex = 0;

    while ((startMatch = startRegex.exec(fullResponse)) !== null) {
      const actualStart = startMatch.index;
      if (actualStart < searchIndex) continue;

      let braceCount = 0;
      let foundEnd = false;
      for (let i = actualStart; i < fullResponse.length; i++) {
        if (fullResponse[i] === '{') braceCount++;
        if (fullResponse[i] === '}') braceCount--;
        
        if (braceCount === 0) {
          matches.push(fullResponse.substring(actualStart, i + 1));
          searchIndex = i + 1;
          startRegex.lastIndex = i + 1;
          foundEnd = true;
          break;
        }
      }
      if (!foundEnd) break;
    }

    const parsedCalls: ParsedToolCall[] = [];

    for (const jsonStr of matches) {
      try {
        let cleanedJson = jsonStr
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
          .trim();

        cleanedJson = cleanedJson.replace(/(?<=:[\s]*".*)\n(?=.*")/g, '\\n');

        const parsed = JSON.parse(cleanedJson);
        const toolName = parsed.tool || parsed.tool_call;
        const args = parsed.args || parsed.parameters;

        if (toolName && args) {
          parsedCalls.push({
            toolName,
            args,
            originalString: jsonStr,
          });
        }
      } catch (err: any) {
        this.logger.error(`Failed to parse tool JSON block: ${jsonStr.substring(0, 50)}...`, err.message);
      }
    }

    return parsedCalls;
  }
}
