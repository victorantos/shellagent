import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { buildTool } from './registry.js'

export const writeFileTool = buildTool({
  name: 'WriteFile',
  description: 'Write content to a file. Creates parent directories if needed.',
  inputSchema: z.object({
    file_path: z.string().describe('Path to the file to write'),
    content: z.string().describe('Content to write'),
  }),
  isReadOnly: false,
  isConcurrencySafe: false,
  needsPermission: true,
  async execute(input, ctx) {
    const filePath = resolve(ctx.cwd, input.file_path)
    try {
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, input.content, 'utf-8')
      return { output: `Wrote ${input.content.length} bytes to ${filePath}` }
    } catch (err: any) {
      return { output: `Error writing file: ${err.message}`, isError: true }
    }
  },
})
