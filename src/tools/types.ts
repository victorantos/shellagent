import { z } from 'zod'

export type ToolResult = {
  output: string
  isError?: boolean
}

export type ToolContext = {
  cwd: string
  abortSignal: AbortSignal
  /** Permission handler from the active query loop. Used by Agent tool for subagent permission gating. */
  onPermissionRequest?: (id: string, toolName: string, input: Record<string, unknown>) => Promise<boolean>
}

export interface Tool<TInput extends z.ZodType = z.ZodType> {
  name: string
  description: string
  inputSchema: TInput
  isReadOnly: boolean
  isConcurrencySafe: boolean
  needsPermission: boolean
  execute(input: z.infer<TInput>, ctx: ToolContext): Promise<ToolResult>
}

/**
 * Definition for a subagent that can be spawned by the Agent tool.
 * Subagents run in their own conversation with a specialized system prompt.
 */
export type AgentDefinition = {
  name: string
  description: string
  systemPrompt: string
  tools?: string[]    // Allowed tool names (default: all registered tools)
  model?: string      // Optional model hint
}
