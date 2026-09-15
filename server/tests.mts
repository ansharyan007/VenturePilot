import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { invokeAgent } from './models.ts'
import { allowedGovernmentUrl } from './ingestGovernment.ts'
import { VectorStore, cosine } from './vectorStore.ts'
import { governmentChunksFor, requestSchema, runAgents, selectAgents, validateEvidence } from './orchestrator.ts'
import { demoStartup } from '../src/data/demoStartup.ts'
import type { AgentFinding, AgentRole } from '../src/types/agents.ts'
import type { Startup } from '../src/types/index.ts'

const make = (id: string, content = 'hardware') => ({ id, content, title: id, kind: 'startup' as const })
const embeddings = async (texts: string[]) => texts.map(text => text.includes('hardware') ? [1, 0] : [0, 1])
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
    assert.equal((inputs[0] as { ventureScope: { category: string } }).ventureScope.category, 'Laptop')
    assert.ok(result.evidence.some(item => item.id === 'venture-scope'))
    assert.equal(result.mode, 'multi-agent')
    await assert.rejects(runAgents(store, 'bob', request, new AbortController().signal, () => {}, { embed: embeddings, invokeAgent }), /ownership/)
    assert.deepEqual(selectAgents('hello'), ['planner'])
    assert.deepEqual(selectAgents('Review legal compliance', 'team'), ['team', 'compliance'])
    assert.deepEqual(selectAgents('legal finance scaling team product'), ['compliance', 'finance'])
    assert.throws(() => validateEvidence({ ...result.review, evidenceIds: ['invented'] }, new Set(['tool-calculations'])), /unknown evidence/)
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
  const requests: Array<{ messages: { role: string; content: string }[]; model: string }> = []
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
    valid = false
    await assert.rejects(invokeAgent('finance', {}, new AbortController().signal))
    const abort = new AbortController(); abort.abort()
    await assert.rejects(invokeAgent('team', {}, abort.signal))
  } finally {
    if (previous === undefined) delete process.env.OLLAMA_URL; else process.env.OLLAMA_URL = previous
    await new Promise<void>(resolve => provider.close(() => resolve()))
  }
})
