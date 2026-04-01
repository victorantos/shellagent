import React from 'react'
import { Box, Text } from 'ink'

type Props = {
  providerName: string
  cwd: string
  isStreaming: boolean
}

export function StatusBar({ providerName, cwd, isStreaming }: Props) {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Text dimColor>
        <Text color="green">{providerName}</Text> · {cwd}
      </Text>
      {isStreaming && <Text dimColor>Ctrl+C to cancel</Text>}
    </Box>
  )
}
