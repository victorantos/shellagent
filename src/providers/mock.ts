import type { Provider, Message, ToolDefinition, StreamEvent } from './types.js'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
const jitter = (min: number, max: number) => min + Math.random() * (max - min)

function extractLastUserMessage(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return (messages[i] as { role: 'user'; content: string }).content
  }
  return ''
}

function hasToolResults(messages: Message[]): boolean {
  return messages.some((m) => m.role === 'tool_result')
}

function countToolTurns(messages: Message[]): number {
  return messages.filter((m) => m.role === 'assistant' && (m as any).content?.some?.((c: any) => c.type === 'tool_use')).length
}

function detectIntent(text: string): { tool: string; args: Record<string, unknown> } | null {
  const lower = text.toLowerCase()

  if (/\b(read|show|cat|open|view)\b.*\b(file|code|source|contents?)\b/.test(lower)) {
    const pathMatch = text.match(/[`"']([^`"']+\.\w+)[`"']/i) || text.match(/\b(\S+\.\w{1,5})\b/)
    return { tool: 'ReadFile', args: { file_path: pathMatch?.[1] ?? 'README.md' } }
  }

  if (/\b(list|find|glob|ls)\b.*\b(files?|dir|folder)\b/.test(lower)) {
    const patternMatch = text.match(/[`"']([^`"']+)[`"']/i)
    return { tool: 'ListFiles', args: { pattern: patternMatch?.[1] ?? '**/*' } }
  }

  if (/\b(search|grep|find|look\s+for)\b.*\b(in|for|pattern|code)\b/.test(lower)) {
    const patternMatch = text.match(/[`"']([^`"']+)[`"']/i)
    return { tool: 'SearchFiles', args: { pattern: patternMatch?.[1] ?? text.split(' ').pop() ?? 'TODO' } }
  }

  if (/\b(run|exec|shell|bash|command)\b/.test(lower)) {
    const cmdMatch = text.match(/[`"']([^`"']+)[`"']/i)
    return { tool: 'Bash', args: { command: cmdMatch?.[1] ?? 'echo "Hello from NestClaw!"' } }
  }

  if (/\bweather\b/.test(lower)) {
    const cityMatch = text.match(/(?:weather|in|for)\s+(\w[\w\s]*)/i)
    return { tool: 'MockWeather', args: { city: cityMatch?.[1]?.trim() ?? 'London' } }
  }

  return null
}

async function* streamText(text: string): AsyncGenerator<StreamEvent> {
  const words = text.split(' ')
  for (let i = 0; i < words.length; i++) {
    const word = i === 0 ? words[i] : ' ' + words[i]
    yield { type: 'text_delta', text: word }
    await delay(jitter(20, 60))
  }
}

const followUpResponses = [
  "Based on the results above, here's what I can see:",
  "Here's what I found:",
  "The results show the following:",
]

const generalResponses = [
  "I'm NestClaw Terminal, an open-source interactive terminal inspired by the Claude Code CLI. I can help you read files, search code, run commands, and more. Try asking me to read a file or search for something!",
  "I can help with that! I have access to tools like ReadFile, ListFiles, SearchFiles, Bash, and WriteFile. What would you like to do?",
  "Sure thing. I can read files, search your codebase, run shell commands, or check the weather (that last one's a demo). What do you need?",
]

export class MockProvider implements Provider {
  name = 'MockProvider'

  async *chat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent> {
    await delay(jitter(200, 500))

    const lastUser = extractLastUserMessage(messages)
    const toolTurns = countToolTurns(messages)
    const lastIsToolResult = messages.length > 0 && messages[messages.length - 1].role === 'tool_result'

    // After tool results, generate a follow-up summary
    if (lastIsToolResult && toolTurns > 0) {
      const followUp = followUpResponses[Math.floor(Math.random() * followUpResponses.length)]
      yield* streamText(followUp)

      const lastResult = messages[messages.length - 1] as { role: 'tool_result'; content: string }
      const preview = lastResult.content.split('\n').slice(0, 5).join('\n')
      yield { type: 'text_delta', text: '\n\n' }
      yield* streamText(`The output contains ${lastResult.content.split('\n').length} lines. Here's a preview:\n\n${preview}`)

      if (lastResult.content.split('\n').length > 5) {
        yield { type: 'text_delta', text: '\n\n' }
        yield* streamText('Would you like me to look at anything specific?')
      }

      yield { type: 'message_end', stopReason: 'end_turn' }
      return
    }

    // Cap tool turns to prevent infinite loops
    if (toolTurns >= 3) {
      yield* streamText("I've completed several tool operations. Let me know if you need anything else.")
      yield { type: 'message_end', stopReason: 'end_turn' }
      return
    }

    // Try to match user intent to a tool
    const intent = detectIntent(lastUser)
    if (intent) {
      const toolExists = tools.some((t) => t.name === intent.tool)
      if (toolExists) {
        yield* streamText(`Let me ${intent.tool === 'ReadFile' ? 'read that file' : intent.tool === 'Bash' ? 'run that command' : intent.tool === 'ListFiles' ? 'list those files' : intent.tool === 'SearchFiles' ? 'search for that' : 'check that'} for you.`)
        yield { type: 'text_delta', text: '\n\n' }

        const id = `tool_${Date.now()}`
        const inputJson = JSON.stringify(intent.args)
        yield { type: 'tool_use_start', id, name: intent.tool }
        // Stream input JSON in chunks
        for (let i = 0; i < inputJson.length; i += 10) {
          yield { type: 'tool_use_delta', id, inputJson: inputJson.slice(i, i + 10) }
          await delay(jitter(10, 30))
        }
        yield { type: 'tool_use_end', id, input: intent.args }
        yield { type: 'message_end', stopReason: 'tool_use' }
        return
      }
    }

    // General response
    const response = generalResponses[Math.floor(Math.random() * generalResponses.length)]
    yield* streamText(response)
    yield { type: 'message_end', stopReason: 'end_turn' }
  }
}
