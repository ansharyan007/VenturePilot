import { useState } from 'react'
import { ArrowRight, Check, Circle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StartupPageState } from '../components/StartupPageState'
import { Badge, Button, Metric, PageHeader, Textarea } from '../components/ui'
import { calculateCapacity, calculateFinance, inr, number, sumBOM } from '../utils/calculations'
import { buildStartupJourney, journeyProgress } from '../utils/journey'
import type { IdeaAnalysis, Startup, StartupUpdate } from '../types'
import { useToast } from '../context/ToastContext'
import { metricCoverage } from '../utils/workspacePlanning'

function Overview({ startup, save }: { startup: Startup; save: (u: StartupUpdate) => Promise<void> }) {
  const { toast } = useToast()
  const [analysis, setAnalysis] = useState(startup.analysis)
  const [saving, setSaving] = useState(false)
  const finance = calculateFinance(startup.financials, sumBOM(startup.bom))
  const capacity = calculateCapacity(startup.manufacturing)
  const coverage = metricCoverage(startup)
  const estimate = startup.planningDraft ? 'Draft estimate · needs validation' : undefined
  const stages = buildStartupJourney(startup)
  const current = stages.find(stage => stage.status !== 'complete') || stages.at(-1)!
  const overall = journeyProgress(stages)
  const doSave = async () => { setSaving(true); try { await save({ analysis }); toast('Opportunity assumptions saved') } finally { setSaving(false) } }
  const setText = (key: keyof Omit<IdeaAnalysis, 'scores'>, value: string) => setAnalysis(valueBefore => ({ ...valueBefore, [key]: value }))

  return <>
    <PageHeader eyebrow={startup.isDemo ? 'DEMO DATA · Command center' : 'Command center'} title={startup.name} description={startup.idea} actions={<Badge tone="green">{startup.stage}</Badge>} />

    <section className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-700">Current focus · Stage {current.number}</p><h2 className="mt-1 text-xl font-semibold">{current.title}</h2></div><div className="text-right"><strong className="font-display text-3xl text-brand-800">{overall}%</strong><span className="block text-xs text-slate-500">workspace readiness</span></div></div>
      <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 sm:grid-cols-5 xl:grid-cols-9">{stages.map(stage => <Link key={stage.id} to={`/startup/${startup.id}/visual-plan`} className="group text-center"><span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${stage.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : stage.id === current.id ? 'bg-brand-700 text-white' : 'bg-white text-slate-500'}`}>{stage.status === 'complete' ? <Check className="h-4 w-4" /> : stage.number}</span><span className="mt-2 block truncate text-[10px] font-semibold text-slate-500 group-hover:text-brand-700">{stage.shortTitle}</span></Link>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-5"><p className="flex items-center gap-2 text-sm text-slate-600"><Circle className="h-4 w-4 text-amber-500" />Next: {current.checks.find(check => !check.complete)?.label || 'Review supporting evidence'}</p><Link className="btn-primary" to={`/startup/${startup.id}/visual-plan`}>Open journey <ArrowRight className="h-4 w-4" /></Link></div>
    </section>

    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="BOM / unit" value={coverage.bom ? inr(sumBOM(startup.bom)) : 'Not estimated'} detail={coverage.bom ? estimate : 'Add components and costs'} /><Metric label="Gross margin" value={coverage.finance ? `${number(finance.grossMargin)}%` : 'Not estimated'} detail={coverage.finance ? estimate : 'Needs a costed BOM and selling price'} /><Metric label="Monthly capacity" value={coverage.capacity ? number(capacity.realisticMonthly) : 'Not planned'} detail={coverage.capacity ? estimate : 'Set production or receiving throughput'} /><Metric label="Critical open risks" value={coverage.risks ? number(startup.risks.filter(risk => risk.status !== 'Resolved' && risk.probability * risk.impact >= 15).length) : 'Not assessed'} detail={coverage.risks ? estimate : 'An empty register does not mean zero risk'} /></div>

    <details className="card p-5"><summary className="cursor-pointer font-semibold">Edit opportunity assumptions</summary><div className="mt-5 grid gap-4 md:grid-cols-2">{([['concept', 'Concept'], ['problem', 'Problem'], ['targetCustomer', 'Target customer'], ['valueProposition', 'Value'], ['businessModel', 'Revenue model'], ['feasibility', 'Feasibility evidence']] as const).map(([key, label]) => <Textarea key={key} label={label} value={analysis[key]} onChange={event => setText(key, event.target.value)} />)}</div><div className="mt-5 flex items-center justify-between gap-3"><Link className="text-sm font-semibold text-brand-700" to={`/startup/${startup.id}/identity`}>See identity reasoning →</Link><Button loading={saving} onClick={doSave}>Save</Button></div></details>
  </>
}

export function OverviewPage() { return <StartupPageState>{state => <Overview {...state} />}</StartupPageState> }
