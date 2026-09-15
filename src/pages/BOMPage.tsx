import { useState } from 'react'
import { Plus } from 'lucide-react'
import { StartupPageState } from '../components/StartupPageState'
import { Button, Field, IconDelete, PageHeader, Select } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import { ScopeAnchor } from '../components/ScopeAnchor'
import { ModuleVisual } from '../components/ModuleVisual'
import type { BOMItem, Startup, StartupUpdate } from '../types'
import { inr, sumBOM } from '../utils/calculations'
import { useToast } from '../context/ToastContext'

function BOM({ startup, save }: { startup: Startup; save: (u: StartupUpdate) => Promise<void> }) {
  const [items, setItems] = useState(startup.bom)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const total = sumBOM(items)
  const update = (id: string, key: keyof BOMItem, value: string | number) => setItems(current => current.map(item => item.id === id ? { ...item, [key]: value } : item))
  const add = () => setItems(current => [...current, { id: crypto.randomUUID(), component: '', quantity: 1, unitCost: 0, supplierType: '', criticality: 'Medium', notes: '' }])
  const doSave = async () => { setSaving(true); try { await save({ bom: items, progress: Math.max(startup.progress, 38) }); toast('Bill of materials saved') } finally { setSaving(false) } }

  return <>
    <PageHeader eyebrow="Cost structure" title="Bill of Materials" description="See which parts drive cost, then edit only the inputs behind the graph." actions={<div className="rounded-xl bg-ink px-4 py-2.5 text-white"><span className="text-xs text-slate-400">BOM / unit</span><span className="ml-3 font-display font-semibold">{inr(total)}</span></div>} />
    <ScopeAnchor startup={startup} destination="Component cost" />
    <ModuleVisual startup={{ ...startup, bom: items }} module="bom" />
    <details className="card overflow-hidden" open={items.length === 0}>
      <summary className="cursor-pointer p-5 font-semibold">Edit components · {items.length} items</summary>
      <div className="border-t">
        <div className="hidden grid-cols-[1.2fr_.4fr_.65fr_.75fr_1fr_.6fr_40px] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:grid"><span>Component</span><span>Qty</span><span>Unit cost</span><span>Total</span><span>Supplier</span><span>Criticality</span><span /></div>
        <div className="divide-y">{items.map(item => <div key={item.id} className="grid gap-3 p-4 lg:grid-cols-[1.2fr_.4fr_.65fr_.75fr_1fr_.6fr_40px] lg:items-center"><Field label="Component" value={item.component} onChange={event => update(item.id, 'component', event.target.value)} /><Field label="Qty" type="number" min="0" value={item.quantity} onChange={event => update(item.id, 'quantity', +event.target.value)} /><Field label="Unit cost (₹)" type="number" min="0" value={item.unitCost} onChange={event => update(item.id, 'unitCost', +event.target.value)} /><div><span className="label">Total</span><div className="py-2.5 text-sm font-semibold">{inr(item.quantity * item.unitCost)}</div></div><Field label="Supplier type" value={item.supplierType} onChange={event => update(item.id, 'supplierType', event.target.value)} /><Select label="Criticality" value={item.criticality} onChange={event => update(item.id, 'criticality', event.target.value)}><option>Low</option><option>Medium</option><option>High</option></Select><IconDelete onClick={() => setItems(current => current.filter(entry => entry.id !== item.id))} /></div>)}</div>
        <div className="border-t bg-slate-50 p-4"><Button variant="secondary" onClick={add}><Plus className="h-4 w-4" />Add component</Button></div>
      </div>
    </details>
    <p className="mt-3 text-xs text-slate-500">Planning estimates only. Validate price, MOQ, lead time, duty and yield with suppliers.</p>
    <PageSaveBar saving={saving} onSave={doSave} />
  </>
}

export function BOMPage() { return <StartupPageState>{state => <BOM {...state} />}</StartupPageState> }
