import type { Tool } from '../tools/types.js'
import type { ToolContext } from '../tools/types.js'
import type { QueryEvent } from './types.js'
import { getTool } from '../tools/registry.js'

type ToolCall = {
  id: string
  name: string
  input: Record<string, unknown>
}

export async function* executeTools(
  toolCalls: ToolCall[],
  ctx: ToolContext,
  onPermissionRequest: (id: string, name: string, input: Record<string, unknown>) => Promise<boolean>,
): AsyncGenerator<QueryEvent> {
  // Partition into concurrent-safe and exclusive groups
  const concurrent: ToolCall[] = []
  const exclusive: ToolCall[] = []

  for (const call of toolCalls) {
    const tool = getTool(call.name)
    if (!tool) {
      yield { type: 'tool_end', id: call.id, output: `Unknown tool: ${call.name}`, isError: true }
      continue
    }
    if (tool.isConcurrencySafe && !tool.needsPermission) {
      concurrent.push(call)
    } else {
      exclusive.push(call)
    }
  }

  // Run concurrent tools in parallel
  if (concurrent.length > 0) {
    const promises = concurrent.map(async (call) => {
      const tool = getTool(call.name)!
      yield_start(call)
      try {
        const parsed = tool.inputSchema.parse(call.input)
        const result = await tool.execute(parsed, ctx)
        return { type: 'tool_end' as const, id: call.id, output: result.output, isError: result.isError ?? false }
      } catch (err: any) {
        return { type: 'tool_end' as const, id: call.id, output: `Error: ${err.message}`, isError: true }
      }
    })

    // Yield starts first
    for (const call of concurrent) {
      yield { type: 'tool_start', id: call.id, name: call.name, input: call.input }
    }

    const results = await Promise.all(promises)
    for (const result of results) {
      yield result
    }
  }

  // Run exclusive tools serially
  for (const call of exclusive) {
    const tool = getTool(call.name)!
    yield { type: 'tool_start', id: call.id, name: call.name, input: call.input }

    // Check permission
    if (tool.needsPermission) {
      const allowed = await onPermissionRequest(call.id, call.name, call.input)
      if (!allowed) {
        yield { type: 'tool_end', id: call.id, output: 'Permission denied by user.', isError: true }
        continue
      }
    }

    try {
      const parsed = tool.inputSchema.parse(call.input)
      const result = await tool.execute(parsed, ctx)
      yield { type: 'tool_end', id: call.id, output: result.output, isError: result.isError ?? false }
    } catch (err: any) {
      yield { type: 'tool_end', id: call.id, output: `Error: ${err.message}`, isError: true }
    }
  }
}

// Helper used in promise map - can't yield from async map, so restructure
function yield_start(_call: ToolCall) {
  // Starts are yielded in the main generator, not here
}
