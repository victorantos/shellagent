import React, { useState, useEffect } from 'react'
import { Text } from 'ink'

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function Spinner({ label = 'Thinking...' }: { label?: string }) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length)
    }, 80)
    return () => clearInterval(timer)
  }, [])

  return (
    <Text color="cyan">
      {frames[frame]} {label}
    </Text>
  )
}
