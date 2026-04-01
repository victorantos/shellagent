#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { App } from './ui/App.js'
import { parseArgs } from './cli.js'
import { loadConfig } from './config.js'

const args = parseArgs()
const config = loadConfig({ cwd: args.cwd, maxTurns: args.maxTurns })

render(<App provider={config.provider} cwd={config.cwd} />)
