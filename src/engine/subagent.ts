import type { Provider, Message } from '../providers/types.js'
import type { AgentDefinition } from '../tools/types.js'
import { queryLoop } from './query.js'

type SubagentParams = {
  provider: Provider
  agentDefinition: AgentDefinition
  prompt: string
  cwd: string
  signal: AbortSignal
  onPermissionRequest: (id: string, toolName: string, input: Record<string, unknown>) => Promise<boolean>
  maxTurns?: number
}

/**
 * Run a subagent in its own conversation context.
 *
 * The subagent gets a fresh message array with only the user prompt,
 * uses the agent's system prompt (via a provider wrapper), and runs
 * its own queryLoop. The parent receives only the final text output.
 */
export async function runSubagent(params: SubagentParams): Promise<string> {
  const {
    provider,
    agentDefinition,
    prompt,
    cwd,
    signal,
    onPermissionRequest,
    maxTurns = 10,
  } = params

  // Wrap the provider to inject the agent's system prompt
  const agentProvider: Provider = {
    name: `${provider.name}:${agentDefinition.name}`,
    async *chat(messages, tools, sig) {
      // If the provider supports system prompt override, use it
      // Otherwise, prepend a system message as the first user turn
      const providerAny = provider as any
      if (typeof providerAny.withSystemPrompt === 'function') {
        yield* providerAny.withSystemPrompt(agentDefinition.systemPrompt).chat(messages, tools, sig)
      } else {
        // Prepend system prompt as context in the first user message
        const augmentedMessages = [...messages]
        if (augmentedMessages.length > 0 && augmentedMessages[0].role === 'user') {
          const original = augmentedMessages[0] as { role: 'user'; content: string }
          augmentedMessages[0] = {
            role: 'user',
            content: `<system>\n${agentDefinition.systemPrompt}\n</system>\n\n${original.content}`,
          }
        }
        yield* provider.chat(augmentedMessages, tools, sig)
      }
    },
  }

  // Start fresh conversation with just the user prompt
  const messages: Message[] = [{ role: 'user', content: prompt }]

  // TODO: filter tools by agentDefinition.tools if specified

  // Collect text output from the child conversation
  const textParts: string[] = []

  const stream = queryLoop({
    provider: agentProvider,
    messages,
    cwd,
    signal,
    onPermissionRequest,
    maxTurns,
  })

  for await (const event of stream) {
    if (signal.aborted) break

    switch (event.type) {
      case 'text_delta':
        // Accumulate text from the subagent
        textParts.push(event.text)
        break
      case 'error':
        textParts.push(`\n[Agent error: ${event.error}]`)
        break
      case 'turn_complete':
        break
    }
  }

  return textParts.join('') || '(Agent produced no output)'
}
