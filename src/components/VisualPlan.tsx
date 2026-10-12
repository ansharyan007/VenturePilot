import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight } from 'lucide-react'
import type { Startup } from '../types'
import { calculateCapacity, calculateFinance, inr, number, sumBOM } from '../utils/calculations'
import { metricCoverage } from '../utils/workspacePlanning'

export function StartupMap({ startup }: { startup: Startup }) {
  const [selected, setSelected] = useState('product')
  const marker = useId().replace(/:/g, '')
  const finance = calculateFinance(startup.financials, sumBOM(startup.bom))
  const coverage = metricCoverage(startup)
  const nodes = [
    { id: 'identity', title: 'Customer & idea', value: startup.targetCustomer || 'Define your customer', x: 15, y: 35 },
    { id: 'product', title: 'Product design', value: `${startup.product.specs.length} saved specifications`, x: 310, y: 35 },
    { id: 'bom', title: 'Components / BOM', value: coverage.bom ? `${inr(sumBOM(startup.bom))} per unit` : 'Costs not estimated', x: 605, y: 35 },
    { id: 'compliance', title: 'Compliance', value: `${startup.compliance.filter(i => i.status === 'Complete').length}/${startup.compliance.length} marked complete`, x: 15, y: 205 },
    { id: 'manufacturing', title: 'Manufacturing', value: coverage.capacity ? `${number(calculateCapacity(startup.manufacturing).realisticMonthly)} units / month` : 'Capacity not planned', x: 310, y: 205 },
    { id: 'finance', title: 'Unit economics', value: coverage.finance ? `${number(finance.grossMargin)}% gross margin` : 'Needs cost inputs', x: 605, y: 205 },
    { id: 'roadmap', title: 'Launch milestones', value: startup.launchTimeline || 'Set launch timing', x: 15, y: 375 },
    { id: 'distribution', title: 'Delivery to customer', value: `${startup.distribution.stages.length} distribution stages`, x: 310, y: 375 },
    { id: 'scaling', title: 'Scale the business', value: `${startup.scaling.length} planned stages`, x: 605, y: 375 },
  ]
  const edges = [
    ['identity', 'product', 'needs shape specs', false], ['product', 'bom', 'specs select parts', false],
    ['identity', 'compliance', 'market sets scope', false], ['product', 'manufacturing', 'design sets process', false],
    ['bom', 'finance', 'cost feeds calculation', true], ['compliance', 'manufacturing', 'review before release', false],
    ['manufacturing', 'finance', 'assembly cost', true], ['compliance', 'roadmap', 'approvals affect timing', false],
    ['manufacturing', 'distribution', 'output becomes stock', false], ['finance', 'scaling', 'margin informs growth', false],
    ['roadmap', 'distribution', 'launch opens channels', false], ['distribution', 'scaling', 'demand informs growth', false],
  ] as const
  const active = nodes.find(node => node.id === selected)!
  const connected = edges.filter(([from, to]) => from === selected || to === selected)
  return <section className="card my-5 overflow-hidden" aria-label="Startup relationship map">
    <div className="border-b p-5"><h2 className="text-lg font-semibold">How your startup fits together</h2><p className="mt-1 text-sm text-slate-500">Select a node to explore its connections. Values reflect saved planning data.</p><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600"><span>━━ Calculated dependency</span><span>┄┄ Planning relationship · requires review</span></div></div>
    <div className="overflow-x-auto bg-slate-50 p-4" tabIndex={0} aria-label="Scrollable relationship diagram">
      <div className="relative mx-auto h-[485px] w-[855px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 855 485" aria-hidden="true">
          <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#64748b" /></marker></defs>
          {edges.map(([from, to, label, calculated]) => {
            const a = nodes.find(n => n.id === from)!, b = nodes.find(n => n.id === to)!
            const horizontal = a.y === b.y
            const x1 = horizontal ? a.x + 225 : a.x + 112, y1 = horizontal ? a.y + 45 : a.y + 90
            const x2 = horizontal ? b.x - 4 : b.x + 112, y2 = horizontal ? b.y + 45 : b.y - 4
            const highlight = from === selected || to === selected
            return <g key={`${from}-${to}`} opacity={highlight ? 1 : 0.4}><path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={highlight ? '#059669' : '#64748b'} strokeWidth="2" strokeDasharray={calculated ? undefined : '5 4'} markerEnd={`url(#${marker})`} /><title>{label}</title></g>
          })}
        </svg>
        {nodes.map(node => <button key={node.id} type="button" aria-pressed={selected === node.id} onClick={() => setSelected(node.id)} style={{ left: node.x, top: node.y }} className={`absolute h-[90px] w-[225px] rounded-2xl border-2 p-4 text-left shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 ${selected === node.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-400'}`}><span className="block font-semibold text-slate-900">{node.title}</span><span className="mt-1 block truncate text-xs text-slate-600">{node.value}</span></button>)}
      </div>
    </div>
    <div className="p-5" aria-live="polite"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{active.title}: connected decisions</h3><Link to={`/startup/${startup.id}/${active.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">Open module <ArrowRight className="h-4 w-4" /></Link></div><ul className="mt-3 grid gap-2 sm:grid-cols-2">{connected.map(([from, to, label, calculated]) => <li className="rounded-xl bg-slate-50 p-3 text-sm" key={`${from}-${to}`}><span className="font-medium">{nodes.find(n => n.id === from)?.title} → {nodes.find(n => n.id === to)?.title}</span><span className="mt-1 block text-xs text-slate-500">{label} · {calculated ? 'used in financial formula' : 'planning link, no automatic update'}</span></li>)}</ul></div>
  </section>
}

export function ProcessFlow({ steps, title }: { title: string; steps: Array<{ title: string; detail: string }> }) {
  return <section className="card my-5 p-5"><h2 className="mb-4 font-semibold">{title}</h2>{steps.length ? <ol className="flex flex-col gap-3 md:flex-row md:overflow-x-auto md:pb-3">{steps.map((step, index) => <li key={index} className="flex items-center gap-3 md:min-w-[210px] md:flex-1"><div className="w-full rounded-xl border border-brand-100 bg-brand-50 p-4"><span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-xs text-white">{index + 1}</span><h3 className="text-sm font-semibold">{step.title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{step.detail}</p></div>{index < steps.length - 1 && <><ArrowRight className="hidden h-5 w-5 shrink-0 text-brand-600 md:block" /><ArrowDown className="h-5 w-5 shrink-0 text-brand-600 md:hidden" /></>}</li>)}</ol> : <p className="text-sm text-slate-500">Add stages to see the flow.</p>}</section>
}

export function CopilotMechanism() {
  return <ProcessFlow title="How agents build a reviewed result" steps={[
    { title: 'Route the decision', detail: 'The server chooses one or two specialists, or uses your explicit selection.' },
    { title: 'Vector retrieval', detail: 'Changed startup chunks are embedded with Ollama and persisted in SQLite. Relevant evidence is selected by cosine similarity.' },
    { title: 'Specialist models', detail: 'Each specialist receives a separate model context, retrieved evidence and deterministic financial calculations.' },
    { title: 'Independent reviewer', detail: 'The reviewer reads specialist findings and original evidence, highlighting unsupported claims and open questions.' },
    { title: 'Review and act', detail: 'Inspect sources, save the report and add selected actions to the roadmap. Live runs require the agent server and installed models.' },
  ]} />
}

export function EconomicsExplorer({ startup }: { startup: Startup }) {
  const [priceChange, setPriceChange] = useState(0)
  const [costChange, setCostChange] = useState(0)
  const bom = sumBOM(startup.bom) * (1 + costChange / 100)
  const model = { ...startup.financials, sellingPrice: startup.financials.sellingPrice * (1 + priceChange / 100) }
  const result = calculateFinance(model, bom)
  const parts = [['Components', bom], ['Assembly', model.manufacturingCost], ['Packaging', model.packaging], ['Logistics', model.logistics]] as const
  const colors = ['bg-emerald-600', 'bg-blue-500', 'bg-amber-500', 'bg-violet-500']
  if (!metricCoverage(startup).finance) return <section className="card my-5 p-5"><h2 className="font-semibold">Unit economics needs cost inputs</h2><p className="mt-2 text-sm text-slate-500">Fill the missing planning sections or add a costed BOM and selling price to explore margin and break-even.</p></section>
  return <section className="card my-5 p-5"><h2 className="text-lg font-semibold">See what a decision changes</h2><p className="mt-1 text-sm text-slate-500">Explore price and component costs. This simulation does not save changes.</p><div className="my-5 grid gap-5 sm:grid-cols-2">{[['Selling price change', priceChange, setPriceChange], ['Component cost change', costChange, setCostChange]].map(([label, value, setter]) => <label key={String(label)} className="text-sm font-medium">{String(label)}: {Number(value) > 0 ? '+' : ''}{Number(value)}%<input className="mt-3 block w-full accent-emerald-600" type="range" min="-50" max="50" step="1" value={Number(value)} onChange={e => (setter as (n: number) => void)(Number(e.target.value))} /></label>)}</div>
    <div className="flex h-8 overflow-hidden rounded-lg" aria-label="Unit cost composition">{parts.map(([label, value], i) => <div key={label} title={`${label}: ${inr(value)}`} className={colors[i]} style={{ width: `${result.unitCost > 0 ? Math.max(0, value) / result.unitCost * 100 : 0}%` }} />)}</div><div className="mt-3 flex flex-wrap gap-4 text-xs">{parts.map(([label, value], i) => <span key={label} className="flex items-center gap-2"><span className={`h-3 w-3 rounded ${colors[i]}`} />{label}: {inr(value)}</span>)}</div>
    <ProcessFlow title="The calculation" steps={[
      { title: `Unit cost ${inr(result.unitCost)}`, detail: 'Components + assembly + packaging + logistics' },
      { title: `Contribution ${inr(result.grossProfitPerUnit)}`, detail: `${inr(model.sellingPrice)} selling price − ${inr(result.unitCost)} unit cost` },
      { title: `${number(result.grossMargin)}% gross margin`, detail: 'Contribution ÷ selling price × 100' },
      { title: result.grossProfitPerUnit > 0 ? `${number(result.breakEvenUnits)} units to break even` : 'Break-even unavailable', detail: result.grossProfitPerUnit > 0 ? `${inr(result.operatingExpenses)} monthly expenses ÷ contribution, rounded up` : 'Unit contribution must be positive.' },
    ]} /><button type="button" className="btn-secondary" onClick={() => { setPriceChange(0); setCostChange(0) }}>Reset to saved assumptions</button>
  </section>
}
