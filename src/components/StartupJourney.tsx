import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, Check, Circle, CircleDot, ExternalLink, Flag, Route } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Startup } from '../types'
import { buildStartupJourney, journeyProgress } from '../utils/journey'

const statusLabel = { complete: 'Ready', 'in-progress': 'Needs work', 'not-started': 'Not started' } as const
const statusClass = {
  complete: 'bg-emerald-100 text-emerald-800',
  'in-progress': 'bg-amber-100 text-amber-800',
  'not-started': 'bg-slate-100 text-slate-600',
} as const

export function StartupJourney({ startup }: { startup: Startup }) {
  const stages = useMemo(() => buildStartupJourney(startup), [startup])
  const firstIncomplete = stages.find(stage => stage.status !== 'complete') || stages.at(-1)!
  const [selectedId, setSelectedId] = useState(firstIncomplete.id)
  const selected = stages.find(stage => stage.id === selectedId) || firstIncomplete
  const unmetDependencies = selected.dependencies.map(id => stages.find(stage => stage.id === id)!).filter(stage => stage.status !== 'complete')
  const nextCheck = selected.checks.find(check => !check.complete)
  const overall = journeyProgress(stages)

  return <section className="card my-5 overflow-hidden" aria-label="End-to-end startup journey">
    <div className="border-b p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-700">Stage 1 → launch → scale</p><h2 className="mt-1 text-xl font-semibold">Your complete startup journey</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Select any stage to see what goes in, what work happens, what comes out, and what is still missing. Readiness is calculated from saved workspace fields—it is not professional approval.</p></div>
        <div className="min-w-40 rounded-2xl bg-ink p-4 text-white"><span className="text-xs text-slate-300">Workspace readiness</span><strong className="mt-1 block font-display text-3xl">{overall}%</strong><span className="text-xs text-slate-300">{stages.filter(stage => stage.status === 'complete').length} of {stages.length} stages ready</span></div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${overall}% journey readiness`}><div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${overall}%` }} /></div>
    </div>

    <div className="border-b bg-slate-50 p-4 sm:p-6">
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-9">
        {stages.map((stage, index) => <li key={stage.id} className="relative flex items-stretch xl:block">
          <button type="button" aria-pressed={selected.id === stage.id} onClick={() => setSelectedId(stage.id)} className={`relative z-10 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition sm:flex-col sm:items-start ${selected.id === stage.id ? 'border-brand-600 bg-white shadow-sm ring-2 ring-brand-100' : 'border-slate-200 bg-white hover:border-brand-300'}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${statusClass[stage.status]}`}>{stage.status === 'complete' ? <Check className="h-4 w-4" /> : stage.number}</span>
            <span className="min-w-0"><span className="block text-xs font-semibold text-slate-900">{stage.shortTitle}</span><span className="mt-1 block text-[11px] text-slate-500">{stage.percent}% · {statusLabel[stage.status]}</span></span>
          </button>
          {index < stages.length - 1 && <ArrowRight className="mx-1 hidden h-4 w-4 shrink-0 self-center text-slate-300 xl:absolute xl:-right-3 xl:top-7 xl:block" aria-hidden="true" />}
        </li>)}
      </ol>
    </div>

    <div className="p-5 sm:p-6" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[selected.status]}`}>Stage {selected.number} · {statusLabel[selected.status]}</span><h3 className="mt-2 text-xl font-semibold">{selected.title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{selected.purpose}</p></div>
        <div className="text-right"><span className="text-xs text-slate-500">Stage readiness</span><strong className="block font-display text-2xl text-brand-800">{selected.percent}%</strong></div>
      </div>

      {unmetDependencies.length > 0 && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Review dependencies first:</strong> {unmetDependencies.map(item => `Stage ${item.number} ${item.shortTitle} (${item.percent}%)`).join(' · ')}</div>}

      <div className="my-6 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {[['Input', selected.input], ['Work', selected.work], ['Output', selected.output]].map(([label, value], index) => <div className="contents" key={label}><article className={`rounded-2xl p-4 ${index === 1 ? 'bg-brand-50' : 'bg-slate-50'}`}><span className="text-xs font-bold uppercase tracking-wider text-brand-700">{label}</span><p className="mt-2 text-sm leading-6 text-slate-700">{value}</p></article>{index < 2 && <ArrowRight className="hidden h-5 w-5 self-center text-brand-500 lg:block" aria-hidden="true" />}{index < 2 && <ArrowDown className="mx-auto h-5 w-5 text-brand-500 lg:hidden" aria-hidden="true" />}</div>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div><h4 className="flex items-center gap-2 font-semibold"><CircleDot className="h-4 w-4 text-brand-600" />Readiness checklist</h4><ul className="mt-3 space-y-2">{selected.checks.map(check => <li key={check.label} className="flex items-start gap-3 rounded-xl border p-3 text-sm"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${check.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{check.complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}</span><span className={check.complete ? 'text-slate-700' : 'font-medium text-slate-900'}>{check.label}</span></li>)}</ul></div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 p-5 text-white"><h4 className="flex items-center gap-2 font-semibold"><Flag className="h-4 w-4 text-brand-300" />Next best action</h4><p className="mt-3 text-sm leading-6 text-slate-300">{nextCheck ? nextCheck.label : 'This stage is ready. Review the next incomplete stage and validate the evidence before advancing.'}</p></div>
          <div className="rounded-2xl border p-5"><h4 className="flex items-center gap-2 font-semibold"><Route className="h-4 w-4 text-brand-600" />Open connected workspaces</h4><div className="mt-3 flex flex-wrap gap-2">{selected.modules.map(module => <Link key={module} to={`/startup/${startup.id}/${module}`} className="btn-secondary capitalize">{module.replace('-', ' ')} <ExternalLink className="h-3.5 w-3.5" /></Link>)}</div></div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t pt-5 text-sm">
        <span className="text-slate-500">{startup.isDemo ? 'Demo values are illustrative, not validated evidence.' : 'Status updates automatically when you save module data.'}</span>
        {selected.number < stages.length && <button type="button" className="inline-flex items-center gap-1 font-semibold text-brand-700" onClick={() => setSelectedId(stages[selected.number].id)}>View Stage {selected.number + 1}<ArrowRight className="h-4 w-4" /></button>}
      </div>
    </div>
  </section>
}
