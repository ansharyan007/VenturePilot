import { existsSync, mkdirSync, openSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { modelFor, embeddingModel, roles } from './models'
import type { AgentRole } from '../src/types/agents'
const base = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const reachable = async () => { try { return (await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(1500) })).ok } catch { return false } }
if (!await reachable()) {
  const executable = resolve('server/.runtime/ollama.exe')
  if (!existsSync(executable)) throw new Error('Ollama is unavailable. Install Ollama, or run scripts/setup-ollama.ps1 to download the verified portable runtime, then retry.')
  const directory = resolve('server/data'); mkdirSync(directory, { recursive: true })
  const log = openSync(resolve(directory, 'ollama.log'), 'a')
  const child = spawn(executable, ['serve'], { windowsHide: true, detached: true, stdio: ['ignore', log, log], env: { ...process.env, OLLAMA_HOST: '127.0.0.1:11434', OLLAMA_MODELS: resolve(directory, 'models'), OLLAMA_MAX_LOADED_MODELS: '1', OLLAMA_NUM_PARALLEL: '1' } })
  child.on('error', error => console.error(`Ollama startup failed: ${error.message}`))
  child.unref()
  for (let i = 0; i < 15 && !await reachable(); i++) await new Promise(resolve => setTimeout(resolve, 1000))
  if (!await reachable()) throw new Error('Ollama failed to start. Inspect server/data/ollama.log.')
}
const models = new Set([embeddingModel(), ...Object.keys(roles).map(role => modelFor(role as AgentRole))])
for (const model of models) {
  console.log(`Installing/verifying ${model}…`)
  const response = await fetch(`${base}/api/pull`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: false }), signal: AbortSignal.timeout(1800000) })
  const result = await response.json() as { status?: string; error?: string }
  if (!response.ok || result.error || result.status !== 'success') throw new Error(result.error || `Could not pull ${model}`)
  console.log(`${model}: ready`)
}
console.log('All configured models are installed. Start npm run dev:full and sign in to run agents.')
