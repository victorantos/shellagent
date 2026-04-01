# ShellAgent

An open-source interactive terminal inspired by [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code). Built with TypeScript, React (Ink), and an async generator architecture.

Ships with a mock provider for demo. Bring your own API for production.

## Quick Start

```bash
npm install
npx tsx src/index.tsx
```

## What It Does

ShellAgent is an agentic terminal — you type a request, the AI streams a response, calls tools when needed, and loops until done.

```
> read the file package.json
< Let me read that file for you.
  ✓ [ReadFile] package.json — 30 lines
< Here's what I found: ...
```

Built-in tools:
- **ReadFile** — read files with line numbers
- **ListFiles** — glob pattern matching
- **SearchFiles** — grep/ripgrep search
- **Bash** — shell execution (asks permission)
- **WriteFile** — file writing (asks permission)
- **MockWeather** — demo tool showing how to add custom tools

## Architecture

```
User Input → Provider.chat() → StreamEvent stream → Tool Executor → loop
                 ↑                                        |
                 └──────── tool results ──────────────────┘
```

- **Provider**: Async generator that yields stream events. Swap this to connect your own API.
- **Tool**: Zod-validated execute function. Read-only tools run concurrently. Write tools ask permission.
- **Query Engine**: Async generator loop that orchestrates provider calls and tool execution.
- **UI**: React (Ink) components — MessageList, InputBox, ToolProgress, PermissionPrompt.

## Bring Your Own API

Implement the `Provider` interface:

```typescript
import type { Provider, Message, ToolDefinition, StreamEvent } from './src/providers/types'

class MyProvider implements Provider {
  name = 'MyAPI'

  async *chat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent> {
    // Call your API, yield StreamEvent objects
    yield { type: 'text_delta', text: 'Hello ' }
    yield { type: 'text_delta', text: 'world!' }
    yield { type: 'message_end', stopReason: 'end_turn' }
  }
}
```

Then pass it to the config:

```typescript
import { loadConfig } from './src/config'
const config = loadConfig({ provider: new MyProvider() })
```

### Example: Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { Provider, Message, ToolDefinition, StreamEvent } from './src/providers/types'

class AnthropicProvider implements Provider {
  name = 'Anthropic'
  private client: Anthropic

  constructor(apiKey: string, private model = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey })
  }

  async *chat(messages: Message[], tools: ToolDefinition[], signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
      messages: messages.map(m => {
        if (m.role === 'tool_result') return { role: 'user', content: [{ type: 'tool_result', tool_use_id: m.toolUseId, content: m.content }] }
        return m
      }),
      tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') yield { type: 'text_delta', text: event.delta.text }
        if (event.delta.type === 'input_json_delta') yield { type: 'tool_use_delta', id: '', inputJson: event.delta.partial_json }
      }
      // ... map other events to StreamEvent
    }
    yield { type: 'message_end', stopReason: 'end_turn' }
  }
}
```

## Add Custom Tools

```typescript
import { z } from 'zod'
import { buildTool, registerTool } from './src/tools/registry'

const myTool = buildTool({
  name: 'MyTool',
  description: 'Does something useful',
  inputSchema: z.object({ query: z.string() }),
  isReadOnly: true,
  async execute(input) {
    return { output: `Result for: ${input.query}` }
  },
})

registerTool(myTool)
```

## Key Patterns (from Claude Code)

This project implements several patterns discovered in the [Claude Code CLI source analysis](https://victorantos.com/posts/i-pointed-claude-at-its-own-leaked-source-heres-what-it-found/):

- **Async generators** for streaming control flow
- **Concurrent tool execution** with serial fallback for destructive tools
- **Subscription-based state store** (no Redux, no Zustand — 25 lines)
- **Provider abstraction** as the API swap point
- **Permission prompts** for non-read-only tools

## License

GPL-3.0
