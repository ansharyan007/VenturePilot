import { embeddingModel, modelFor, roles } from './models'
import type { AgentRole } from '../src/types/agents'
export async function modelHealth() {
  const response = await fetch(`${process.env.OLLAMA_URL || 'http://127.0.0.1:11434'}/api/tags`, { signal: AbortSignal.timeout(4000) })
  if (!response.ok) throw new Error('Ollama is unavailable')
  const tags = await response.json() as { models: { name: string }[] }
  const installed = new Set(tags.models.map(m => m.name.replace(/:latest$/, '')))
  const models = Object.keys(roles).map(role => ({ role, model: modelFor(role as AgentRole), installed: installed.has(modelFor(role as AgentRole).replace(/:latest$/, '')) }))
  const embedding = embeddingModel()
  const embeddingInstalled = installed.has(embedding.replace(/:latest$/, ''))
  const missing = [...new Set([...models.filter(m => !m.installed).map(m => m.model), ...(!embeddingInstalled ? [embedding] : [])])]
  return { available: missing.length === 0, models, embedding, embeddingInstalled, ...(missing.length ? { error: `Models missing: ${missing.join(', ')}. Run npm run setup:models or pull them with ollama pull.` } : {}) }
}
export async function requireModels(selected: AgentRole[]) {
  let health: Awaited<ReturnType<typeof modelHealth>>
  try { health = await modelHealth() } catch { throw new Error('Ollama is not running or could not be reached. Start Ollama, then run npm run setup:models; see README for setup.') }
  const missing = health.models.filter(m => [...selected, 'reviewer'].includes(m.role as AgentRole) && !m.installed).map(m => m.model)
  if (!health.embeddingInstalled) missing.push(health.embedding)
  if (missing.length) throw new Error(`Models missing: ${[...new Set(missing)].join(', ')}. Run npm run setup:models before submitting a run.`)
}
