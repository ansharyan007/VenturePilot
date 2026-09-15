import { useState } from 'react'
import { Check, Factory } from 'lucide-react'
import { StartupPageState } from '../components/StartupPageState'
import { Field, PageHeader, Textarea } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import { ScopeAnchor } from '../components/ScopeAnchor'
import { ModuleVisual } from '../components/ModuleVisual'
import type { ManufacturingPlan, Startup, StartupUpdate } from '../types'
import { useToast } from '../context/ToastContext'

const strategies: Array<Exclude<ManufacturingPlan['strategy'], 'Not decided'>> = ['Contract manufacturing', 'Own manufacturing', 'Hybrid manufacturing']
const strategyHint = {
  'Contract manufacturing': 'Lower initial capital · partner dependency',
  'Own manufacturing': 'Higher control · higher capital',
  'Hybrid manufacturing': 'Own critical steps · outsource scale',
} as const

function Manufacturing({ startup, save }: { startup: Startup; save: (u: StartupUpdate) => Promise<void> }) {
  const [plan, setPlan] = useState(startup.manufacturing)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const update = <K extends keyof ManufacturingPlan>(key: K, value: ManufacturingPlan[K]) => setPlan(current => ({ ...current, [key]: value }))
  const doSave = async () => { setSaving(true); try { await save({ manufacturing: plan, progress: Math.max(startup.progress, 48) }); toast('Manufacturing plan saved') } finally { setSaving(false) } }

  return <>
    <PageHeader eyebrow="Production system" title="Manufacturing" description="Choose how the idea is built, then compare usable capacity with expected demand." />
    <ScopeAnchor startup={startup} destination="Production design" />
    <div className="mb-5 grid gap-3 md:grid-cols-3">{strategies.map(strategy => <button type="button" key={strategy} onClick={() => update('strategy', strategy)} className={`relative rounded-2xl border p-4 text-left ${plan.strategy === strategy ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'bg-white hover:border-brand-300'}`}><Factory className="h-5 w-5 text-brand-700" /><h2 className="mt-3 text-sm font-semibold">{strategy}</h2><p className="mt-1 text-xs text-slate-500">{strategyHint[strategy]}</p>{plan.strategy === strategy && <Check className="absolute right-4 top-4 h-4 w-4 text-brand-700" />}</button>)}</div>

    <ModuleVisual startup={{ ...startup, manufacturing: plan }} module="manufacturing" />

    <section className="card mb-5 p-5"><h2 className="font-semibold">Capacity inputs</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><Field label="Factory size (sq ft)" type="number" min="0" value={plan.factorySize} onChange={event => update('factorySize', +event.target.value)} /><Field label="Production lines" type="number" min="0" value={plan.productionLines} onChange={event => update('productionLines', +event.target.value)} /><Field label="Units / hour" type="number" min="0" value={plan.unitsPerHour} onChange={event => update('unitsPerHour', +event.target.value)} /><Field label="Hours / day" type="number" min="0" max="24" value={plan.hoursPerDay} onChange={event => update('hoursPerDay', +event.target.value)} /><Field label="Days / month" type="number" min="0" max="31" value={plan.daysPerMonth} onChange={event => update('daysPerMonth', +event.target.value)} /><Field label="Utilization %" type="number" min="0" max="100" value={plan.utilization} onChange={event => update('utilization', +event.target.value)} /></div></section>

    <details className="card p-5"><summary className="cursor-pointer font-semibold">Supporting assumptions</summary><div className="mt-5 grid gap-4 md:grid-cols-2"><Textarea label="Quality control" value={plan.qualityControl} onChange={event => update('qualityControl', event.target.value)} /><Textarea label="Workforce" value={plan.workforce} onChange={event => update('workforce', event.target.value)} /><Textarea label="Risks" value={plan.risks} onChange={event => update('risks', event.target.value)} /><div className="space-y-4"><Field label="Capital required (₹)" type="number" min="0" value={plan.capitalRequirements} onChange={event => update('capitalRequirements', +event.target.value)} /><Field label="Complexity" value={plan.complexity} onChange={event => update('complexity', event.target.value)} /></div><Textarea label="Advantages" value={plan.advantages} onChange={event => update('advantages', event.target.value)} /><Textarea label="Disadvantages" value={plan.disadvantages} onChange={event => update('disadvantages', event.target.value)} /></div></details>
    <PageSaveBar saving={saving} onSave={doSave} />
  </>
}

export function ManufacturingPage() { return <StartupPageState>{state => <Manufacturing {...state} />}</StartupPageState> }
