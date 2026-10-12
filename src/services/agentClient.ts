import { z } from 'zod'
import { collection, doc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { Startup } from '../types'
import type { AgentProgress, AgentRole, AgentRun } from '../types/agents'
import { workspacePlanSchema } from '../types/workspacePlan'
import type { StartupUpdate } from '../types'

const role = z.enum(['planner', 'product', 'finance', 'compliance', 'team', 'scaling', 'reviewer'])
const finding = z.object({ role, model: z.string(), summary: z.string(), actions: z.array(z.object({ title: z.string(), module: z.string(), reason: z.string(), evidenceIds: z.array(z.string()), priority: z.enum(['high', 'medium', 'low']).optional() })), uncertainties: z.array(z.string()), evidenceIds: z.array(z.string()) })
const runSchema = z.object({ id: z.string(), question: z.string(), createdAt: z.string(), mode: z.literal('multi-agent'), durationMs: z.number(), findings: z.array(finding), review: finding, evidence: z.array(z.object({ id: z.string(), title: z.string(), content: z.string(), kind: z.enum(['startup', 'government']), sourceUrl: z.string().optional(), score: z.number() })) })
const progressSchema = z.object({ stage: z.string(), state: z.enum(['running', 'complete']), detail: z.string(), elapsedMs: z.number() })

export async function authHeaders(forceRefresh = false) {
  if (!auth.currentUser) throw new Error('Sign in to run agents.')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${await auth.currentUser.getIdToken(forceRefresh)}` }
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const send = async (forceRefresh: boolean) => {
    const headers = new Headers(init.headers)
    const authentication = await authHeaders(forceRefresh)
    headers.set('Content-Type', authentication['Content-Type'])
    headers.set('Authorization', authentication.Authorization)
    return fetch(input, { ...init, headers })
  }

  let response = await send(false)
  if (response.status === 401) {
    await response.body?.cancel().catch(() => {})
    try {
      response = await send(true)
    } catch {
      throw new Error('Your Firebase session could not be refreshed. Sign out and sign in again.')
    }
  }
  return response
}
async function readValidatedStream<T>(response: Response, onProgress: (p: AgentProgress) => void, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Agent API unavailable (${response.status}). Run npm run dev:full and check model setup.`)
  }
  if (!response.body) throw new Error('Missing agent response stream')
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let buffer = '', result: T | undefined
  const consume = (line: string) => {
    if (!line.trim()) return
    const event = JSON.parse(line)
    if (event.type === 'error') throw new Error(event.data.error)
    if (event.type === 'progress') onProgress(progressSchema.parse(event.data))
    if (event.type === 'result') result = schema.parse(event.data)
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      if (buffer.length > 200000) throw new Error('Agent result exceeded the display limit.')
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) { consume(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1) }
    }
    buffer += decoder.decode(); consume(buffer)
    if (!result) throw new Error('The agent run ended before a result arrived. Your startup data was not changed.')
    return result
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}
export const readAgentStream = (response: Response, onProgress: (p: AgentProgress) => void): Promise<AgentRun> => readValidatedStream(response, onProgress, runSchema)
export async function requestWorkspacePlan(startup: Startup, signal: AbortSignal, progress: (p: AgentProgress) => void): Promise<StartupUpdate> {
  const response = await authenticatedFetch('/api/workspace/plan', { method: 'POST', body: JSON.stringify({ startup }), signal })
  return await readValidatedStream(response, progress, workspacePlanSchema) as StartupUpdate
}
export async function requestAgentRun(startup: Startup, question: string, selected: AgentRole | undefined, signal: AbortSignal, progress: (p: AgentProgress) => void, previous?: AgentRun | null) {
  const response = await authenticatedFetch('/api/agents/run', { method: 'POST', body: JSON.stringify({ startup, question, ...(selected ? { role: selected } : {}), ...(previous ? { previous: { question: previous.question.slice(0, 1000), summary: previous.review.summary.slice(0, 1500) } } : {}) }), signal })
  return readAgentStream(response, progress)
}
export const persistAgentRun = (startup: Startup, run: AgentRun) => setDoc(doc(db, 'users', startup.ownerId, 'startups', startup.id, 'agentRuns', run.id), run)
export async function recentAgentRuns(startup: Startup) {
  const results = await getDocs(query(collection(db, 'users', startup.ownerId, 'startups', startup.id, 'agentRuns'), orderBy('createdAt', 'desc'), limit(20)))
  return results.docs.flatMap(doc => { const parsed = runSchema.safeParse(doc.data()); return parsed.success && !parsed.data.id.startsWith('local-') && ![...parsed.data.findings, parsed.data.review].some(finding => finding.model.startsWith('local-demo-')) ? [parsed.data] : [] }).slice(0, 5)
}
