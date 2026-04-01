import React from 'react'
import { Box, Text } from 'ink'
import { Spinner } from './Spinner.js'
import type { ToolCallState } from '../engine/types.js'

type Props = {
  toolCalls: Map<string, ToolCallState>
}

function toolInputSummary(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'ReadFile': return String(input.file_path ?? '')
    case 'ListFiles': return String(input.pattern ?? '')
    case 'SearchFiles': return String(input.pattern ?? '')
    case 'Bash': return String(input.command ?? '').slice(0, 60)
    case 'WriteFile': return String(input.file_path ?? '')
    case 'MockWeather': return String(input.city ?? '')
    default: return JSON.stringify(input).slice(0, 60)
  }
}

export function ToolProgress({ toolCalls }: Props) {
  const calls = Array.from(toolCalls.values())
  if (calls.length === 0) return null

  return (
    <Box flexDirection="column" marginY={0}>
      {calls.map((tc) => (
        <Box key={tc.id} paddingLeft={2}>
          {tc.status === 'running' && <Spinner label="" />}
          {tc.status === 'done' && <Text color="green">✓</Text>}
          {tc.status === 'error' && <Text color="red">✗</Text>}
          <Text> </Text>
          <Text color="yellow">[{tc.name}]</Text>
          <Text dimColor> {toolInputSummary(tc.name, tc.input)}</Text>
          {tc.status !== 'running' && tc.output && (
            <Text dimColor> — {tc.output.split('\n').length} lines</Text>
          )}
        </Box>
      ))}
    </Box>
  )
}
