import { z } from 'zod'
import type { Tool, ToolResult, ToolContext } from './types.js'
import type { ToolDefinition } from '../providers/types.js'
import zodToJsonSchema from 'zod-to-json-schema'

const tools = new Map<string, Tool>()

export function registerTool(tool: Tool): void {
  tools.set(tool.name, tool)
}

export function getTool(name: string): Tool | undefined {
  return tools.get(name)
}

export function getAllTools(): Tool[] {
  return Array.from(tools.values())
}

export function getToolDefinitions(): ToolDefinition[] {
  return getAllTools().map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.inputSchema) as Record<string, unknown>,
  }))
}

export function buildTool<T extends z.ZodType>(def: {
  name: string
  description: string
  inputSchema: T
  execute: (input: z.infer<T>, ctx: ToolContext) => Promise<ToolResult>
  isReadOnly?: boolean
  isConcurrencySafe?: boolean
  needsPermission?: boolean
}): Tool<T> {
  const isReadOnly = def.isReadOnly ?? false
  return {
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    execute: def.execute,
    isReadOnly,
    isConcurrencySafe: def.isConcurrencySafe ?? false,
    needsPermission: def.needsPermission ?? !isReadOnly,
  }
}
