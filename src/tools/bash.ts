import { z } from 'zod'
import { exec } from 'child_process'
import { promisify } from 'util'
import { buildTool } from './registry.js'

const execAsync = promisify(exec)

export const bashTool = buildTool({
  name: 'Bash',
  description: 'Execute a shell command and return its output.',
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default 30000)'),
  }),
  isReadOnly: false,
  isConcurrencySafe: false,
  needsPermission: true,
  async execute(input, ctx) {
    try {
      const { stdout, stderr } = await execAsync(input.command, {
        cwd: ctx.cwd,
        timeout: input.timeout ?? 30000,
        maxBuffer: 1024 * 1024,
        signal: ctx.abortSignal,
      })
      const output = [stdout, stderr].filter(Boolean).join('\n').trim()
      return { output: output || '(no output)' }
    } catch (err: any) {
      if (err.killed) return { output: 'Command timed out.', isError: true }
      const output = [err.stdout, err.stderr].filter(Boolean).join('\n').trim()
      return { output: output || err.message, isError: true }
    }
  },
})
