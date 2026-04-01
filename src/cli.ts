import { Command } from 'commander'

const program = new Command()

program
  .name('shellagent')
  .description('ShellAgent — open-source interactive terminal. Bring your own API.')
  .version('0.1.0')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .option('--max-turns <number>', 'Maximum agentic turns per query', '10')

export function parseArgs(): { cwd: string; maxTurns: number } {
  program.parse()
  const opts = program.opts()
  return {
    cwd: opts.cwd,
    maxTurns: parseInt(opts.maxTurns, 10),
  }
}
