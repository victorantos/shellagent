import type { Message } from '../providers/types.js'

export type ToolCallState = {
  id: string
  name: string
  input: Record<string, unknown>
  status: 'running' | 'done' | 'error'
  output?: string
}

export type PendingPermission = {
  toolName: string
  input: Record<string, unknown>
  resolve: (allowed: boolean) => void
}

export type AppState = {
  messages: Message[]
  isStreaming: boolean
  streamingText: string
  toolCalls: Map<string, ToolCallState>
  pendingPermission: PendingPermission | null
  tokenCount: number
  providerName: string
  cwd: string
}

export type QueryEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_start'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_end'; id: string; output: string; isError: boolean }
  | { type: 'turn_complete' }
  | { type: 'error'; error: string }
  | { type: 'permission_request'; id: string; toolName: string; input: Record<string, unknown> }
