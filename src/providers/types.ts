export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_delta'; id: string; inputJson: string }
  | { type: 'tool_use_end'; id: string; input: Record<string, unknown> }
  | { type: 'message_end'; stopReason: 'end_turn' | 'tool_use' | 'max_tokens' }
  | { type: 'error'; error: string }

export type AssistantContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

export type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: AssistantContent[] }
  | { role: 'tool_result'; toolUseId: string; content: string; isError?: boolean }

export type ToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface Provider {
  name: string
  chat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent>
}
