import { z } from 'zod'

export type ToolResult = {
  output: string
  isError?: boolean
}

export type ToolContext = {
  cwd: string
  abortSignal: AbortSignal
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
