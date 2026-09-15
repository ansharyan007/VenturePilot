import { spawn } from 'node:child_process'
const children = [
  spawn(process.execPath, ['--env-file-if-exists=server/.env', '--import', 'tsx', 'server/index.ts'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
]
let stopping = false
const stop = (code = 0) => { if (stopping) return; stopping = true; children.forEach(child => child.kill()); process.exitCode = code }
children.forEach(child => { child.on('error', () => stop(1)); child.on('exit', code => stop(code || 0)) })
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
