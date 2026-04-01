import React from 'react'
import { Box, Text } from 'ink'
import type { Message, AssistantContent } from '../providers/types.js'

type Props = {
  messages: Message[]
  streamingText: string
}

function renderContent(content: AssistantContent[]): React.ReactNode[] {
  return content.map((c, i) => {
    if (c.type === 'text') {
      return <Text key={i}>{c.text}</Text>
    }
    if (c.type === 'tool_use') {
      return (
        <Text key={i} dimColor>
          [Called {c.name}]
        </Text>
      )
    }
    return null
  })
}

export function MessageList({ messages, streamingText }: Props) {
  return (
    <Box flexDirection="column" flexGrow={1}>
      {messages.map((msg, i) => {
        if (msg.role === 'user') {
          return (
            <Box key={i} marginY={0}>
              <Text color="blue" bold>{'> '}</Text>
              <Text>{msg.content}</Text>
            </Box>
          )
        }
        if (msg.role === 'assistant') {
          return (
            <Box key={i} flexDirection="column" marginY={0}>
              <Box>
                <Text color="green" bold>{'< '}</Text>
                <Box flexDirection="column">{renderContent(msg.content)}</Box>
              </Box>
            </Box>
          )
        }
        if (msg.role === 'tool_result') {
          const lines = msg.content.split('\n')
          const preview = lines.slice(0, 8).join('\n')
          const truncated = lines.length > 8
          return (
            <Box key={i} paddingLeft={4} marginY={0} flexDirection="column">
              <Text dimColor>{preview}</Text>
              {truncated && <Text dimColor italic>... ({lines.length - 8} more lines)</Text>}
            </Box>
          )
        }
        return null
      })}
      {streamingText && (
        <Box marginY={0}>
          <Text color="green" bold>{'< '}</Text>
          <Text>{streamingText}</Text>
          <Text color="cyan">▋</Text>
        </Box>
      )}
    </Box>
  )
}
