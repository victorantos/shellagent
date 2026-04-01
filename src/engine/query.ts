import type { Provider, Message, AssistantContent } from '../providers/types.js'
import type { Tool } from '../tools/types.js'
import type { QueryEvent } from './types.js'
import { getToolDefinitions, getTool } from '../tools/registry.js'
import { executeTools } from './executor.js'

type QueryParams = {
  provider: Provider
  messages: Message[]
  cwd: string
  signal: AbortSignal
  onPermissionRequest: (id: string, toolName: string, input: Record<string, unknown>) => Promise<boolean>
  maxTurns?: number
}

export async function* queryLoop(params: QueryParams): AsyncGenerator<QueryEvent> {
  const { provider, messages, cwd, signal, onPermissionRequest, maxTurns = 10 } = params
  const toolDefs = getToolDefinitions()
  let turns = 0

  while (turns < maxTurns) {
    if (signal.aborted) return
    turns++

    // Collect assistant response from stream
    let currentText = ''
    const toolUses: { id: string; name: string; inputChunks: string[]; input?: Record<string, unknown> }[] = []
    let stopReason: string = 'end_turn'

    const stream = provider.chat(messages, toolDefs, signal)

    for await (const event of stream) {
      if (signal.aborted) return

      switch (event.type) {
        case 'text_delta':
          currentText += event.text
          yield { type: 'text_delta', text: event.text }
          break

        case 'tool_use_start':
          toolUses.push({ id: event.id, name: event.name, inputChunks: [] })
          break

        case 'tool_use_delta': {
          const tu = toolUses.find((t) => t.id === event.id)
          if (tu) tu.inputChunks.push(event.inputJson)
          break
        }

        case 'tool_use_end': {
          const tu = toolUses.find((t) => t.id === event.id)
          if (tu) tu.input = event.input
          break
        }

        case 'message_end':
          stopReason = event.stopReason
          break

        case 'error':
          yield { type: 'error', error: event.error }
          return
      }
    }

    // Build assistant message
    const assistantContent: AssistantContent[] = []
    if (currentText) assistantContent.push({ type: 'text', text: currentText })
    for (const tu of toolUses) {
      assistantContent.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input ?? {} })
    }
    messages.push({ role: 'assistant', content: assistantContent })

    // If no tool use, we're done
    if (stopReason !== 'tool_use' || toolUses.length === 0) {
      yield { type: 'turn_complete' }
      return
    }

    // Execute tools
    const toolCalls = toolUses
      .filter((tu) => tu.input)
      .map((tu) => ({ id: tu.id, name: tu.name, input: tu.input! }))

    const ctx = { cwd, abortSignal: signal }

    for await (const event of executeTools(toolCalls, ctx, onPermissionRequest)) {
      yield event

      // Add tool results to messages
      if (event.type === 'tool_end') {
        messages.push({
          role: 'tool_result',
          toolUseId: event.id,
          content: event.output,
          isError: event.isError,
        })
      }
    }

    // Loop continues — provider will see tool results and respond
  }

  yield { type: 'error', error: 'Max turns reached.' }
}
