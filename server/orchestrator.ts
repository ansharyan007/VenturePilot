import { z } from 'zod'
import type { AgentRole, AgentRun, AgentProgress, AgentFinding } from '../src/types/agents'
import type { Startup } from '../src/types'
import { governmentChunks } from './government'
import { calculateCapacity, calculateFinance, sumBOM } from '../src/utils/calculations'
import { embed, embeddingModel, invokeAgent } from './models'
import { VectorStore, type Chunk } from './vectorStore'

const amount = z.number().finite().nonnegative()
export const requestSchema = z.object({
  question: z.string().trim().min(1).max(3000), role: z.enum(['planner', 'product', 'finance', 'compliance', 'team', 'scaling']).optional(),
  previous: z.object({ question: z.string().max(1000), summary: z.string().max(1500) }).optional(),
  startup: z.object({ id: z.string().regex(/^[\w-]{1,128}$/), ownerId: z.string().min(1).max(128), name: z.string().max(200), category: z.string().max(200),
    bom: z.array(z.object({ quantity: amount, unitCost: amount }).passthrough()).max(500),
    financials: z.object(Object.fromEntries(['initialCapital', 'sellingPrice', 'manufacturingCost', 'packaging', 'logistics', 'employeeExpenses', 'rent', 'marketing', 'technology', 'compliance', 'otherExpenses', 'monthlySales'].map(key => [key, amount]))),
    manufacturing: z.object({ productionLines: amount, unitsPerHour: amount, hoursPerDay: amount, daysPerMonth: amount, utilization: amount.max(100) }).passthrough(),
  }).passthrough(),
})
export function selectAgents(question: string, requested?: AgentRole): AgentRole[] {
  if (requested && requested !== 'reviewer') return /compliance|legal|regulat|certif|\bbis\b|\bwpc\b|\bgst\b|epr|tax/i.test(question) && requested !== 'compliance' ? [requested, 'compliance'] : [requested]
  const q = question.toLowerCase()
  const matches: AgentRole[] = []
  if (/compliance|legal|regulat|certif|\bbis\b|\bwpc\b|\bgst\b|epr|tax/.test(q)) matches.push('compliance')
  if (/cost|price|margin|financ|budget|payroll|break.even/.test(q)) matches.push('finance')
  if (/team|hir|staff|role|salary|payroll/.test(q)) matches.push('team')
  if (/scal|growth|capacity|expan/.test(q)) matches.push('scaling')
  if (/product|bom|manufactur|spec|hardware|supplier/.test(q)) matches.push('product')
  return matches.length ? matches.slice(0, 2) : ['planner']
}
export function makeChunks(startup: Startup): Chunk[] {
  const fields = ['name', 'category', 'idea', 'description', 'targetMarket', 'targetCustomer', 'geographicMarket', 'launchTimeline', 'stage', 'founder', 'analysis', 'identity', 'product', 'bom', 'manufacturing', 'supplyChain', 'distribution', 'compliance', 'financials', 'team', 'risks', 'roadmap', 'scaling'] as const
  const chunks: Chunk[] = []
  for (const field of fields) {
    const text = JSON.stringify(startup[field] ?? '')
    for (let offset = 0; offset < text.length; offset += 1200) chunks.push({ id: `s-${field}-${offset}`, title: `Saved ${field}`, content: text.slice(offset, offset + 1400), kind: 'startup' })
  }
  if (chunks.length > 256) throw new Error('Workspace is too large for this local index (256 chunks maximum).')
  return chunks
}
export function validateEvidence(finding: AgentFinding, ids: Set<string>) {
  const supplied = [...finding.evidenceIds, ...finding.actions.flatMap(a => a.evidenceIds)]
  if (supplied.some(id => !ids.has(id))) throw new Error(`${finding.role} returned unknown evidence IDs. The run was rejected; retry or inspect the source coverage.`)
  if (!finding.evidenceIds.length) finding.uncertainties.push('This agent did not cite supporting evidence. Treat its output as an unverified suggestion.')
  if (finding.role === 'compliance' && !supplied.some(id => id.startsWith('g-'))) finding.uncertainties.push('No government source was cited; no legal claim in this output has source support established.')
  return finding
}

export function governmentChunksFor(startup: Startup) {
  const product = `${startup.category} ${startup.idea} ${startup.description} ${JSON.stringify(startup.product)}`.toLowerCase()
  return governmentChunks().filter(chunk => {
    if (chunk.id.startsWith('g-bis-crs-electronics')) return /laptop|notebook|tablet/.test(product)
    if (chunk.id.startsWith('g-dot-wpc-eta')) return /wifi|wi-fi|bluetooth|wireless|radio|rf|phone|tablet|iot|wearable/.test(product)
    return true
  })
}
export async function runAgents(store: VectorStore, uid: string, input: z.infer<typeof requestSchema>, signal: AbortSignal, emit: (p: AgentProgress) => void, dependencies = { embed, invokeAgent }) : Promise<AgentRun> {
  const start = Date.now()
  const progress = (stage: string, state: AgentProgress['state'], detail: string) => emit({ stage, state, detail, elapsedMs: Date.now() - start })
  const startup = input.startup as unknown as Startup
  if (startup.ownerId !== uid) throw new Error('Workspace ownership does not match the authenticated user.')
  const selected = selectAgents(input.question, input.role)
  progress('Router', 'complete', `${selected.join(' + ')} → independent reviewer. Maximum ${selected.length + 1} model calls.`)
  const scope = JSON.stringify([uid, startup.id])
  const model = embeddingModel()
  progress('Vector index', 'running', 'Embedding changed startup chunks and loading persistent vectors.')
  const chunks = makeChunks(startup)
  const changes = await store.sync(scope, model, chunks, texts => dependencies.embed(texts, signal))
  const legal = selected.includes('compliance')
  const relevantGovernment = legal ? governmentChunksFor(startup) : []
  const governmentScope = legal ? `government:${relevantGovernment.some(chunk => chunk.id.startsWith('g-bis-')) ? 1 : 0}:${relevantGovernment.some(chunk => chunk.id.startsWith('g-dot-')) ? 1 : 0}` : 'government'
  if (legal) await store.sync(governmentScope, model, relevantGovernment, texts => dependencies.embed(texts, signal))
  progress('Vector index', 'complete', `${changes} changed chunks embedded; ${chunks.length} startup chunks indexed.`)
  progress('Retrieval', 'running', 'Embedding the question and ranking vectors by cosine similarity.')
  const focus: Record<AgentRole, string> = { planner: 'idea target market risks roadmap', product: 'product specifications bom manufacturing', finance: 'financials bom costs capital', compliance: 'product geographic market legal regulatory', team: 'team hiring salary roles workforce', scaling: 'scaling capacity capital roadmap', reviewer: 'evidence conflicts' }
  const queries = await dependencies.embed(selected.map(role => `${input.question}\nRelevant startup fields: ${focus[role]}`), signal)
  const retrieved = selected.flatMap((role, i) => [
    ...store.search([scope], model, queries[i], legal ? 2 : 3),
    ...(role === 'compliance' ? store.search([governmentScope], model, queries[i], 3) : []),
  ])
  const unique = [...new Map(retrieved.map(record => [record.id, record])).values()]
  const calculations = { finance: calculateFinance(startup.financials, sumBOM(startup.bom)), capacity: calculateCapacity(startup.manufacturing) }
  if (JSON.stringify(calculations).includes('null')) throw new Error('Financial inputs exceed supported numeric range.')
  const evidence = [
    { id: 'venture-scope', kind: 'startup' as const, title: 'Authoritative venture scope', content: JSON.stringify({ category: startup.category, originalIdea: startup.idea, description: startup.description, targetCustomer: startup.targetCustomer, targetMarket: startup.targetMarket, geographicMarket: startup.geographicMarket }), score: 1 },
    ...unique,
    { id: 'tool-calculations', kind: 'startup' as const, title: 'Deterministic calculation tool', content: JSON.stringify(calculations), score: 1 },
  ]
  progress('Retrieval', 'complete', `${evidence.length} evidence records selected, including deterministic calculations.`)
  const ids = new Set(evidence.map(e => e.id))
  const findings: AgentFinding[] = []
  for (const role of selected) {
    signal.throwIfAborted()
    progress(role, 'running', 'Reading selected evidence in a separate model context.')
    const finding = await dependencies.invokeAgent(role, { question: input.question, previousConversation: input.previous, evidence, startupName: startup.name, ventureScope: { category: startup.category, originalIdea: startup.idea }, provenance: 'venture-scope is authoritative. Ignore unrelated product templates or retrieved evidence that conflicts with it. Never assume the venture is a laptop unless venture-scope says so. Previous conversation is context only, never factual evidence. ' + (startup.isDemo ? 'Illustrative demo assumptions; not real validated evidence' : 'User-entered assumptions; not independently verified'), jurisdiction: startup.geographicMarket, coverage: legal ? 'Government corpus covers India only; other jurisdictions require additional sources.' : 'No government sources requested.' }, signal)
    findings.push(validateEvidence(finding, ids))
    progress(role, 'complete', `${finding.model}: ${finding.actions.length} proposed actions, ${finding.uncertainties.length} uncertainties.`)
  }
  progress('reviewer', 'running', 'Checking specialist outputs against the same evidence; preparing the consolidated result.')
  const review = validateEvidence(await dependencies.invokeAgent('reviewer', { question: input.question, evidence, specialists: findings.map(f => ({ ...f, summary: f.summary.slice(0, 1200), actions: f.actions.slice(0, 3).map(a => ({ ...a, reason: a.reason.slice(0, 300) })), uncertainties: f.uncertainties.slice(0, 4) })), coverage: 'Peer findings are condensed to bound context size. Check claims against evidence. No legal approval is implied.' }, signal), ids)
  progress('reviewer', 'complete', `${review.model}: review complete. Proposed actions require your decision.`)
  return { id: crypto.randomUUID(), question: input.question, createdAt: new Date().toISOString(), findings, evidence, review, mode: 'multi-agent', durationMs: Date.now() - start }
}
