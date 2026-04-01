import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

type Props = {
  onSubmit: (text: string) => void
  isActive: boolean
}

export function InputBox({ onSubmit, isActive }: Props) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useInput(
    (char, key) => {
      if (!isActive) return

      if (key.return) {
        if (input.trim()) {
          onSubmit(input.trim())
          setHistory((h) => [input.trim(), ...h])
          setInput('')
          setHistoryIndex(-1)
        }
        return
      }

      if (key.backspace || key.delete) {
        setInput((v) => v.slice(0, -1))
        return
      }

      if (key.upArrow) {
        if (history.length > 0) {
          const next = Math.min(historyIndex + 1, history.length - 1)
          setHistoryIndex(next)
          setInput(history[next])
        }
        return
      }

      if (key.downArrow) {
        if (historyIndex > 0) {
          const next = historyIndex - 1
          setHistoryIndex(next)
          setInput(history[next])
        } else {
          setHistoryIndex(-1)
          setInput('')
        }
        return
      }

      if (!key.ctrl && !key.meta && char) {
        setInput((v) => v + char)
      }
    },
    { isActive },
  )

  return (
    <Box>
      <Text color={isActive ? 'green' : 'gray'} bold>{'> '}</Text>
      <Text>{input}</Text>
      {isActive && <Text color="green">▋</Text>}
    </Box>
  )
}
