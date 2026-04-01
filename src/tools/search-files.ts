import { z } from 'zod'
import { resolve } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { buildTool } from './registry.js'

const exec = promisify(execFile)

export const searchFilesTool = buildTool({
  name: 'SearchFiles',
  description: 'Search file contents for a pattern using ripgrep (rg) or grep.',
  inputSchema: z.object({
    pattern: z.string().describe('Regex pattern to search for'),
    path: z.string().optional().describe('Directory to search in'),
    include: z.string().optional().describe('File glob filter (e.g. "*.ts")'),
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  async execute(input, ctx) {
    const cwd = resolve(ctx.cwd, input.path ?? '.')
    try {
      const args = ['-rn', '--max-count=100']
      if (input.include) args.push(`--include=${input.include}`)
      args.push(input.pattern, '.')
      const { stdout } = await exec('grep', args, { cwd, maxBuffer: 1024 * 1024 })
      return { output: stdout.trim() || 'No matches found.' }
    } catch (err: any) {
      if (err.code === 1) return { output: 'No matches found.' }
      return { output: `Error searching: ${err.message}`, isError: true }
    }
  },
})
