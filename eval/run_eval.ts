/**
 * Frozen BuildMyIdea evaluation runner.
 *
 * RAG's document embeddings are built once before any timed run and excluded
 * from latency. Each RAG timer starts before its question embedding; full-mode
 * timing includes index/sync, retrieval, specialists, reviewer, and guardrails.
 */
import { mkdir, open, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { demoStartup } from '../src/data/demoStartup.ts'
import { makeChunks, runAgents } from '../server/orchestrator.ts'
import { VectorStore, cosine } from '../server/vectorStore.ts'
import { score, separateThinking } from './predicates.mjs'

type Predicate = { type: string; pattern?: string; patterns?: string[] }
type Question = { id: string; text: string; predicates: Predicate[]; gold_evidence_ids: string[] }
type Job = { set: string; question: Question; mode: 'direct' | 'rag' | 'full'; repeat: number }
type Versions = { ollama_version: string | null; model_version: string | null; embedding_model_version: string | null }
const args = process.argv.slice(2)
const has = (name: string) => args.includes(name)
const option = (name: string, fallback: string) => has(name) ? args[args.indexOf(name) + 1] || fallback : fallback
const selectedSet = option('--set', 'all')
const sample = has('--sample') ? Number(option('--sample', '2')) : null
const repeats = sample === null ? Number(option('--repeats', '3')) : 1
const seed = Number(option('--seed', '20261014'))
const resume = has('--resume')
if (!Number.isInteger(repeats) || repeats < 1) throw new Error('--repeats must be a positive integer')
if (sample !== null && (!Number.isInteger(sample) || sample < 1)) throw new Error('--sample must be a positive integer')
if (!Number.isInteger(seed)) throw new Error('--seed must be an integer')
const base = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const model = 'qwen3:8b'
const embeddingModel = 'nomic-embed-text'
const settings = { temperature: 0.15, num_predict: 1800, num_ctx: 8192 }
const output = resolve('eval/results/raw.jsonl')
const keyOf = (job: Job) => `${job.set}|${job.question.id}|${job.mode}|${job.repeat}`

const readQuestions = async (name: string) => JSON.parse(await readFile(resolve(`eval/questions.${name}.json`), 'utf8')) as Question[]
const sets = ['dev', 'heldout'].filter(name => selectedSet === 'all' || selectedSet === name)
if (!sets.length) throw new Error('--set must be dev, heldout, or all')
const all = (await Promise.all(sets.map(async set => (await readQuestions(set)).map(question => ({ set, question }))))).flat()
function shuffled<T>(items: T[], value = seed) {
  const result = [...items]; let state = value >>> 0
  const random = () => (state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
  return result
}
async function request(path: string, body?: unknown) {
  const response = await fetch(`${base}${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`)
  return response.json() as Promise<any>
}
async function complete(prompt: string) {
  const value = await request('/api/chat', { model, stream: false, think: false, options: settings, messages: [{ role: 'user', content: prompt }] })
  return separateThinking(value.message?.content || '', value.message?.thinking || '')
}
async function embed(texts: string[]) {
  const value = await request('/api/embed', { model: embeddingModel, input: texts, truncate: false, keep_alive: '2m' })
  return value.embeddings as number[][]
}
async function versions(): Promise<Versions> {
  const [version, tags] = await Promise.all([request('/api/version'), request('/api/tags')])
  const detail = (name: string) => tags.models?.find((item: any) => item.name === name || item.model === name)
  const label = (item: any) => item ? [item.name || item.model, item.digest, item.details?.parameter_size, item.details?.quantization_level].filter(Boolean).join(' ') : null
  return { ollama_version: version.version || null, model_version: label(detail(model)), embedding_model_version: label(detail(embeddingModel)) }
}
async function append(record: unknown) {
  const file = await open(output, 'a')
  try { await file.writeFile(`${JSON.stringify(record)}\n`); await file.sync() } finally { await file.close() }
}
async function completedKeys() {
  if (!resume) return new Set<string>()
  try {
    const existing = await readFile(output, 'utf8')
    return new Set(existing.split('\n').filter(Boolean).flatMap(line => { try { const row = JSON.parse(line); return typeof row.key === 'string' ? [row.key] : [] } catch { return [] } }))
  } catch (error: any) { if (error?.code === 'ENOENT') return new Set<string>(); throw error }
}
const startup = { ...demoStartup, id: 'novaedge-eval', ownerId: 'evaluation' } as any
const chunks = makeChunks(startup)
const workspace = JSON.stringify(startup)
async function direct(question: string) {
  const result = await complete(`Answer the question using this NovaEdge workspace. State missing facts plainly.\nQuestion: ${question}\nWorkspace:\n${workspace}`)
  return { ...result, evidence_ids: [] as string[] }
}
async function full(question: string, index: number) {
  const database = resolve(`/private/tmp/buildmyidea-eval-${process.pid}-${index}.sqlite`)
  const store = new VectorStore(database)
  try {
    const result = await runAgents(store, 'evaluation', { startup, question }, new AbortController().signal, () => {})
    // The reviewer summary is the pipeline's final consolidated answer.
    return { ...separateThinking(result.review.summary), evidence_ids: result.evidence.map(record => record.id) }
  } finally { store.close(); await rm(database, { force: true }); await rm(`${database}-wal`, { force: true }); await rm(`${database}-shm`, { force: true }) }
}
await mkdir(resolve('eval/results'), { recursive: true })
const versionInfo = await versions()
// Allowed one-time setup; intentionally excluded from every RAG latency.
const vectors = await embed(chunks.map(chunk => `${chunk.title}\n${chunk.content}`))
async function rag(question: string) {
  const query = (await embed([question]))[0]
  const retrieved = chunks.map((chunk, index) => ({ chunk, score: cosine(query, vectors[index]) })).sort((a, b) => b.score - a.score).slice(0, 5).map(item => item.chunk)
  const result = await complete(`Answer only from these NovaEdge records. State missing facts plainly.\nQuestion: ${question}\nEvidence:\n${retrieved.map(record => `[${record.id}] ${record.content}`).join('\n')}`)
  return { ...result, evidence_ids: retrieved.map(record => record.id) }
}
const selected = sample === null ? all : shuffled(all).slice(0, sample)
if (sample !== null && selected.length !== sample) throw new Error(`--sample ${sample} exceeds the ${all.length} selected questions`)
const jobs = shuffled(selected.flatMap(({ set, question }) => (['direct', 'rag', 'full'] as const).flatMap(mode => Array.from({ length: repeats }, (_, repeat) => ({ set, question, mode, repeat: repeat + 1 })))))
const done = await completedKeys()
const pending = jobs.filter(job => !done.has(keyOf(job)))
console.log(`seed=${seed}; jobs=${jobs.length}; skipped=${jobs.length - pending.length}; running=${pending.length}; RAG document-index build excluded`)
let elapsedMs = 0
for (const [index, job] of pending.entries()) {
  const started = performance.now(); const key = keyOf(job)
  try {
    const result = job.mode === 'direct' ? await direct(job.question.text) : job.mode === 'rag' ? await rag(job.question.text) : await full(job.question.text, index)
    const latency_ms = Math.round(performance.now() - started); const scoring = score(result.answer, job.question.predicates)
    await append({ key, set: job.set, question_id: job.question.id, mode: job.mode, repeat: job.repeat, seed, model, embedding_model: embeddingModel, ...versionInfo, answer: result.answer, thinking: result.thinking, thinking_chars: result.thinking_chars, evidence_ids: result.evidence_ids, latency_ms, timestamp: new Date().toISOString(), error: null, score: scoring })
    if (sample !== null) console.log(`\n${key}\nanswer: ${result.answer}\nscore: ${scoring.passed}/${scoring.total} (${JSON.stringify(scoring.results)})\nevidence_ids: ${JSON.stringify(result.evidence_ids)}\nlatency_ms: ${latency_ms}`)
    elapsedMs += latency_ms
  } catch (error) {
    const latency_ms = Math.round(performance.now() - started); const message = error instanceof Error ? error.message : String(error)
    const scoring = { passed: 0, total: job.question.predicates.length, results: job.question.predicates.map(() => false) }
    await append({ key, set: job.set, question_id: job.question.id, mode: job.mode, repeat: job.repeat, seed, model, embedding_model: embeddingModel, ...versionInfo, answer: '', thinking: '', thinking_chars: 0, evidence_ids: [], latency_ms, timestamp: new Date().toISOString(), error: message, score: scoring })
    console.error(`\n${key}\nerror: ${message}\nlatency_ms: ${latency_ms}`); elapsedMs += latency_ms
  }
  const completeCount = index + 1; const left = Math.round((pending.length - completeCount) * (elapsedMs / completeCount) / 1000)
  console.log(`${completeCount}/${pending.length} done; estimated time left ${left}s`)
}
