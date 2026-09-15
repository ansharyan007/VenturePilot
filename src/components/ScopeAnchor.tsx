import { ArrowRight, Crosshair, Lightbulb } from 'lucide-react'
import type { Startup } from '../types'

export function ScopeAnchor({ startup, destination }: { startup: Startup; destination: string }) {
  return <section className="mb-5 grid items-stretch gap-2 rounded-2xl border border-brand-100 bg-white p-3 sm:grid-cols-[1fr_auto_.65fr_auto_.65fr]" aria-label="Venture scope">
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"><Lightbulb className="h-5 w-5 shrink-0 text-brand-600" /><div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your original idea</span><p className="truncate text-sm font-medium">{startup.idea}</p></div></div>
    <ArrowRight className="mx-auto h-4 w-4 self-center rotate-90 text-brand-400 sm:rotate-0" aria-hidden="true" />
    <div className="rounded-xl bg-brand-50 px-4 py-3"><span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">Category</span><p className="truncate text-sm font-semibold text-brand-900">{startup.category}</p></div>
    <ArrowRight className="mx-auto h-4 w-4 self-center rotate-90 text-brand-400 sm:rotate-0" aria-hidden="true" />
    <div className="flex items-center gap-3 rounded-xl bg-ink px-4 py-3 text-white"><Crosshair className="h-4 w-4 shrink-0 text-brand-300" /><div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current view</span><p className="text-sm font-semibold">{destination}</p></div></div>
  </section>
}
