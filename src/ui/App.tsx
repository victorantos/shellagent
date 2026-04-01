import React, { useState, useCallback, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import type { Message } from '../providers/types.js'
import type { Provider } from '../providers/types.js'
import type { ToolCallState, PendingPermission } from '../engine/types.js'
import { queryLoop } from '../engine/query.js'
import { MessageList } from './MessageList.js'
import { InputBox } from './InputBox.js'
import { StatusBar } from './StatusBar.js'
import { Spinner } from './Spinner.js'
import { ToolProgress } from './ToolProgress.js'
import { PermissionPrompt } from './PermissionPrompt.js'

type Props = {
  provider: Provider
  cwd: string
}

export function App({ provider, cwd }: Props) {
  const { exit } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [toolCalls, setToolCalls] = useState<Map<string, ToolCallState>>(new Map())
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (isStreaming && abortRef.current) {
        abortRef.current.abort()
        setIsStreaming(false)
        setStreamingText('')
        setToolCalls(new Map())
        setPendingPermission(null)
      } else {
        exit()
      }
    }
  })

  const handleSubmit = useCallback(async (text: string) => {
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsStreaming(true)
    setStreamingText('')
    setToolCalls(new Map())

    const abort = new AbortController()
    abortRef.current = abort

    const permissionPromise = (id: string, toolName: string, input: Record<string, unknown>): Promise<boolean> => {
      return new Promise((resolve) => {
        setPendingPermission({ toolName, input, resolve })
      })
    }

    try {
      const stream = queryLoop({
        provider,
        messages: newMessages,
        cwd,
        signal: abort.signal,
        onPermissionRequest: permissionPromise,
      })

      let accumulatedText = ''

      for await (const event of stream) {
        switch (event.type) {
          case 'text_delta':
            accumulatedText += event.text
            setStreamingText(accumulatedText)
            break

          case 'tool_start':
            setToolCalls((prev) => {
              const next = new Map(prev)
              next.set(event.id, { id: event.id, name: event.name, input: event.input, status: 'running' })
              return next
            })
            break

          case 'tool_end':
            setToolCalls((prev) => {
              const next = new Map(prev)
              next.set(event.id, {
                ...prev.get(event.id)!,
                status: event.isError ? 'error' : 'done',
                output: event.output,
              })
              return next
            })
            break

          case 'turn_complete':
            break

          case 'error':
            setStreamingText((prev) => prev + `\n\nError: ${event.error}`)
            break
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStreamingText((prev) => prev + `\n\nError: ${err.message}`)
      }
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      // Update messages from the mutated array (queryLoop appends to it)
      setMessages([...newMessages])
      setToolCalls(new Map())
    }
  }, [messages, provider, cwd])

  const handlePermissionResponse = useCallback((allowed: boolean) => {
    if (pendingPermission) {
      pendingPermission.resolve(allowed)
      setPendingPermission(null)
    }
  }, [pendingPermission])

  return (
    <Box flexDirection="column" height="100%">
      <Box marginBottom={1}>
        <Text color="cyan" bold>ShellAgent</Text>
        <Text dimColor> — open-source interactive terminal</Text>
      </Box>

      <MessageList messages={messages} streamingText={streamingText} />

      {toolCalls.size > 0 && <ToolProgress toolCalls={toolCalls} />}

      {isStreaming && toolCalls.size === 0 && !streamingText && <Spinner />}

      {pendingPermission ? (
        <PermissionPrompt permission={pendingPermission} onRespond={handlePermissionResponse} />
      ) : (
        <InputBox onSubmit={handleSubmit} isActive={!isStreaming} />
      )}

      <StatusBar providerName={provider.name} cwd={cwd} isStreaming={isStreaming} />
    </Box>
  )
}
