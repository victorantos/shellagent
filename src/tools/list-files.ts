import { z } from 'zod'
import { glob } from 'glob'
import { resolve } from 'path'
import { buildTool } from './registry.js'

export const listFilesTool = buildTool({
  name: 'ListFiles',
  description: 'List files matching a glob pattern.',
  inputSchema: z.object({
    pattern: z.string().describe('Glob pattern to match (e.g. "**/*.ts")'),
    path: z.string().optional().describe('Directory to search in'),
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  async execute(input, ctx) {
    const cwd = resolve(ctx.cwd, input.path ?? '.')
    try {
      const files = await glob(input.pattern, { cwd, nodir: true, maxDepth: 10 })
      if (files.length === 0) return { output: 'No files found.' }
      const limited = files.slice(0, 100)
      const result = limited.join('\n')
      const suffix = files.length > 100 ? `\n... and ${files.length - 100} more` : ''
      return { output: result + suffix }
    } catch (err: any) {
      return { output: `Error listing files: ${err.message}`, isError: true }
    }
  },
})
