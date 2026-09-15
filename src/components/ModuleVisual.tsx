import type { Startup } from '../types'
import { EconomicsExplorer, ProcessFlow } from './VisualPlan'
import { calculateCapacity, inr } from '../utils/calculations'

export function ModuleVisual({ startup, module }: { startup: Startup; module: string }) {
  if (module === 'finance') return <EconomicsExplorer startup={startup} />
  if (module === 'bom') {
    const parts = [...startup.bom].sort((a, b) => b.quantity * b.unitCost - a.quantity * a.unitCost).slice(0, 8)
    const max = Math.max(1, ...parts.map(p => p.quantity * p.unitCost))
    return <section className="card mb-5 p-5"><h2 className="font-semibold">Largest saved component costs</h2><p className="mb-4 mt-1 text-xs text-slate-500">Quantity × unit cost. Edit and save the bill below to refresh this comparison.</p>{parts.map(p => <div className="my-3 grid grid-cols-[minmax(80px,1fr)_2fr_90px] items-center gap-3 text-xs" key={p.id}><span>{p.component}</span><span className="h-6 rounded bg-slate-100"><span className="block h-full rounded bg-brand-500" style={{ width: `${p.quantity * p.unitCost / max * 100}%` }} /></span><span>{inr(p.quantity * p.unitCost)}</span></div>)}</section>
  }
  if (module === 'manufacturing') {
    const m = startup.manufacturing
    return <ProcessFlow title="How saved inputs become monthly capacity" steps={[{ title: `${m.productionLines} lines × ${m.unitsPerHour} units/hour`, detail: 'Parallel production rate' }, { title: `${m.hoursPerDay} hours × ${m.daysPerMonth} days`, detail: 'Monthly operating schedule' }, { title: `${m.utilization}% utilization`, detail: 'Adjust for planned effective operating time' }, { title: `${Math.round(calculateCapacity(m).realisticMonthly)} units/month`, detail: 'Compare this capacity with financial sales assumptions before expansion.' }]} />
  }
  if (module === 'roadmap') return <section className="card mb-5 p-5"><h2 className="mb-4 font-semibold">Milestone board · saved status</h2><div className="grid gap-4 md:grid-cols-3">{(['Planned', 'In progress', 'Complete'] as const).map(status => <div key={status} className="rounded-xl bg-slate-50 p-3"><h3 className="font-semibold">{status} · {startup.roadmap.filter(m => m.status === status).length}</h3>{startup.roadmap.filter(m => m.status === status).map(m => <div className="mt-3 rounded-lg border bg-white p-3 text-sm" key={m.id}>{m.name}<span className="mt-1 block text-xs text-slate-500">{m.timing}</span></div>)}</div>)}</div></section>
  if (module === 'product') return <section className="card mb-5 p-5"><h2 className="font-semibold">Product specification blocks</h2><p className="mt-1 text-xs text-slate-500">Saved specifications → component selection → manufacturing requirements.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{startup.product.specs.map(s => <div key={s.id} className="rounded-xl border-l-4 border-brand-500 bg-brand-50 p-4"><h3 className="text-xs font-semibold uppercase text-brand-700">{s.name}</h3><p className="mt-2 text-sm">{s.value || 'Target missing'}</p></div>)}</div></section>
  if (module === 'identity') return <ProcessFlow title="Business model relationships · saved assumptions" steps={[{ title: 'Customer', detail: startup.targetCustomer || 'Not specified' }, { title: 'Problem', detail: startup.identity.problem || 'Not specified' }, { title: 'Value', detail: startup.identity.valueProposition || 'Not specified' }, { title: 'Revenue model', detail: startup.identity.businessModel || 'Not specified' }]} />
  return null
}
