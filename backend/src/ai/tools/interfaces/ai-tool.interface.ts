export interface ToolContext {
  tenantId: string;
  userId: string;
  args: Record<string, any>;
}

export interface IAiTool {
  readonly name: string;
  readonly autoExecute: boolean;
  execute(context: ToolContext): Promise<any>;
  formatResponse?(result: any): string;
}
