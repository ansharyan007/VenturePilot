import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { StartupPageState } from '../components/StartupPageState'
import { Field, Metric, PageHeader } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import type { FinancialModel, Startup, StartupUpdate } from '../types'
import { calculateFinance, inr, number, sumBOM } from '../utils/calculations'
import { useToast } from '../context/ToastContext'
import { metricCoverage } from '../utils/workspacePlanning'

function Finance({ startup, save }: { startup: Startup; save: (u: StartupUpdate) => Promise<void> }) {
  const [model, setModel] = useState(startup.financials)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const bom = sumBOM(startup.bom)
  const calc = calculateFinance(model, bom)
  const coverage = metricCoverage({ ...startup, financials: model })
  const update = (key: keyof FinancialModel, value: number) => setModel(current => ({ ...current, [key]: value }))
  const doSave = async () => { setSaving(true); try { await save({ financials: model, expectedSellingPrice: model.sellingPrice, progress: Math.max(startup.progress, 74) }); toast('Financial model saved') } finally { setSaving(false) } }
  const unitParts = [
    { label: 'BOM', value: bom, color: 'bg-brand-600' }, { label: 'Build', value: model.manufacturingCost, color: 'bg-blue-500' },
    { label: 'Pack', value: model.packaging, color: 'bg-amber-500' }, { label: 'Ship', value: model.logistics, color: 'bg-violet-500' },
    { label: 'Contribution', value: Math.max(0, calc.grossProfitPerUnit), color: 'bg-emerald-400' },
  ]
  const maxMonthly = Math.max(1, calc.revenue, calc.cogs, calc.operatingExpenses, Math.abs(calc.operatingProfit))

  return <>
    <PageHeader eyebrow="Venture economics" title="Financial Model" description="Graphs update instantly from saved BOM and editable assumptions." actions={<span className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800"><Calculator className="h-4 w-4" />Calculated locally</span>} />
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Price" value={inr(model.sellingPrice)} /><Metric label="Unit cost" value={coverage.bom ? inr(calc.unitCost) : 'Not estimated'} /><Metric label="Gross margin" value={coverage.finance ? `${number(calc.grossMargin)}%` : 'Not estimated'} /><Metric label="Break-even" value={!coverage.finance || !hasOperatingCosts(model) ? 'Needs cost inputs' : calc.breakEvenUnits ? `${number(calc.breakEvenUnits)} units` : 'Not achievable'} /></div>

    {coverage.finance ? <div className="mb-5 grid gap-5 lg:grid-cols-2">
      <section className="card p-5"><h2 className="font-semibold">Where each sale goes</h2><div className="mt-5 flex h-10 overflow-hidden rounded-lg bg-slate-100">{unitParts.map(part => <span key={part.label} className={part.color} style={{ width: `${model.sellingPrice > 0 ? Math.min(100, part.value / model.sellingPrice * 100) : 0}%` }} title={`${part.label}: ${inr(part.value)}`} />)}</div><div className="mt-4 flex flex-wrap gap-3">{unitParts.map(part => <span key={part.label} className="flex items-center gap-1.5 text-xs"><i className={`h-2.5 w-2.5 rounded-sm ${part.color}`} />{part.label} {inr(part.value)}</span>)}</div>{calc.grossProfitPerUnit < 0 && <p className="mt-4 text-sm font-semibold text-red-700">Unit loss: {inr(Math.abs(calc.grossProfitPerUnit))}</p>}</section>
      <section className="card p-5"><h2 className="font-semibold">Monthly outcome</h2><div className="mt-5 space-y-3">{[{ label: 'Revenue', value: calc.revenue, color: 'bg-brand-600' }, { label: 'COGS', value: calc.cogs, color: 'bg-blue-500' }, { label: 'Operating cost', value: calc.operatingExpenses, color: 'bg-amber-500' }, { label: calc.operatingProfit >= 0 ? 'Profit' : 'Loss', value: Math.abs(calc.operatingProfit), color: calc.operatingProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500' }].map(item => <div key={item.label} className="grid grid-cols-[92px_1fr_100px] items-center gap-3 text-xs"><span>{item.label}</span><span className="h-6 overflow-hidden rounded bg-slate-100"><span className={`block h-full rounded ${item.color}`} style={{ width: `${item.value / maxMonthly * 100}%` }} /></span><strong className="text-right">{inr(item.value)}</strong></div>)}</div></section>
    </div> : <section className="card mb-5 p-5"><h2 className="font-semibold">Cost your product to see the financial charts</h2><p className="mt-2 text-sm text-slate-500">Use Fill missing sections above, or enter component costs in the BOM. A blank cost model cannot establish your margin.</p></section>}

    <details className="card p-5"><summary className="cursor-pointer font-semibold">Edit financial assumptions</summary><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{([['initialCapital', 'Initial capital'], ['sellingPrice', 'Selling price / unit'], ['manufacturingCost', 'Manufacturing / unit'], ['packaging', 'Packaging / unit'], ['logistics', 'Logistics / unit'], ['employeeExpenses', 'Employees / month'], ['rent', 'Rent / month'], ['marketing', 'Marketing / month'], ['technology', 'Technology / month'], ['compliance', 'Compliance / month'], ['otherExpenses', 'Other / month'], ['monthlySales', 'Expected units / month']] as const).map(([key, label]) => <Field key={key} label={`${label}${key === 'monthlySales' ? '' : ' (₹)'}`} type="number" min="0" value={model[key]} onChange={event => update(key, +event.target.value)} />)}</div><p className="mt-4 text-xs text-slate-500">BOM cost {inr(bom)} comes from the component workspace.</p></details>
    <PageSaveBar saving={saving} onSave={doSave} />
  </>
}

export function FinancePage() { return <StartupPageState>{state => <Finance {...state} />}</StartupPageState> }

const hasOperatingCosts = (model: FinancialModel) => model.employeeExpenses + model.rent + model.marketing + model.technology + model.compliance + model.otherExpenses > 0
