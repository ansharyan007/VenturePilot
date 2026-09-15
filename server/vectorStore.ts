import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import type { AgentEvidence } from '../src/types/agents'

export type Chunk = Omit<AgentEvidence, 'score'>
export const hash = (text: string) => createHash('sha256').update(text).digest('hex')
export function cosine(a: number[], b: number[]) {
  if (a.length !== b.length || !a.length) return 0
  const dot = a.reduce((s, x, i) => s + x * b[i], 0)
  const norm = Math.sqrt(a.reduce((s, x) => s + x * x, 0) * b.reduce((s, x) => s + x * x, 0))
  return norm ? dot / norm : 0
}
export class VectorStore {
  db: DatabaseSync
  constructor(path: string) {
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS vectors (scope TEXT, model TEXT, id TEXT, hash TEXT, document TEXT, vector TEXT, PRIMARY KEY(scope, model, id));')
  }
  async sync(scope: string, model: string, chunks: Chunk[], embedding: (texts: string[]) => Promise<number[][]>) {
    const old = this.db.prepare('SELECT id, hash FROM vectors WHERE scope=? AND model=?').all(scope, model) as { id: string; hash: string }[]
    const hashes = new Map(old.map(r => [r.id, r.hash]))
    const changed = chunks.filter(c => hashes.get(c.id) !== hash(JSON.stringify(c)))
    const rows: Array<{ chunk: Chunk; vector: number[] }> = []
    const existing = this.db.prepare('SELECT vector FROM vectors WHERE scope=? AND model=? LIMIT 1').get(scope, model) as { vector: string } | undefined
    let dimensions: number | undefined = existing ? JSON.parse(existing.vector).length : undefined
    for (let i = 0; i < changed.length; i += 12) {
      const batch = changed.slice(i, i + 12)
      const vectors = await embedding(batch.map(c => `${c.title}\n${c.content}`))
      if (vectors.length !== batch.length || vectors.some(v => !v.length || !v.some(n => n !== 0) || v.some(n => !Number.isFinite(n)))) throw new Error('Invalid vectors')
      dimensions ??= vectors[0]?.length
      if (vectors.some(v => v.length !== dimensions)) throw new Error('Embedding dimensions changed. Clear the vector index or configure a new embedding-model name.')
      rows.push(...batch.map((chunk, j) => ({ chunk, vector: vectors[j] })))
    }
    // All embeddings succeed before replacing a snapshot, so a failed run retains the prior index.
    this.db.exec('BEGIN')
    try {
      const put = this.db.prepare('INSERT OR REPLACE INTO vectors VALUES (?, ?, ?, ?, ?, ?)')
      rows.forEach(({ chunk, vector }) => put.run(scope, model, chunk.id, hash(JSON.stringify(chunk)), JSON.stringify(chunk), JSON.stringify(vector)))
      const ids = new Set(chunks.map(c => c.id))
      old.filter(r => !ids.has(r.id)).forEach(r => this.db.prepare('DELETE FROM vectors WHERE scope=? AND model=? AND id=?').run(scope, model, r.id))
      this.db.prepare('DELETE FROM vectors WHERE scope=? AND model<>?').run(scope, model)
      this.db.exec('COMMIT')
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
    return changed.length
  }
  search(scopes: string[], model: string, query: number[], count = 6): AgentEvidence[] {
    const rows = scopes.flatMap(scope => this.db.prepare('SELECT document, vector FROM vectors WHERE scope=? AND model=?').all(scope, model)) as { document: string; vector: string }[]
    if (rows.some(row => JSON.parse(row.vector).length !== query.length)) throw new Error('Query/index embedding dimensions differ. Clear the index before retrying.')
    return rows.map(row => ({ ...JSON.parse(row.document), score: cosine(query, JSON.parse(row.vector)) } as AgentEvidence)).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, count)
  }
  remove(scope: string) { this.db.prepare('DELETE FROM vectors WHERE scope=?').run(scope) }
  close() { this.db.close() }
}
