import { useEffect, useRef, useState } from 'react'
import { Bot, CheckCircle2, LoaderCircle, ArrowRight } from 'lucide-react'
import type { Startup, StartupUpdate } from '../types'
import type { AgentAction, AgentProgress, AgentRole, AgentRun } from '../types/agents'
import { authenticatedFetch, persistAgentRun, recentAgentRuns, requestAgentRun } from '../services/agentClient'
import { AgentResultDashboard } from './AgentResultDashboard'
import { Button, Select } from './ui'

export function AgentWorkbench({ startup, save, initialRole = 'auto' }: { startup: Startup; save: (update: StartupUpdate) => Promise<void>; initialRole?: AgentRole | 'auto' }) {
  const [question, setQuestion] = useState('')
  const [role, setRole] = useState<AgentRole | 'auto'>(initialRole)
  const [events, setEvents] = useState<AgentProgress[]>([])
  const [result, setResult] = useState<AgentRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [history, setHistory] = useState<AgentRun[]>([])
  const [saveError, setSaveError] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const saveRevision = useRef(0)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort() } }, [])
  const record = async (run: AgentRun) => {
    const revision = ++saveRevision.current
    setStatus('Saving agent report…'); setSaveError(false)
    try { await persistAgentRun(startup, run); if (mounted.current && revision === saveRevision.current) setStatus('Agent report saved. Proposed actions have not changed your modules.') }
    catch { if (mounted.current && revision === saveRevision.current) { setSaveError(true); setStatus('Report is visible but could not be saved. Retry below.') } }
  }
  const run = async (text = question) => {
    if (controller.current || !text.trim()) return
    const abort = new AbortController(); controller.current = abort
    saveRevision.current++
    setBusy(true); setError(''); setEvents([]); setResult(null); setStatus(''); setSaveError(false)
    try {
      const next = await requestAgentRun(startup, text, role === 'auto' ? undefined : role, AbortSignal.any([abort.signal, AbortSignal.timeout(365000)]), event => { if (mounted.current) setEvents(current => [...current.filter(e => e.stage !== event.stage), event]) }, result)
      if (mounted.current) { setResult(next); void record(next) }
    } catch (err) { if (mounted.current) setError(abort.signal.aborted ? 'Run cancelled. No proposed module changes were applied.' : err instanceof Error ? err.message : 'Agent run failed. Check server and model availability.') }
    finally { controller.current = null; if (mounted.current) setBusy(false) }
  }
  const inspectModels = async () => {
    setStatus('Checking the model service…')
    try {
      const response = await fetch('/api/health', { signal: AbortSignal.timeout(5000) })
      const health = await response.json()
      const knowledge = health.knowledge ? ` Source refresh: ${health.knowledge.fetched}/${health.knowledge.total} fetched; ${health.knowledge.failed} failed. Failed sources retain prior snapshots or bundled summaries.` : ''
      setStatus((health.available ? `${health.models.map((m: { role: string; model: string; installed: boolean }) => `${m.role}: ${m.model}${m.installed ? '' : ' (not installed)'}`).join(' · ')}. Embeddings: ${health.embedding}${health.embeddingInstalled ? '' : ' (not installed)'}.` : health.error) + knowledge)
    } catch { setStatus('Agent API not available. Start npm run dev:full. Model setup is documented in README.') }
  }
  const addAction = async (action: AgentAction, originalIndex: number) => {
    if (!result) return
    const id = `agent-${result.id}-${originalIndex}`
    setAdding(id)
    try {
      await save({ roadmap: [...startup.roadmap, { id, name: action.title, timing: 'TBD', description: `${action.reason}\nAgent report: ${result.id}\nEvidence: ${action.evidenceIds.join(', ')}`, status: 'Planned' }] })
      setStatus('Action added to roadmap. Set its timing in Roadmap.')
    } catch { setError('Could not add the action. Please retry.') }
    finally { setAdding(null) }
  }
  return <section className="card my-5 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Bot className="h-5 w-5 text-brand-700" />Specialist agent workspace</h2><button type="button" className="btn-secondary" onClick={() => void inspectModels()}>Check models</button></div>
    <p className="mt-2 text-sm text-slate-500">One or two specialists inspect retrieved evidence. A separate reviewer checks their findings. Actions remain proposals until you add them.</p>
    <form className="my-5 space-y-4" onSubmit={e => { e.preventDefault(); void run() }}>
      <Select label="Specialist routing" disabled={busy} value={role} onChange={e => setRole(e.target.value as AgentRole | 'auto')}>{['auto', 'planner', 'product', 'finance', 'compliance', 'team', 'scaling'].map(r => <option key={r} value={r}>{r === 'auto' ? 'Auto · up to two specialists + reviewer' : `${r} + reviewer`}</option>)}</Select>
      <label className="block"><span className="label">Decision to investigate</span><textarea className="input min-h-24" maxLength={3000} required value={question} disabled={busy} onChange={e => setQuestion(e.target.value)} placeholder="For example: Can our budget support hiring before launch?" /></label>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || !question.trim()}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}Run specialists</Button>{busy && <Button type="button" variant="secondary" onClick={() => controller.current?.abort()}>Cancel run</Button>}</div>
    </form>
    <div className="mb-4 flex flex-wrap gap-2">{['Review team and payroll before launch', 'Check product cost and margin', 'Review compliance evidence gaps', 'Assess scaling and production capacity'].map(text => <button type="button" key={text} disabled={busy} className="rounded-full border px-3 py-2 text-xs hover:bg-brand-50 disabled:opacity-50" onClick={() => setQuestion(text)}>{text}</button>)}</div>
    {events.length > 0 && <ol aria-live="polite" className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{events.map(event => <li key={event.stage} className="rounded-xl border bg-slate-50 p-3"><div className="flex items-center gap-2 font-semibold">{event.state === 'running' && busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : event.state === 'complete' ? <CheckCircle2 className="h-4 w-4 text-brand-600" /> : <span>○</span>}{event.stage}</div><p className="mt-2 text-xs leading-5 text-slate-600">{event.detail}</p><span className="text-xs text-slate-400">{(event.elapsedMs / 1000).toFixed(1)}s elapsed at update</span></li>)}</ol>}
    {error && <p role="alert" className="my-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {result && <AgentResultDashboard result={result} startup={startup} adding={adding} onAdd={addAction} />}
    <p role="status" className="mt-4 text-sm text-slate-600">{status}</p>
    {saveError && result && <Button variant="secondary" onClick={() => void record(result)}>Retry saving report</Button>}
    <details className="mt-5"><summary className="cursor-pointer text-sm font-semibold">Saved agent reports & knowledge controls</summary><div className="my-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={async () => { try { setHistory(await recentAgentRuns(startup)) } catch { setStatus('Could not load saved reports.') } }}>Load latest 5 reports</Button><Button variant="secondary" disabled={busy} onClick={async () => { try { const response = await authenticatedFetch(`/api/knowledge/${startup.id}`, { method: 'DELETE' }); if (!response.ok) throw new Error(); setStatus('Private vector index deleted. It will be rebuilt on your next agent run. Saved startup data and reports remain.') } catch { setStatus('Could not clear the index. Check that the agent server is running and no run is active.') } }}>Clear this startup’s vector index</Button></div>{history.map(run => <button className="my-2 block w-full rounded-xl border p-3 text-left text-sm" key={run.id} disabled={busy} onClick={() => { setResult(run); setEvents([]); setSaveError(false); setError(''); setStatus('Loaded saved report.') }}>{run.question} · {new Date(run.createdAt).toLocaleString()}</button>)}</details>
  </section>
}
