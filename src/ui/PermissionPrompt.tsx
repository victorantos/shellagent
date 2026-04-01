import React from 'react'
import { Box, Text, useInput } from 'ink'
import type { PendingPermission } from '../engine/types.js'

type Props = {
  permission: PendingPermission
  onRespond: (allowed: boolean) => void
}

export function PermissionPrompt({ permission, onRespond }: Props) {
  useInput((input) => {
    if (input === 'y' || input === 'Y') onRespond(true)
    if (input === 'n' || input === 'N') onRespond(false)
  })

  const inputSummary = JSON.stringify(permission.input, null, 2)

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} marginY={1}>
      <Text color="yellow" bold>Permission Required</Text>
      <Text>
        <Text color="cyan">{permission.toolName}</Text> wants to execute:
      </Text>
      <Box paddingLeft={2} marginY={0}>
        <Text dimColor>{inputSummary}</Text>
      </Box>
      <Text>
        Allow? <Text color="green">[y]es</Text> / <Text color="red">[n]o</Text>
      </Text>
    </Box>
  )
}
