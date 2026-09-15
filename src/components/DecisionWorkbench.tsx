import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Startup } from '../types'
import { inspectDecisions } from '../services/decisionWorkflow'

export function DecisionWorkbench({ startup }: { startup: Startup }) {
  const [filter, setFilter] = useState<'all' | 'review'>('review')
  const decisions = inspectDecisions(startup)
  const count = decisions.filter(d => d.needsAction).length
  return <details open className="card mb-5 p-4 print:hidden"><summary className="cursor-pointer font-semibold text-brand-800">Decision workspace · {count} checks need review · explore inputs and next actions</summary>
    <p className="my-3 text-sm text-slate-500">Calculated from saved module data. Open a linked module to resolve a check; saving there refreshes these results. Passing a check does not establish launch readiness.</p>
    <div className="mb-4 flex gap-2">{(['review', 'all'] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter(value)}>{value === 'review' ? 'Needs review' : 'All checks'}</button>)}<Link className="btn-secondary" to={`/startup/${startup.id}/visual-plan`}>Explore relationships</Link></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{decisions.filter(d => filter === 'all' || d.needsAction).map(d => <article className="rounded-xl border bg-slate-50 p-4" key={d.title}><p className={`text-xs font-semibold ${d.needsAction ? 'text-amber-700' : 'text-brand-700'}`}>{d.needsAction ? 'Review needed' : 'Check passed'}</p><h3 className="mt-2 font-semibold">{d.title}</h3><p className="my-2 text-xl font-semibold">{d.value}</p><p className="mb-3 text-xs leading-5 text-slate-500">{d.formula}</p><Link className="text-sm font-semibold text-brand-700 underline" to={`/startup/${startup.id}/${d.route}`}>{d.action} →</Link></article>)}</div>
    {filter === 'review' && !count && <p className="text-sm">No issues detected by these five checks. Use All checks to inspect the assumptions.</p>}
  </details>
}
