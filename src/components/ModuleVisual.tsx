import type { Startup } from '../types'
import { calculateCapacity, inr, number } from '../utils/calculations'

export function ModuleVisual({ startup, module }: { startup: Startup; module: 'bom' | 'manufacturing' }) {
  if (module === 'bom') {
    const parts = [...startup.bom].filter(item => item.component.trim()).sort((a, b) => b.quantity * b.unitCost - a.quantity * a.unitCost).slice(0, 8)
    const max = Math.max(1, ...parts.map(item => item.quantity * item.unitCost))
    return <section className="card mb-5 p-5"><div className="flex items-end justify-between gap-4"><div><h2 className="font-semibold">Cost concentration</h2><p className="mt-1 text-xs text-slate-500">Quantity × unit cost</p></div><span className="text-xs text-slate-500">Top {parts.length || 0}</span></div>{parts.length ? <div className="mt-5 space-y-3">{parts.map(part => <div className="grid grid-cols-[minmax(76px,1fr)_2fr_90px] items-center gap-3 text-xs" key={part.id}><span className="truncate">{part.component}</span><span className="h-5 overflow-hidden rounded bg-slate-100"><span className="block h-full rounded bg-brand-500" style={{ width: `${part.quantity * part.unitCost / max * 100}%` }} /></span><span className="text-right font-semibold">{inr(part.quantity * part.unitCost)}</span></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">Add components to build the cost graph.</div>}</section>
  }

  const capacity = calculateCapacity(startup.manufacturing)
  const measures = [
    { label: 'Theoretical', value: capacity.theoreticalMonthly, tone: 'bg-slate-400' },
    { label: 'Realistic', value: capacity.realisticMonthly, tone: 'bg-brand-600' },
    { label: 'Sales target', value: startup.financials.monthlySales, tone: 'bg-amber-500' },
  ]
  const max = Math.max(1, ...measures.map(item => item.value))
  return <section className="card mb-5 p-5"><div className="flex items-end justify-between gap-4"><div><h2 className="font-semibold">Monthly capacity vs demand</h2><p className="mt-1 text-xs text-slate-500">Saved operating inputs</p></div><strong className="font-display text-2xl text-brand-800">{number(capacity.realisticMonthly)}</strong></div><div className="mt-5 space-y-4">{measures.map(item => <div key={item.label} className="grid grid-cols-[90px_1fr_80px] items-center gap-3 text-xs"><span>{item.label}</span><span className="h-6 overflow-hidden rounded bg-slate-100"><span className={`block h-full rounded ${item.tone}`} style={{ width: `${item.value / max * 100}%` }} /></span><span className="text-right font-semibold">{number(item.value)}</span></div>)}</div></section>
}
