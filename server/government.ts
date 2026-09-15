import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { complianceKnowledge } from '../src/data/complianceKnowledge'
import type { Chunk } from './vectorStore'

export const sourceSchema = z.object({ id: z.string(), title: z.string(), sourceUrl: z.string().url(), fetchedAt: z.string(), text: z.string().min(200).max(400000), contentHash: z.string(), status: z.literal('fetched-unreviewed') })
export type GovernmentSource = z.infer<typeof sourceSchema>
export const governmentDirectory = () => resolve(process.env.VECTOR_DATA_DIR || 'server/data', 'government')
export function governmentStatus() {
  const path = resolve(governmentDirectory(), 'ingestion-report.json')
  if (!existsSync(path)) return { fetched: 0, failed: 0, total: complianceKnowledge.length, attemptedAt: null }
  try {
    const report = z.object({ attemptedAt: z.string(), sources: z.array(z.object({ status: z.string() })) }).parse(JSON.parse(readFileSync(path, 'utf8')))
    return { fetched: report.sources.filter(s => s.status === 'fetched-unreviewed').length, failed: report.sources.filter(s => s.status === 'failed').length, total: complianceKnowledge.length, attemptedAt: report.attemptedAt }
  } catch { return { fetched: 0, failed: complianceKnowledge.length, total: complianceKnowledge.length, attemptedAt: null } }
}
export function governmentChunks(): Chunk[] {
  return complianceKnowledge.flatMap(source => {
    const path = resolve(governmentDirectory(), `${source.id}.json`)
    let fetched: GovernmentSource | undefined
    if (existsSync(path)) {
      const parsed = sourceSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')))
      if (parsed.success && parsed.data.id === source.id) fetched = parsed.data
    }
    if (!fetched) return [{ id: `g-${source.id}`, title: source.title, content: `${source.content}\nCurated summary only. Recorded snapshot ${source.lastVerified}; full source freshness unverified.`, sourceUrl: source.sourceUrl, kind: 'government' as const }]
    const chunks: Chunk[] = []
    const age = Math.max(0, Math.floor((Date.now() - Date.parse(fetched.fetchedAt)) / 86400000))
    // Cap each document at 100 chunks. Ingestion retains full extracted text for review.
    for (let i = 0; i < fetched.text.length && chunks.length < 100; i += 1200) chunks.push({ id: `g-${source.id}-${i}`, title: source.title, sourceUrl: fetched.sourceUrl, kind: 'government', content: `${fetched.text.slice(i, i + 1400)}\nRetrieved ${fetched.fetchedAt}. Machine-extracted, unreviewed source; ${age > 30 ? 'older than 30 days: refresh recommended' : 'current legal effect not verified'}.` })
    return chunks
  })
}
