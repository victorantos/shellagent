import { z } from 'zod'
import type { Provider } from '../providers/types.js'
import { runSubagent } from '../engine/subagent.js'
import { buildTool } from './registry.js'
import { getAgent, getAllAgents } from './registry.js'

/**
 * Create the Agent tool that spawns subagents.
 * Must be called after agents are registered so the description includes available agents.
 */
export function createAgentTool(provider: Provider) {
  const agentList = getAllAgents()
  const agentDescriptions = agentList.length > 0
    ? agentList.map((a) => `- **${a.name}**: ${a.description}`).join('\n')
    : '(No agents registered)'

  return buildTool({
    name: 'Agent',
    description: `Spawn a subagent to handle a specialized task. The subagent runs in its own conversation with a focused system prompt and returns the result.\n\nAvailable agents:\n${agentDescriptions}`,
    inputSchema: z.object({
      prompt: z.string().describe('The task for the agent to perform'),
      agentType: z.string().describe('Which agent to use (must match a registered agent name)'),
    }),
    isReadOnly: true,
    isConcurrencySafe: false,
    needsPermission: false,
    async execute(input, ctx) {
      const agent = getAgent(input.agentType)
      if (!agent) {
        const available = getAllAgents().map((a) => a.name).join(', ')
        return {
          output: `Unknown agent: "${input.agentType}". Available agents: ${available || 'none'}`,
          isError: true,
        }
      }

      // Use the permission handler from the active query loop (threaded via ToolContext)
      const permissionHandler = ctx.onPermissionRequest ?? (async () => true)

      try {
        const result = await runSubagent({
          provider,
          agentDefinition: agent,
          prompt: input.prompt,
          cwd: ctx.cwd,
          signal: ctx.abortSignal,
          onPermissionRequest: permissionHandler,
          maxTurns: 10,
        })
        return { output: result }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { output: 'Agent was cancelled.', isError: true }
        }
        return { output: `Agent error: ${err.message}`, isError: true }
      }
    },
  })
}
