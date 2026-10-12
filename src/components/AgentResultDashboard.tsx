import { AlertTriangle, ArrowRight, BarChart3, Bot, CheckCircle2, Database, ExternalLink, FileText, Flag, Layers3, RefreshCw, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Startup } from '../types'
import type { AgentAction, AgentEvidence, AgentRun } from '../types/agents'
import { Badge, Button, Progress } from './ui'

type Priority = 'high' | 'medium' | 'low'

const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const priorityStyle: Record<Priority, { label: string; badge: 'red' | 'amber' | 'green'; rail: string }> = {
  high: { label: 'High priority', badge: 'red', rail: 'bg-red-500' },
  medium: { label: 'Medium priority', badge: 'amber', rail: 'bg-amber-500' },
  low: { label: 'Lower priority', badge: 'green', rail: 'bg-brand-500' },
}

function inferredPriority(action: AgentAction, originalIndex: number): Priority {
  return action.priority ?? (originalIndex === 0 ? 'high' : originalIndex < 3 ? 'medium' : 'low')
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, letter => letter.toUpperCase())
}

function compactText(value: unknown) {
  if (typeof value === 'string') return value || 'Not provided'
  if (typeof value === 'number') return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value == null) return 'Not provided'
  return JSON.stringify(value)
}

function fieldsFromValue(parsed: unknown) {
  const fields: Array<[string, string]> = []
  const appendObject = (value: Record<string, unknown>, prefix = '') => {
    for (const [key, nested] of Object.entries(value)) {
      const label = prefix ? `${prefix} · ${humanize(key)}` : humanize(key)
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        for (const [nestedKey, nestedValue] of Object.entries(nested)) fields.push([`${label} · ${humanize(nestedKey)}`, compactText(nestedValue)])
      } else fields.push([label, compactText(nested)])
      if (fields.length >= 8) return
    }
  }
  if (Array.isArray(parsed)) {
    parsed.slice(0, 3).forEach((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) appendObject(item as Record<string, unknown>, `Item ${index + 1}`)
      else fields.push([`Item ${index + 1}`, compactText(item)])
    })
  } else if (parsed && typeof parsed === 'object') appendObject(parsed as Record<string, unknown>)
  return fields.slice(0, 8)
}

function completeObjects(fragment: string) {
  const parsed: unknown[] = []
  let searchFrom = 0
  while (searchFrom < fragment.length) {
    const start = fragment.indexOf('{', searchFrom)
    if (start < 0) break
    let depth = 0, inString = false, escaped = false, recovered = false
    for (let index = start; index < fragment.length; index++) {
      const character = fragment[index]
      if (inString) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === '"') inString = false
        continue
      }
      if (character === '"') { inString = true; continue }
      if (character === '{') depth++
      else if (character === '}') depth--
      if (depth !== 0) continue
      try { parsed.push(JSON.parse(fragment.slice(start, index + 1))) } catch { /* Ignore a malformed legacy object. */ }
      searchFrom = index + 1
      recovered = true
      break
    }
    if (!recovered) searchFrom = start + 1
  }
  return parsed
}

function evidencePresentation(content: string) {
  try { return { fields: fieldsFromValue(JSON.parse(content)), legacyFragment: false } }
  catch {
    const looksStructured = /^[\s[{]/.test(content) || /"[^"\r\n]+"\s*:/.test(content)
    const recovered = looksStructured ? completeObjects(content) : []
    return { fields: recovered.length ? fieldsFromValue(recovered) : [], legacyFragment: looksStructured }
  }
}

function excerpt(value: string, limit = 240) {
  return value.length > limit ? `${value.slice(0, limit).trim()}…` : value
}

function ActionControls({ action, actionId, startupId, added, adding, onAdd }: { action: AgentAction; actionId: string; startupId: string; added: boolean; adding: string | null; onAdd: () => Promise<void> }) {
  return <div className="flex flex-wrap gap-2">
    <Link className="btn-secondary" to={`/startup/${startupId}/${action.module}`}>Open {humanize(action.module)} <ArrowRight className="h-4 w-4" /></Link>
    <Button disabled={added || adding !== null} loading={adding === actionId} onClick={() => void onAdd()}>{added ? 'Added to roadmap' : 'Add to roadmap'}</Button>
  </div>
}

function ActionDetail({ item, position, result, startup, adding, onAdd }: { item: { action: AgentAction; originalIndex: number; priority: Priority }; position: number; result: AgentRun; startup: Startup; adding: string | null; onAdd: (action: AgentAction, originalIndex: number) => Promise<void> }) {
  const { action, originalIndex, priority } = item
  const actionId = `agent-${result.id}-${originalIndex}`
  const added = startup.roadmap.some(milestone => milestone.id === actionId)
  const style = priorityStyle[priority]
  return <li className="relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm">
    <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${style.rail}`} />
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{position}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><Badge tone={style.badge}>{style.label}</Badge><span className="text-xs font-medium text-slate-400">{humanize(action.module)}</span></div>
        <h4 className="mt-2 font-semibold text-slate-900">{action.title}</h4>
        <details className="group mt-2">
          <summary className="cursor-pointer text-sm font-medium text-brand-700">Why this matters and evidence</summary>
          <p className="mt-2 text-sm leading-6 text-slate-600">{action.reason}</p>
          <p className="mt-2 text-xs text-slate-400">Sources: {action.evidenceIds.join(', ') || 'No source cited'}</p>
        </details>
        <div className="mt-3"><ActionControls action={action} actionId={actionId} startupId={startup.id} added={added} adding={adding} onAdd={() => onAdd(action, originalIndex)} /></div>
      </div>
    </div>
  </li>
}

function EvidenceCard({ evidence }: { evidence: AgentEvidence }) {
  const { fields, legacyFragment } = evidencePresentation(evidence.content)
  const isCalculation = evidence.id === 'tool-calculations'
  const isScope = evidence.id === 'venture-scope'
  const match = Math.round(Math.max(0, Math.min(1, evidence.score)) * 100)
  return <article className="rounded-2xl border bg-white p-4 [content-visibility:auto]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isScope ? 'bg-violet-50 text-violet-700' : isCalculation ? 'bg-blue-50 text-blue-700' : evidence.kind === 'government' ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700'}`}>
          {isScope ? <Target className="h-5 w-5" /> : isCalculation ? <BarChart3 className="h-5 w-5" /> : evidence.kind === 'government' ? <FileText className="h-5 w-5" /> : <Database className="h-5 w-5" />}
        </span>
        <div className="min-w-0"><h4 className="font-semibold text-slate-900">{evidence.title}</h4><p className="mt-1 truncate font-mono text-[11px] text-slate-400">{evidence.id}</p></div>
      </div>
      <Badge tone={evidence.kind === 'government' ? 'amber' : 'blue'}>{isScope ? 'Venture scope' : isCalculation ? 'Calculated' : evidence.kind === 'government' ? 'Official source' : 'Workspace'}</Badge>
    </div>
    {!isCalculation && <div className="mt-4"><div className="mb-1.5 flex justify-between text-[11px] font-medium text-slate-500"><span>Retrieval match</span><span>{match}%</span></div><Progress value={match} /></div>}
    {legacyFragment && <div role="note" className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><RefreshCw className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">Saved with an older RAG index</p><span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700">Auto-upgrade ready</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{fields.length ? 'Complete fields were recovered for this preview.' : 'This saved report contains only a partial source fragment.'} Your next specialist run will rebuild the index and create a new report with complete, structured evidence.</p></div></div>
    </div>}
    {fields.length > 0 ? <dl className="mt-4 grid gap-2 sm:grid-cols-2">{fields.map(([label, value], index) => <div key={`${index}-${label}-${value}`} className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-700">{excerpt(value, 100)}</dd></div>)}</dl> : legacyFragment ? null : <p className="mt-4 text-sm leading-6 text-slate-600">{excerpt(evidence.content)}</p>}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <details className="group"><summary className="cursor-pointer text-xs font-semibold text-brand-700">View raw source details</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">{evidence.content}</pre></details>
      {evidence.sourceUrl && /^https:\/\//.test(evidence.sourceUrl) && <a className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700" target="_blank" rel="noreferrer" href={evidence.sourceUrl}>Open official source <ExternalLink className="h-3.5 w-3.5" /></a>}
    </div>
  </article>
}

export function AgentResultDashboard({ result, startup, adding, onAdd }: { result: AgentRun; startup: Startup; adding: string | null; onAdd: (action: AgentAction, originalIndex: number) => Promise<void> }) {
  const orderedActions = result.review.actions
    .map((action, originalIndex) => ({ action, originalIndex, priority: inferredPriority(action, originalIndex) }))
    .sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority] || left.originalIndex - right.originalIndex)
  const topAction = orderedActions[0]
  const nextActions = orderedActions.slice(1, 4)
  const laterActions = orderedActions.slice(4)
  const citedIds = new Set([...result.review.evidenceIds, ...result.review.actions.flatMap(action => action.evidenceIds)])
  const citedCount = result.evidence.filter(evidence => citedIds.has(evidence.id)).length
  const summaryIsLong = result.review.summary.length > 420

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Decision snapshot</p><h3 className="mt-1 text-xl font-semibold text-slate-900">{result.question}</h3></div><Badge tone="green">Reviewed in {(result.durationMs / 1000).toFixed(1)}s</Badge></div>
      <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">{summaryIsLong ? excerpt(result.review.summary, 420) : result.review.summary}</p>
      {summaryIsLong && <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-brand-700">Read complete analysis</summary><p className="mt-3 text-sm leading-6 text-slate-600">{result.review.summary}</p></details>}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border bg-white p-3"><Flag className="h-4 w-4 text-red-500" /><p className="mt-2 text-xl font-semibold">{orderedActions.length}</p><p className="text-[11px] text-slate-500">Prioritized actions</p></div>
        <div className="rounded-xl border bg-white p-3"><Database className="h-4 w-4 text-blue-600" /><p className="mt-2 text-xl font-semibold">{citedCount}/{result.evidence.length}</p><p className="text-[11px] text-slate-500">Evidence used</p></div>
        <div className="rounded-xl border bg-white p-3"><AlertTriangle className="h-4 w-4 text-amber-600" /><p className="mt-2 text-xl font-semibold">{result.review.uncertainties.length}</p><p className="text-[11px] text-slate-500">Open questions</p></div>
      </div>
    </section>

    {topAction ? <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-lg sm:p-6">
      <div aria-hidden="true" className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-500/20 blur-2xl" />
      <div className="relative"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-wider">Do first</span><span className="text-xs text-slate-400">Priority 01 · {humanize(topAction.action.module)}</span></div>
        <h3 className="mt-4 max-w-3xl text-xl font-semibold sm:text-2xl">{topAction.action.title}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{excerpt(topAction.action.reason, 280)}</p>
        <div className="mt-5 flex flex-wrap gap-2"><Link className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100" to={`/startup/${startup.id}/${topAction.action.module}`}>Start this step <ArrowRight className="h-4 w-4" /></Link><Button className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800" variant="secondary" disabled={startup.roadmap.some(milestone => milestone.id === `agent-${result.id}-${topAction.originalIndex}`) || adding !== null} loading={adding === `agent-${result.id}-${topAction.originalIndex}`} onClick={() => void onAdd(topAction.action, topAction.originalIndex)}>{startup.roadmap.some(milestone => milestone.id === `agent-${result.id}-${topAction.originalIndex}`) ? 'Added to roadmap' : 'Add to roadmap'}</Button></div>
      </div>
    </section> : <div className="rounded-2xl border border-dashed p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-brand-600" /><h3 className="mt-3 font-semibold">No source-backed action was produced</h3><p className="mt-1 text-sm text-slate-500">Open the evidence and information gaps below, then ask a narrower question.</p></div>}

    {nextActions.length > 0 && <section><div className="mb-3 flex items-end justify-between"><div><p className="eyebrow">Execution order</p><h3 className="mt-1 text-lg font-semibold">What comes next</h3></div><span className="text-xs text-slate-400">Highest impact first</span></div><ol className="grid gap-3 lg:grid-cols-3">{nextActions.map((item, index) => <ActionDetail key={`${item.originalIndex}-${item.action.title}`} item={item} position={index + 2} result={result} startup={startup} adding={adding} onAdd={onAdd} />)}</ol></section>}
    {laterActions.length > 0 && <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-semibold text-slate-700">Show {laterActions.length} later action{laterActions.length === 1 ? '' : 's'}</summary><ol className="mt-4 grid gap-3 lg:grid-cols-2">{laterActions.map((item, index) => <ActionDetail key={`${item.originalIndex}-${item.action.title}`} item={item} position={index + 5} result={result} startup={startup} adding={adding} onAdd={onAdd} />)}</ol></details>}

    {result.review.uncertainties.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-700" /><div><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Information gaps</p><h3 className="font-semibold text-slate-900">Confirm these before committing</h3></div></div><ul className="mt-4 grid gap-2 md:grid-cols-2">{result.review.uncertainties.map((uncertainty, index) => <li key={`${index}-${uncertainty}`} className="flex gap-2 rounded-xl bg-white/80 p-3 text-sm text-slate-700"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-300 text-[10px] font-bold text-amber-700">?</span><span>{uncertainty}</span></li>)}</ul></section>}

    <details className="rounded-2xl border bg-white p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold text-slate-900"><Layers3 className="h-5 w-5 text-brand-700" />How the agents reached this result</span><Badge tone="neutral">{result.findings.length + 1} agents</Badge></summary><div className="mt-4 grid gap-3 md:grid-cols-2">{[...result.findings, result.review].map((finding, index) => <article key={`${finding.role}-${index}`} className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-brand-700" /><h4 className="font-semibold capitalize">{finding.role}</h4><span className="text-xs text-slate-400">{finding.model}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{finding.summary}</p><p className="mt-3 text-xs text-slate-400">{finding.evidenceIds.length} cited record{finding.evidenceIds.length === 1 ? '' : 's'} · {finding.uncertainties.length} gap{finding.uncertainties.length === 1 ? '' : 's'}</p></article>)}</div></details>

    <details className="rounded-2xl border bg-white p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold text-slate-900"><Database className="h-5 w-5 text-blue-600" />Evidence map</span><Badge tone="blue">{result.evidence.length} records</Badge></summary><div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">Bars show semantic retrieval similarity, not truth or confidence. Important scope and calculation records are always included.</div><div className="mt-4 grid gap-3 xl:grid-cols-2">{result.evidence.map(evidence => <EvidenceCard key={evidence.id} evidence={evidence} />)}</div></details>
  </div>
}
