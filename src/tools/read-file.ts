import { z } from 'zod'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { buildTool } from './registry.js'

export const readFileTool = buildTool({
  name: 'ReadFile',
  description: 'Read a file from the filesystem. Returns contents with line numbers.',
  inputSchema: z.object({
    file_path: z.string().describe('Absolute or relative path to the file'),
    offset: z.number().optional().describe('Line number to start reading from (1-based)'),
    limit: z.number().optional().describe('Maximum number of lines to read'),
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  async execute(input, ctx) {
    const filePath = resolve(ctx.cwd, input.file_path)
    try {
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      const start = (input.offset ?? 1) - 1
      const end = input.limit ? start + input.limit : lines.length
      const slice = lines.slice(start, end)
      const numbered = slice.map((line, i) => `${String(start + i + 1).padStart(4)}  ${line}`)
      return { output: numbered.join('\n') }
    } catch (err: any) {
      return { output: `Error reading file: ${err.message}`, isError: true }
    }
  },
})
