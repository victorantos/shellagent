import { existsSync } from 'fs'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import type { Provider } from './providers/types.js'
import type { Tool, AgentDefinition } from './tools/types.js'
import { MockProvider } from './providers/mock.js'
import { registerTool, registerAgent, getAllTools } from './tools/registry.js'
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

/**
 * Plugin config exported by a shellagent.config.ts file in the working directory.
 * This allows projects to register custom tools and providers without modifying shellagent.
 */
export type PluginConfig = {
  provider?: Provider
  tools?: Tool[]
  agents?: AgentDefinition[]
}

const defaultTools: Tool[] = [
  readFileTool,
  listFilesTool,
  searchFilesTool,
  bashTool,
  writeFileTool,
  mockWeatherTool,
]

const PLUGIN_FILENAMES = [
  'shellagent.config.ts',
  'shellagent.config.js',
  'shellagent.config.mjs',
]

async function loadPluginConfig(cwd: string): Promise<PluginConfig> {
  for (const filename of PLUGIN_FILENAMES) {
    const configPath = resolve(cwd, filename)
    if (existsSync(configPath)) {
      try {
        const mod = await import(pathToFileURL(configPath).href)
        const plugin: PluginConfig = mod.default ?? mod
        console.log(`Loaded plugin: ${filename}`)
        return plugin
      } catch (err: any) {
        console.error(`Failed to load ${filename}: ${err.message}`)
      }
    }
  }
  return {}
}

export async function loadConfig(overrides: Partial<ShellAgentConfig> = {}): Promise<ShellAgentConfig> {
  const cwd = overrides.cwd ?? process.cwd()

  // Register all default tools
  for (const tool of defaultTools) {
    registerTool(tool)
  }

  // Load plugin config from cwd
  const plugin = await loadPluginConfig(cwd)

  // Register plugin tools
  if (plugin.tools) {
    for (const tool of plugin.tools) {
      registerTool(tool)
    }
  }

  // Register plugin agents
  if (plugin.agents) {
    for (const agent of plugin.agents) {
      registerAgent(agent)
    }
  }

  const provider = plugin.provider ?? overrides.provider ?? new MockProvider()

  // Register the Agent tool if any agents are defined
  if (plugin.agents && plugin.agents.length > 0) {
    const { createAgentTool } = await import('./tools/agent.js')
    registerTool(createAgentTool(provider))
  }

  return {
    provider,
    cwd,
    maxTurns: overrides.maxTurns ?? 10,
  }
}
