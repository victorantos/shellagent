import Anthropic from '@anthropic-ai/sdk'
import type { Provider, Message, ToolDefinition, StreamEvent } from './types.js'

type AnthropicProviderOptions = {
  model?: string
  systemPrompt?: string
}

export class AnthropicProvider implements Provider {
  name = 'Anthropic'
  private client: Anthropic
  private model: string
  private systemPrompt: string

  constructor(apiKey: string, options?: AnthropicProviderOptions) {
    this.client = new Anthropic({ apiKey })
    this.model = options?.model ?? 'claude-sonnet-4-6'
    this.systemPrompt = options?.systemPrompt ?? ''
  }

  async *chat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent> {
    const apiMessages = this.mapMessages(messages)
    const apiTools = this.mapTools(tools)

    try {
      const response = this.client.messages.stream({
        model: this.model,
        max_tokens: 8192,
        system: this.systemPrompt || undefined,
        messages: apiMessages,
        tools: apiTools.length > 0 ? apiTools : undefined,
      })

      // Track tool use blocks being built per content_block index
      const toolBlocks = new Map<number, { id: string; name: string; inputJson: string }>()

      for await (const event of response) {
        if (signal?.aborted) return

        switch (event.type) {
          case 'content_block_start': {
            const block = event.content_block
            if (block.type === 'tool_use') {
              toolBlocks.set(event.index, { id: block.id, name: block.name, inputJson: '' })
              yield { type: 'tool_use_start', id: block.id, name: block.name }
            }
            break
          }

          case 'content_block_delta': {
            const delta = event.delta as any
            if (delta.type === 'text_delta') {
              yield { type: 'text_delta', text: delta.text }
            } else if (delta.type === 'input_json_delta') {
              const block = toolBlocks.get(event.index)
              if (block) {
                block.inputJson += delta.partial_json
                yield { type: 'tool_use_delta', id: block.id, inputJson: delta.partial_json }
              }
            }
            break
          }

          case 'content_block_stop': {
            const block = toolBlocks.get(event.index)
            if (block) {
              let input: Record<string, unknown> = {}
              try {
                input = JSON.parse(block.inputJson)
              } catch {
                // empty
              }
              yield { type: 'tool_use_end', id: block.id, input }
              toolBlocks.delete(event.index)
            }
            break
          }

          case 'message_stop': {
            const finalMessage = await response.finalMessage()
            const hasToolUse = finalMessage.content.some((b) => b.type === 'tool_use')
            const stopReason = hasToolUse
              ? 'tool_use'
              : finalMessage.stop_reason === 'max_tokens'
                ? 'max_tokens'
                : 'end_turn'
            yield { type: 'message_end', stopReason }
            break
          }
        }
      }
    } catch (err: any) {
      yield { type: 'error', error: err.message ?? String(err) }
    }
  }

  private mapMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages.map((m) => {
      if (m.role === 'user') {
        return { role: 'user' as const, content: m.content }
      }
      if (m.role === 'assistant') {
        return {
          role: 'assistant' as const,
          content: m.content.map((c) => {
            if (c.type === 'text') return { type: 'text' as const, text: c.text }
            return {
              type: 'tool_use' as const,
              id: c.id,
              name: c.name,
              input: c.input,
            }
          }),
        }
      }
      // tool_result → wrap in user message
      return {
        role: 'user' as const,
        content: [
          {
            type: 'tool_result' as const,
            tool_use_id: m.toolUseId,
            content: m.content,
            is_error: m.isError,
          },
        ],
      }
    })
  }

  private mapTools(tools: ToolDefinition[]): Anthropic.Tool[] {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }))
  }
}
