#!/usr/bin/env node
// Unsets ELECTRON_RUN_AS_NODE before spawning Electron so VS Code's terminal
// doesn't cause Electron to boot in plain Node.js mode.
const { spawnSync } = require('child_process')
const electronPath = require('electron')

delete process.env.ELECTRON_RUN_AS_NODE

const result = spawnSync(electronPath, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
})
process.exit(result.status ?? 0)
