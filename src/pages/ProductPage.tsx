import { useState } from 'react'
import { ArrowRight, Check, Circle, Plus } from 'lucide-react'
import { StartupPageState } from '../components/StartupPageState'
import { Button, Field, IconDelete, PageHeader, Textarea } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import { ScopeAnchor } from '../components/ScopeAnchor'
import type { ProductPlan, Startup, StartupUpdate } from '../types'
import { useToast } from '../context/ToastContext'

type StrategyKey = Exclude<keyof ProductPlan, 'specs'>
const strategy: Array<{ key: StrategyKey; label: string; hint: string }> = [
  { key: 'mvp', label: 'MVP', hint: 'The smallest product that can test the core value.' },
  { key: 'technicalRequirements', label: 'Requirements', hint: 'Measurable technical and operating constraints.' },
  { key: 'differentiators', label: 'Difference', hint: 'Why the target customer chooses this product.' },
  { key: 'futureProducts', label: 'Later', hint: 'Ideas intentionally excluded from the first release.' },
]

function Product({ startup, save }: { startup: Startup; save: (u: StartupUpdate) => Promise<void> }) {
  const [product, setProduct] = useState<ProductPlan>(startup.product)
  const [selected, setSelected] = useState<StrategyKey>('mvp')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const active = strategy.find(item => item.key === selected)!
  const updateSpec = (id: string, key: 'name' | 'value' | 'notes', value: string) => setProduct(current => ({ ...current, specs: current.specs.map(item => item.id === id ? { ...item, [key]: value } : item) }))
  const completeSpecs = product.specs.filter(spec => spec.name.trim() && spec.value.trim()).length
  const definitionCoverage = Math.round(([product.mvp, product.technicalRequirements, product.differentiators].filter(value => value.trim()).length + Math.min(1, completeSpecs)) / 4 * 100)
  const doSave = async () => { setSaving(true); try { await save({ product, progress: Math.max(startup.progress, 30) }); toast('Product blueprint saved') } finally { setSaving(false) } }

  return <>
    <PageHeader eyebrow="Product logic" title="Product Blueprint" description="Keep every product decision tied to the original venture scope." />
    <ScopeAnchor startup={startup} destination="Product definition" />

    <section className="card mb-5 p-5">
      <div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Definition flow</h2><p className="mt-1 text-xs text-slate-500">Customer need → MVP → requirements → specification → build</p></div><strong className="font-display text-2xl text-brand-800">{definitionCoverage}%</strong></div>
      <div className="my-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${definitionCoverage}%` }} /></div>
      <div className="grid gap-2 sm:grid-cols-4">{strategy.map((item, index) => <div className="flex items-center gap-2" key={item.key}><button type="button" aria-pressed={selected === item.key} onClick={() => setSelected(item.key)} className={`min-w-0 flex-1 rounded-xl border p-3 text-left ${selected === item.key ? 'border-brand-600 bg-brand-50' : 'bg-white'}`}><span className="flex items-center justify-between text-sm font-semibold">{item.label}{product[item.key].trim() ? <Check className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-300" />}</span></button>{index < strategy.length - 1 && <ArrowRight className="hidden h-4 w-4 shrink-0 text-brand-400 sm:block" />}</div>)}</div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="mb-3 text-xs text-slate-500">{active.hint}</p><Textarea label={active.label} value={product[selected]} onChange={event => setProduct({ ...product, [selected]: event.target.value })} /></div>
    </section>

    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">{startup.category} specifications</h2><p className="mt-1 text-xs text-slate-500">{completeSpecs}/{product.specs.length} measurable targets complete</p></div><Button variant="secondary" onClick={() => setProduct(current => ({ ...current, specs: [...current.specs, { id: crypto.randomUUID(), name: '', value: '', notes: '' }] }))}><Plus className="h-4 w-4" />Add specification</Button></div>
      {product.specs.length > 0 ? <details className="p-5" open={product.specs.length <= 4}><summary className="cursor-pointer text-sm font-semibold text-brand-700">Edit {product.specs.length} specification{product.specs.length === 1 ? '' : 's'}</summary><div className="mt-4 space-y-3">{product.specs.map(spec => <div key={spec.id} className="grid items-end gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[.8fr_1.2fr_1fr_auto]"><Field label="Specification" value={spec.name} onChange={event => updateSpec(spec.id, 'name', event.target.value)} /><Field label="Target" value={spec.value} onChange={event => updateSpec(spec.id, 'value', event.target.value)} /><Field label="Evidence / notes" value={spec.notes} onChange={event => updateSpec(spec.id, 'notes', event.target.value)} /><IconDelete onClick={() => setProduct(current => ({ ...current, specs: current.specs.filter(item => item.id !== spec.id) }))} /></div>)}</div></details> : <div className="p-8 text-center text-sm text-slate-500">Add only specifications that belong to this {startup.category.toLowerCase()} idea.</div>}
    </section>
    <PageSaveBar saving={saving} onSave={doSave} />
  </>
}

export function ProductPage() { return <StartupPageState>{state => <Product {...state} />}</StartupPageState> }
