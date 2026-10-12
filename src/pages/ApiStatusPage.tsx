import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Badge, Button, PageHeader, Section } from '../components/ui'

type Health = { available?: boolean; error?: string; embedding?: string; embeddingInstalled?: boolean; models?: Array<{ role: string; model: string; installed: boolean }>; knowledge?: { fetched: number; failed: number; total: number; attemptedAt: string } }

const endpoints = [
  { method: 'GET', path: '/api/health', safe: true, description: 'Checks the local Agent API, Ollama/model availability, and bundled government-source refresh status.' },
  { method: 'POST', path: '/api/agents/run', safe: false, description: 'Requires a Firebase ID token and workspace payload. Starts a live RAG/agent run when models are available; Copilot falls back to local demo analysis otherwise.' },
  { method: 'DELETE', path: '/api/knowledge/:startupId', safe: false, description: 'Requires a Firebase ID token. Deletes only that startup’s local vector index and cannot be undone.' },
]

export function ApiStatusPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const check = async () => {
    setChecking(true); setError('')
    try {
      const response = await fetch('/api/health', { signal: AbortSignal.timeout(6000) })
      if (!response.ok) throw new Error(`Health endpoint returned ${response.status}`)
      setHealth(await response.json())
    } catch (reason) { setHealth(null); setError(reason instanceof Error ? reason.message : 'Unable to contact the local API.') }
    finally { setChecking(false) }
  }
  useEffect(() => { void check() }, [])
  return <>
    <PageHeader eyebrow="Developer tools" title="API diagnostics" description="Live status and safe checks for every browser-facing local API endpoint." actions={<Button variant="secondary" loading={checking} onClick={() => void check()}><RefreshCw className="h-4 w-4" />Refresh checks</Button>} />
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Live health" description="Safe GET request to the local API.">
        {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : health ? <div className="space-y-3 text-sm"><div className="flex items-center justify-between"><span>Agent API</span><Badge tone="green">Reachable</Badge></div><div className="flex items-center justify-between"><span>Ollama and configured models</span><Badge tone={health.available ? 'green' : 'amber'}>{health.available ? 'Ready' : 'Unavailable'}</Badge></div>{health.error && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">{health.error}</p>}{health.models?.map(model => <div key={model.role} className="flex items-center justify-between rounded-lg border p-3"><span className="capitalize">{model.role}: {model.model}</span><Badge tone={model.installed ? 'green' : 'amber'}>{model.installed ? 'Installed' : 'Missing'}</Badge></div>)}{health.knowledge && <p className="text-xs text-slate-500">Government sources: {health.knowledge.fetched}/{health.knowledge.total} fetched; {health.knowledge.failed} failed. Last refresh: {new Date(health.knowledge.attemptedAt).toLocaleString()}.</p>}</div> : <p className="text-sm text-slate-500">Running check…</p>}
      </Section>
      <Section title="Endpoint inventory" description="Only the health route is safe to run automatically."><div className="space-y-3">{endpoints.map(endpoint => <article key={endpoint.path} className="rounded-xl border p-4"><div className="flex flex-wrap items-center gap-2"><Badge tone={endpoint.method === 'GET' ? 'green' : endpoint.method === 'DELETE' ? 'red' : 'blue'}>{endpoint.method}</Badge><code className="text-sm font-semibold">{endpoint.path}</code>{endpoint.safe ? <Badge tone="green">Safe check</Badge> : <Badge tone="amber">Action required</Badge>}</div><p className="mt-2 text-sm leading-6 text-slate-600">{endpoint.description}</p>{endpoint.path === '/api/health' && <a className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline" href="/api/health" target="_blank" rel="noreferrer">Open raw health response <ExternalLink className="h-3.5 w-3.5" /></a>}</article>)}</div></Section>
    </div>
  </>
}
