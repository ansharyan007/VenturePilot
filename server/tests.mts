import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { invokeAgent, modelFor } from './models.ts'
import { modelHealth } from './health.ts'
import { allowedGovernmentUrl } from './ingestGovernment.ts'
import { VectorStore, cosine } from './vectorStore.ts'
import { governmentChunksFor, makeChunks, requestSchema, runAgents, selectAgents, validateEvidence } from './orchestrator.ts'
import { demoStartup } from '../src/data/demoStartup.ts'
import type { AgentFinding, AgentRole } from '../src/types/agents.ts'
import type { Startup } from '../src/types/index.ts'
import { generateWorkspacePlan } from './workspacePlanner.ts'
import { createStartupDraft } from '../src/data/demoStartup.ts'
import { fillMissingPlan, missingPlanningSections } from '../src/utils/workspacePlanning.ts'
import { planSections, workspacePlanSchema } from '../src/types/workspacePlan.ts'

const make = (id: string, content = 'hardware') => ({ id, content, title: id, kind: 'startup' as const })
const embeddings = async (texts: string[]) => texts.map(text => text.includes('hardware') ? [1, 0] : [0, 1])

test('workspace generation fills all sections, preserves inputs and recovers malformed reviewer output', async () => {
  const store = new VectorStore(':memory:')
  const startup = { ...createStartupDraft({ founderName: 'A', name: 'WatchCo', country: 'India', region: 'Karnataka', founderCount: 1, experience: '', budget: 1000000, idea: 'Import fitness watches', category: 'Wearable', description: 'Student fitness watch', targetCustomer: 'Students', targetMarket: 'Schools', geographicMarket: 'India', sellingPrice: 2400, launchTimeline: '9 months' }), id: 'test', ownerId: 'alice', createdAt: '', updatedAt: '' }
  const calls: AgentRole[] = []
  let reviewerCalls = 0
  try {
    const result = await generateWorkspacePlan(store, 'alice', startup, new AbortController().signal, () => {}, {
      embed: embeddings,
      generatePlanGroup: async (role, sections) => {
        calls.push(role)
        const fixtures = { ...demoStartup, scaling: demoStartup.scaling.map(stage => ({ ...stage, targetUnits: 100, targetBudget: 100000 })) }
        return { ...Object.fromEntries(sections.map(section => [section, planSections[section].parse(structuredClone(fixtures[section]))])), assumptions: ['Test-only draft assumption'], missingInformation: ['Test-only missing quote'] }
      },
      invokeAgent: async role => { calls.push(role); if (++reviewerCalls === 1) throw new SyntaxError('Incomplete model JSON'); return { role, model: 'test-reviewer', summary: 'Test draft review', actions: [], uncertainties: [], evidenceIds: ['venture-scope'] } },
    })
    assert.deepEqual(calls, ['planner', 'product', 'compliance', 'finance', 'scaling', 'reviewer', 'reviewer'])
    workspacePlanSchema.parse(result)
    const filled = { ...startup, ...fillMissingPlan(startup, result) }
    assert.deepEqual(missingPlanningSections(filled), [])
    assert.equal(filled.financials.sellingPrice, 2400)
    assert.equal(filled.financials.initialCapital, 1000000)
    assert.equal(filled.financials.employeeExpenses, filled.team.reduce((sum, role) => sum + role.salary, 0))
    assert.ok(filled.bom.every(item => item.notes.includes('not a supplier quote')))
    assert.ok(filled.compliance.every(item => item.status === 'Not started' && item.applicability === 'Needs review'))
    assert.ok(filled.scaling.every(item => item.gateStatus === 'Not reviewed'))
    assert.equal(startup.bom.length, 0)
    await assert.rejects(generateWorkspacePlan(store, 'mallory', startup, new AbortController().signal, () => {}), /ownership/)
    await assert.rejects(generateWorkspacePlan(store, 'alice', startup, new AbortController().signal, () => {}, {
      embed: embeddings,
      generatePlanGroup: async () => { throw new Error('Model unavailable') },
      invokeAgent,
    }), /Model unavailable/)
    assert.equal(startup.product.mvp, '')
  } finally { store.close() }
})
test('saved BOM and scaling chunks remain complete structured JSON', () => {
  const chunks = makeChunks({ ...demoStartup, ownerId: 'alice' } as Startup).filter(chunk => chunk.id.startsWith('s-bom-') || chunk.id.startsWith('s-scaling-'))
  assert.ok(chunks.length > 2)
  assert.ok(chunks.some(chunk => /Saved BOM · Items?/.test(chunk.title)))
  assert.ok(chunks.some(chunk => /Saved Scaling · Items?/.test(chunk.title)))
  for (const chunk of chunks) {
    assert.doesNotThrow(() => JSON.parse(chunk.content), chunk.title)
    assert.ok(chunk.content.length <= 1200, `${chunk.title} exceeded the structured chunk limit`)
  }
})
test('vector persistence, isolation, incremental indexing and deletion', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'buildmyidea-vector-test-'))
  const path = join(dir, 'test.sqlite')
  let store = new VectorStore(path)
  try {
    assert.equal(await store.sync('alice', 'embed-v1', [make('a')], embeddings), 1)
    assert.equal(await store.sync('alice', 'embed-v1', [make('a')], embeddings), 0)
    await store.sync('bob', 'embed-v1', [make('b')], embeddings)
    store.close(); store = new VectorStore(path)
    assert.deepEqual(store.search(['alice'], 'embed-v1', [1, 0]).map(r => r.id), ['a'])
    assert.deepEqual(store.search(['alice'], 'embed-v2', [1, 0]), [])
    await store.sync('alice', 'embed-v1', [make('new')], embeddings)
    assert.deepEqual(store.search(['alice'], 'embed-v1', [1, 0]).map(r => r.id), ['new'])
    await assert.rejects(store.sync('alice', 'embed-v1', [make('failure')], async () => { throw new Error('provider down') }))
    assert.equal(store.search(['alice'], 'embed-v1', [1, 0])[0].id, 'new')
    store.remove('alice')
    assert.deepEqual(store.search(['alice'], 'embed-v1', [1, 0]), [])
    assert.equal(store.search(['bob'], 'embed-v1', [1, 0]).length, 1)
    assert.equal(cosine([0, 0], [1, 0]), 0)
    assert.equal(store.get('bob', 'embed-v1', 'b')?.content, 'hardware')
    await assert.rejects(store.sync('bob', 'embed-v1', [make('changed')], async () => [[1, 0, 0]]), /dimensions/)
    assert.throws(() => store.search(['bob'], 'embed-v1', [1, 0, 0]), /dimensions/)
  } finally { store.close(); rmSync(dir, { recursive: true }) }
})
test('only needed specialists execute and reviewer receives their findings', async () => {
  const store = new VectorStore(':memory:')
  const calls: AgentRole[] = [], inputs: unknown[] = []
  const invokeAgent = async (role: AgentRole, input: unknown) => { calls.push(role); inputs.push(input); return { role, model: `test-${role}`, summary: 'Test provider result', actions: [], uncertainties: [], evidenceIds: ['tool-calculations'] } }
  try {
    const request = requestSchema.parse({ startup: { ...demoStartup, id: 's', ownerId: 'alice' }, question: 'team payroll budget' })
    const result = await runAgents(store, 'alice', request, new AbortController().signal, () => {}, { embed: embeddings, invokeAgent })
    assert.deepEqual(calls, ['finance', 'team', 'reviewer'])
    assert.equal(result.findings.length, 2)
    assert.equal((inputs[2] as { specialists: AgentFinding[] }).specialists[0].role, 'finance')
    const financeEvidence = (inputs[0] as { evidence: Array<{ id: string; content: string }> }).evidence
    assert.equal(JSON.parse(financeEvidence.find(record => record.id === 'venture-scope')!.content).category, 'Laptop')
    assert.equal('startup' in (inputs[0] as object), false)
    assert.ok(result.evidence.some(item => item.id === 'venture-scope'))
    assert.equal(result.mode, 'multi-agent')
    await assert.rejects(runAgents(store, 'bob', request, new AbortController().signal, () => {}, { embed: embeddings, invokeAgent }), /ownership/)
    assert.deepEqual(selectAgents('hello'), ['planner'])
    assert.deepEqual(selectAgents('Review legal compliance', 'team'), ['team', 'compliance'])
    assert.deepEqual(selectAgents('legal finance scaling team product'), ['compliance', 'finance'])
    assert.throws(() => validateEvidence({ ...result.review, evidenceIds: ['invented'] }, new Set(['tool-calculations'])), /unknown evidence/)
  } finally { store.close() }
})

test('an unsupported model citation is retried with the exact retrieved ID allowlist', async () => {
  const store = new VectorStore(':memory:')
  const calls: Array<{ role: AgentRole; input: unknown }> = []
  const invokeAgent = async (role: AgentRole, input: unknown) => {
    calls.push({ role, input })
    return { role, model: 'test-model', summary: 'Model finding', actions: [], uncertainties: [], evidenceIds: role === 'finance' && calls.length === 1 ? ['invented-finance-id'] : ['tool-calculations'] }
  }
  try {
    const request = requestSchema.parse({ startup: { ...demoStartup, id: 'retry', ownerId: 'alice' }, question: 'Check margin', role: 'finance' })
    const result = await runAgents(store, 'alice', request, new AbortController().signal, () => {}, { embed: embeddings, invokeAgent })
    assert.deepEqual(calls.map(call => call.role), ['finance', 'finance', 'reviewer'])
    assert.ok((calls[1].input as { allowedEvidenceIds: string[] }).allowedEvidenceIds.includes('tool-calculations'))
    assert.match((calls[1].input as { citationCorrection: string }).citationCorrection, /exact allowed IDs/)
    assert.deepEqual(result.findings[0].evidenceIds, ['tool-calculations'])
  } finally { store.close() }
})

test('a repeated unsupported citation withholds that specialist answer and lets review continue', async () => {
  const store = new VectorStore(':memory:')
  let financeCalls = 0
  const invokeAgent = async (role: AgentRole) => {
    if (role === 'finance') financeCalls++
    return { role, model: 'test-model', summary: 'Unsupported claim', actions: role === 'finance' ? [{ title: 'Act', module: 'finance' as const, reason: 'Unsupported', evidenceIds: ['invented'], priority: 'high' as const }] : [], uncertainties: [], evidenceIds: role === 'finance' ? ['invented'] : ['tool-calculations'] }
  }
  try {
    const request = requestSchema.parse({ startup: { ...demoStartup, id: 'withhold', ownerId: 'alice' }, question: 'Check margin', role: 'finance' })
    const result = await runAgents(store, 'alice', request, new AbortController().signal, () => {}, { embed: embeddings, invokeAgent })
    assert.equal(financeCalls, 2)
    assert.match(result.findings[0].summary, /withheld/)
    assert.deepEqual(result.findings[0].actions, [])
    assert.equal(result.review.role, 'reviewer')
  } finally { store.close() }
})

test('government RAG excludes laptop and radio evidence outside venture scope', () => {
  const semiconductor = { ...demoStartup, id: 'chip', ownerId: 'owner', category: 'Semiconductor', idea: 'Fabricate low-power industrial sensor ICs', description: '', product: { mvp: '', futureProducts: '', technicalRequirements: '', differentiators: '', specs: [] } } as Startup
  const ids = governmentChunksFor(semiconductor).map(chunk => chunk.id)
  assert.equal(ids.some(id => id.startsWith('g-bis-crs-electronics')), false)
  assert.equal(ids.some(id => id.startsWith('g-dot-wpc-eta')), false)
  assert.equal(governmentChunksFor({ ...demoStartup, id: 'demo', ownerId: 'owner' } as Startup).some(chunk => chunk.id.startsWith('g-bis-crs-electronics')), true)
})

test('government ingestion allows only configured official HTTPS hosts', () => {
  assert.equal(allowedGovernmentUrl('https://www.bis.gov.in/reference'), true)
  assert.equal(allowedGovernmentUrl('http://www.bis.gov.in/reference'), false)
  assert.equal(allowedGovernmentUrl('https://www.bis.gov.in.evil.example/reference'), false)
  assert.equal(allowedGovernmentUrl('https://user:secret@www.bis.gov.in/reference'), false)
  assert.equal(allowedGovernmentUrl('https://127.0.0.1/private'), false)
})
test('invalid financial payloads are rejected before indexing', () => {
  const startup = { ...demoStartup, id: 's', ownerId: 'a', financials: { ...demoStartup.financials, sellingPrice: -10 } }
  assert.equal(requestSchema.safeParse({ question: 'cost', startup }).success, false)
})

test('Ollama HTTP adapter uses independent contexts and rejects malformed model JSON', async () => {
  const requests: Array<{ messages: { role: string; content: string }[]; model: string; think: boolean; format: { type: string; properties: { actions: { items: { properties: { module: { enum: string[] } } } } } } }> = []
  let valid = true
  const provider = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk.toString()
    requests.push(JSON.parse(body))
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ message: { content: valid ? JSON.stringify({ summary: 'Grounded finding', actions: [], uncertainties: [], evidenceIds: [] }) : '{"summary": 123}' } }))
  })
  await new Promise<void>(resolve => provider.listen(0, '127.0.0.1', resolve))
  const previous = process.env.OLLAMA_URL
  process.env.OLLAMA_URL = `http://127.0.0.1:${(provider.address() as { port: number }).port}`
  try {
    await invokeAgent('team', { question: 'Hire a lead' }, new AbortController().signal)
    await invokeAgent('reviewer', { specialists: ['team output'] }, new AbortController().signal)
    assert.match(requests[0].messages[0].content, /team specialist/)
    assert.match(requests[1].messages[0].content, /reviewer specialist/)
    assert.equal(requests[0].messages.length, 2)
    assert.equal(requests[0].model, 'qwen3:8b')
    assert.equal(requests[0].think, false)
    assert.equal(requests[0].format.type, 'object')
    assert.ok(requests[0].format.properties.actions.items.properties.module.enum.includes('manufacturing'))
    assert.ok(!requests[0].format.properties.actions.items.properties.module.enum.includes('capacity'))
    valid = false
    await assert.rejects(invokeAgent('finance', {}, new AbortController().signal))
    const abort = new AbortController(); abort.abort()
    await assert.rejects(invokeAgent('team', {}, abort.signal))
  } finally {
    if (previous === undefined) delete process.env.OLLAMA_URL; else process.env.OLLAMA_URL = previous
    await new Promise<void>(resolve => provider.close(() => resolve()))
  }
})

test('model health reports missing generation and embedding models', async () => {
  const names = ['qwen3:8b']
  const provider = createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ models: names.map(name => ({ name })) })) })
  await new Promise<void>(resolve => provider.listen(0, '127.0.0.1', resolve))
  const previous = process.env.OLLAMA_URL
  process.env.OLLAMA_URL = `http://127.0.0.1:${(provider.address() as { port: number }).port}`
  try {
    assert.equal(modelFor('reviewer'), 'qwen3:8b')
    const health = await modelHealth()
    assert.equal(health.available, false)
    assert.equal(health.embeddingInstalled, false)
    assert.match(health.error || '', /nomic-embed-text/)
    names.push('nomic-embed-text:latest')
    assert.equal((await modelHealth()).available, true)
  } finally {
    if (previous === undefined) delete process.env.OLLAMA_URL; else process.env.OLLAMA_URL = previous
    await new Promise<void>(resolve => provider.close(() => resolve()))
  }
})
