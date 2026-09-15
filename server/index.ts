import { createServer } from 'node:http'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { VectorStore } from './vectorStore'
import { requestSchema, runAgents, selectAgents } from './orchestrator'
import { modelHealth, requireModels } from './health'
import { governmentStatus } from './government'

const project = process.env.FIREBASE_PROJECT_ID || 'venturepilot-cf134'
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
const dataDirectory = resolve(process.env.VECTOR_DATA_DIR || 'server/data')
mkdirSync(dataDirectory, { recursive: true })
const store = new VectorStore(resolve(dataDirectory, 'knowledge.sqlite'))
const active = new Set<string>()
const requests = new Map<string, number[]>()
let running = false
const server = createServer(async (req, res) => {
  const send = (status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
  if (req.method === 'GET' && req.url === '/api/health') {
    try {
      send(200, { ...await modelHealth(), knowledge: governmentStatus() })
    } catch { send(200, { available: false, error: 'Ollama is not running. See README setup instructions.', knowledge: governmentStatus() }) }
    return
  }
  if (!(req.method === 'POST' && req.url === '/api/agents/run') && !(req.method === 'DELETE' && req.url?.startsWith('/api/knowledge/'))) { send(404, { error: 'Not found' }); return }
  let uid: string
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
    if (!token) throw new Error('Missing token')
    const { payload } = await jwtVerify(token, keys, { issuer: `https://securetoken.google.com/${project}`, audience: project, algorithms: ['RS256'] })
    if (!payload.sub || !payload.exp) throw new Error('Missing claims')
    uid = payload.sub
  } catch { send(401, { error: 'Sign in again. A valid Firebase ID token is required.' }); return }
  if (req.method === 'DELETE') {
    const id = req.url!.slice('/api/knowledge/'.length)
    if (!/^[\w-]{1,128}$/.test(id)) { send(400, { error: 'Invalid workspace ID' }); return }
    if (active.has(uid)) { send(409, { error: 'Finish or cancel your active run first.' }); return }
    store.remove(JSON.stringify([uid, id])); send(200, { deleted: true }); return
  }
  const now = Date.now()
  for (const [key, times] of requests) if (!times.some(t => now - t < 60000)) requests.delete(key)
  const recent = (requests.get(uid) || []).filter(t => now - t < 60000)
  if (running || active.has(uid) || recent.length >= 6) { send(429, { error: 'The local model is busy or your request limit was reached. Try again shortly.' }); return }
  running = true; active.add(uid); requests.set(uid, [...recent, now])
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 360000)
  res.on('close', () => controller.abort())
  try {
    const chunks: Buffer[] = []; let bytes = 0
    for await (const chunk of req) { bytes += chunk.length; if (bytes > 350000) throw new Error('Request exceeds 350 KB limit.'); chunks.push(Buffer.from(chunk)) }
    const input = requestSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    if (input.startup.ownerId !== uid) { send(403, { error: 'Workspace owner does not match your account.' }); return }
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' })
    const started = Date.now()
    const event = (type: string, data: unknown) => { if (!res.destroyed) res.write(`${JSON.stringify({ type, data: type === 'progress' ? { ...(data as object), elapsedMs: Date.now() - started } : data })}\n`) }
    event('progress', { stage: 'Model availability', state: 'running', detail: 'Checking selected models before indexing any data.', elapsedMs: 0 })
    await requireModels(selectAgents(input.question, input.role))
    event('progress', { stage: 'Model availability', state: 'complete', detail: 'Required specialist, reviewer and embedding models are installed.', elapsedMs: 0 })
    const run = await runAgents(store, uid, input, controller.signal, p => event('progress', p))
    event('result', { ...run, durationMs: Date.now() - started })
    res.end()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent run failed'
    if (res.headersSent) { if (!res.destroyed) res.end(`${JSON.stringify({ type: 'error', data: { error: message } })}\n`) }
    else send(400, { error: message })
  } finally { clearTimeout(timeout); active.delete(uid); running = false }
})
server.requestTimeout = 360000
server.listen(Number(process.env.AGENT_PORT || 8787), '127.0.0.1', () => console.log('Agent API listening at http://127.0.0.1:8787'))
