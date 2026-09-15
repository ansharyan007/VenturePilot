import { mkdir, writeFile, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import { load } from 'cheerio'
import { PDFParse } from 'pdf-parse'
import { complianceKnowledge } from '../src/data/complianceKnowledge'
import { governmentDirectory, sourceSchema } from './government'
import { hash } from './vectorStore'

// Operator-only CLI. No request parameter can introduce an arbitrary URL.
const hosts = new Set(['www.bis.gov.in', 'www.eservices.dot.gov.in', 'eservices.dot.gov.in', 'cpcb.gov.in', 'cpcb.nic.in', 'consumeraffairs.nic.in', 'consumeraffairs.gov.in', 'www.mca.gov.in', 'cbic-gst.gov.in', 'www.startupindia.gov.in'])
export function allowedGovernmentUrl(url: string) {
  const parsed = new URL(url)
  return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port && hosts.has(parsed.hostname)
}
export async function fetchGovernment(url: string) {
  const signal = AbortSignal.timeout(25000)
  for (let redirects = 0; redirects < 5; redirects++) {
    if (!allowedGovernmentUrl(url)) throw new Error('Government URL or redirect is not allowlisted.')
    const response = await fetch(url, { redirect: 'manual', signal, headers: { 'User-Agent': 'BuildMyIdea/1.0 (government-reference archival)' } })
    if (response.status >= 300 && response.status < 400) { const location = response.headers.get('location'); if (!location) throw new Error('Redirect missing location'); await response.body?.cancel(); url = new URL(location, url).href; continue }
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
    const chunks: Uint8Array[] = []; let bytes = 0
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) { bytes += chunk.length; if (bytes > 12000000) { await response.body.cancel().catch(() => {}); throw new Error('Source exceeds 12 MB') } chunks.push(chunk) }
    return { buffer: Buffer.concat(chunks), url, type: response.headers.get('content-type') || '' }
  }
  throw new Error('Too many redirects')
}
export async function ingestGovernment() {
  const directory = governmentDirectory(); await mkdir(directory, { recursive: true })
  const report: Array<{ id: string; status: string; detail: string }> = []
  for (const source of complianceKnowledge) {
    try {
      const { buffer, url, type } = await fetchGovernment(source.sourceUrl!)
      let text: string
      const pdf = buffer.subarray(0, 5).toString() === '%PDF-'
      if (pdf) { const parser = new PDFParse({ data: new Uint8Array(buffer) }); try { text = (await parser.getText()).text } finally { await parser.destroy() } }
      else if (type.includes('html')) {
        const $ = load(buffer.toString('utf8')); $('script, style, nav, footer, header, noscript, form').remove()
        const main = $('main').first(); text = (main.length ? main.text() : $('body').text()).replace(/\s+/g, ' ').trim()
      } else throw new Error(`Unsupported source content type: ${type}`)
      if (/access denied|request rejected|verify you are human/i.test(text.slice(0, 600))) throw new Error('Source returned a block/challenge page.')
      const record = sourceSchema.parse({ id: source.id, title: source.title, sourceUrl: url, fetchedAt: new Date().toISOString(), text, contentHash: hash(text), status: 'fetched-unreviewed' })
      await writeFile(resolve(directory, `${source.id}.${pdf ? 'pdf' : 'html'}`), buffer)
      const temporary = resolve(directory, `${source.id}.json.tmp`)
      await writeFile(temporary, JSON.stringify(record, null, 2)); await rename(temporary, resolve(directory, `${source.id}.json`))
      report.push({ id: source.id, status: 'fetched-unreviewed', detail: `${text.length} characters extracted` })
    } catch (error) { report.push({ id: source.id, status: 'failed', detail: error instanceof Error ? error.message : 'Fetch failed; previous snapshot retained' }) }
    console.log(report.at(-1))
  }
  await writeFile(resolve(directory, 'ingestion-report.json'), JSON.stringify({ attemptedAt: new Date().toISOString(), sources: report }, null, 2))
  if (report.some(source => source.status === 'failed')) process.exitCode = 1
}
