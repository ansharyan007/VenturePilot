import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, CheckCircle2, LoaderCircle, ArrowRight } from 'lucide-react'
import type { Startup, StartupUpdate } from '../types'
import type { AgentProgress, AgentRole, AgentRun } from '../types/agents'
import { authHeaders, persistAgentRun, recentAgentRuns, requestAgentRun } from '../services/agentClient'
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
    {result && <div className="space-y-5">
      <div className="rounded-xl bg-brand-50 p-4"><p className="text-xs font-semibold text-brand-700">Reviewed result · {(result.durationMs / 1000).toFixed(1)} seconds · {result.findings.length + 1} model calls</p><h3 className="mt-2 font-semibold">{result.question}</h3><p className="mt-3 text-sm leading-6">{result.review.summary}</p></div>
      <div className="grid gap-3 md:grid-cols-2">{result.review.actions.map((action, i) => {
        const id = `agent-${result.id}-${i}`
        const added = startup.roadmap.some(m => m.id === id)
        return <article key={id} className="rounded-xl border p-4"><h4 className="font-semibold">{action.title}</h4><p className="my-3 text-sm text-slate-600">{action.reason}</p><p className="mb-3 text-xs text-slate-500">Evidence: {action.evidenceIds.join(', ') || 'Uncited proposal'}</p><div className="flex flex-wrap gap-2"><Link className="btn-secondary" to={`/startup/${startup.id}/${action.module}`}>Review module</Link><Button disabled={added || adding !== null} onClick={async () => { setAdding(id); try { await save({ roadmap: [...startup.roadmap, { id, name: action.title, timing: 'TBD', description: `${action.reason}\nAgent report: ${result.id}\nEvidence: ${action.evidenceIds.join(', ')}`, status: 'Planned' }] }); setStatus('Action added to roadmap. Set its timing in Roadmap.') } catch { setError('Could not add the action. Please retry.') } finally { setAdding(null) } }}>{added ? 'Added to roadmap' : 'Add to roadmap'}</Button></div></article>
      })}</div>
      {result.review.uncertainties.length > 0 && <div className="rounded-xl bg-amber-50 p-4"><h4 className="font-semibold">Unresolved questions from the reviewer</h4><ul className="mt-2 list-inside list-disc space-y-2 text-sm">{result.review.uncertainties.map((u, i) => <li key={i}>{u}</li>)}</ul></div>}
      <details><summary className="cursor-pointer font-semibold text-brand-700">Inspect each agent’s findings and model</summary><div className="mt-3 grid gap-3 md:grid-cols-2">{[...result.findings, result.review].map((finding, i) => <article key={i} className="rounded-xl border p-4"><h4 className="font-semibold">{finding.role} · {finding.model}</h4><p className="my-2 text-sm">{finding.summary}</p><ul className="list-inside list-disc text-xs text-amber-800">{finding.uncertainties.map((u, j) => <li key={j}>{u}</li>)}</ul><p className="mt-2 text-xs">Evidence: {finding.evidenceIds.join(', ') || 'None cited'}</p></article>)}</div></details>
      <details><summary className="cursor-pointer font-semibold text-brand-700">Inspect {result.evidence.length} retrieved evidence records</summary><div className="mt-3 space-y-3">{result.evidence.map(e => <article key={e.id} className="rounded-xl border p-4"><h4 className="font-semibold">{e.title}</h4><p className="text-xs text-slate-500">{e.id} · {e.id === 'tool-calculations' ? 'Calculated tool output' : `Cosine similarity ${e.score.toFixed(3)} (not confidence)`}</p><pre className="my-3 whitespace-pre-wrap break-words text-xs">{e.content}</pre>{e.sourceUrl && /^https:\/\//.test(e.sourceUrl) && <a className="text-brand-700 underline" target="_blank" rel="noreferrer" href={e.sourceUrl}>Official source</a>}</article>)}</div></details>
    </div>}
    <p role="status" className="mt-4 text-sm text-slate-600">{status}</p>
    {saveError && result && <Button variant="secondary" onClick={() => void record(result)}>Retry saving report</Button>}
    <details className="mt-5"><summary className="cursor-pointer text-sm font-semibold">Saved agent reports & knowledge controls</summary><div className="my-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={async () => { try { setHistory(await recentAgentRuns(startup)) } catch { setStatus('Could not load saved reports.') } }}>Load latest 5 reports</Button><Button variant="secondary" disabled={busy} onClick={async () => { try { const response = await fetch(`/api/knowledge/${startup.id}`, { method: 'DELETE', headers: await authHeaders() }); if (!response.ok) throw new Error(); setStatus('Private vector index deleted. It will be rebuilt on your next agent run. Saved startup data and reports remain.') } catch { setStatus('Could not clear the index. Check that the agent server is running and no run is active.') } }}>Clear this startup’s vector index</Button></div>{history.map(run => <button className="my-2 block w-full rounded-xl border p-3 text-left text-sm" key={run.id} disabled={busy} onClick={() => { setResult(run); setEvents([]); setSaveError(false); setError(''); setStatus('Loaded saved report.') }}>{run.question} · {new Date(run.createdAt).toLocaleString()}</button>)}</details>
  </section>
}
