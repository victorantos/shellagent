import type { Provider } from './providers/types.js'
import type { Tool } from './tools/types.js'
import { MockProvider } from './providers/mock.js'
import { registerTool, getAllTools } from './tools/registry.js'
import { readFileTool } from './tools/read-file.js'
import { listFilesTool } from './tools/list-files.js'
import { searchFilesTool } from './tools/search-files.js'
import { bashTool } from './tools/bash.js'
import { writeFileTool } from './tools/write-file.js'
import { mockWeatherTool } from './tools/mock-weather.js'

export type ShellAgentConfig = {
  provider: Provider
  cwd: string
  maxTurns: number
}

const defaultTools: Tool[] = [
  readFileTool,
  listFilesTool,
  searchFilesTool,
  bashTool,
  writeFileTool,
  mockWeatherTool,
]

export function loadConfig(overrides: Partial<ShellAgentConfig> = {}): ShellAgentConfig {
  // Register all default tools
  for (const tool of defaultTools) {
    registerTool(tool)
  }

  return {
    provider: overrides.provider ?? new MockProvider(),
    cwd: overrides.cwd ?? process.cwd(),
    maxTurns: overrides.maxTurns ?? 10,
  }
}
