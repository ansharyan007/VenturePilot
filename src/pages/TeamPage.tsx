import { useState } from 'react'
import { Plus, Users, ArrowRight } from 'lucide-react'
import { StartupPageState } from '../components/StartupPageState'
import { Button, Field, IconDelete, Metric, PageHeader, Select } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import type { Startup, StartupUpdate, TeamRole } from '../types'
import { inr } from '../utils/calculations'
import { canReportTo } from '../utils/planning'
import { useToast } from '../context/ToastContext'

const stages = ['Now', 'Prototype', 'Pre-launch', 'Launch', 'Scale']
function Team({ startup, save }: { startup: Startup; save: (u: StartupUpdate) => Promise<void> }) {
  const [roles, setRoles] = useState(startup.team)
  const [stage, setStage] = useState('All')
  const [saving, setSaving] = useState(false)
  const [syncBudget, setSyncBudget] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const payroll = roles.reduce((sum, role) => sum + role.salary, 0)
  const hiringStages = [...new Set([...stages, ...roles.map(r => r.hiringStage)])]
  const filtered = stage === 'All' ? roles : roles.filter(r => r.hiringStage === stage)
  const update = (id: string, patch: Partial<TeamRole>) => {
    if (patch.reportsTo && !canReportTo(roles, id, patch.reportsTo)) { setError('That reporting relationship would create a cycle.'); return }
    setRoles(current => current.map(r => r.id === id ? { ...r, ...patch } : r)); setError('')
  }
  const doSave = async () => { setSaving(true); try { await save({ team: roles, ...(syncBudget ? { financials: { ...startup.financials, employeeExpenses: payroll } } : {}) }); toast('Team plan saved'); setError('') } catch { setError('Could not save. Your edits are still here.') } finally { setSaving(false) } }
  return <>
    <PageHeader eyebrow="People & ownership" title="Team Builder" description="Place roles into hiring stages, connect reporting relationships and see the payroll impact." actions={<Button onClick={() => setRoles(current => [...current, { id: crypto.randomUUID(), role: 'New role', salary: 0, hiringStage: stage === 'All' ? 'Prototype' : stage, notes: '', hiringStatus: 'Planned' }])}><Plus className="h-4 w-4" />Add role</Button>} />
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><Metric label="Roles / filled" value={`${roles.length} / ${roles.filter(r => r.hiringStatus === 'Filled').length}`} /><Metric label="Full-plan payroll / month" value={inr(payroll)} /><Metric label="Finance payroll budget" value={inr(startup.financials.employeeExpenses)} detail={`${inr(payroll - startup.financials.employeeExpenses)} difference from full plan`} /></div>
    <section className="card mb-5 p-5"><h2 className="font-semibold">Hiring runway · payroll by stage</h2><div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">{hiringStages.map(s => { const members = roles.filter(r => r.hiringStage === s), amount = members.reduce((sum, r) => sum + r.salary, 0); return <button key={s} type="button" aria-pressed={stage === s} onClick={() => setStage(stage === s ? 'All' : s)} className={`rounded-xl border p-4 text-left ${stage === s ? 'border-brand-500 bg-brand-50' : 'bg-slate-50'}`}><h3 className="font-semibold">{s}</h3><p className="my-2 text-xs">{members.length} roles · {inr(amount)}/month</p><div className="h-2 rounded bg-slate-200"><div className="h-full rounded bg-brand-600" style={{ width: `${payroll ? amount / payroll * 100 : 0}%` }} /></div></button> })}</div><button className="mt-3 text-sm font-semibold text-brand-700" onClick={() => setStage('All')}>Show all roles</button></section>
    <section className="card mb-5 p-5"><h2 className="font-semibold">Reporting relationships</h2><p className="mt-1 text-xs text-slate-500">Connections use your manager assignments. Unassigned roles are not assumed to report to the founder.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{roles.map(r => <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-3 text-sm" key={r.id}><Users className="h-4 w-4 shrink-0 text-brand-600" /><span>{roles.find(manager => manager.id === r.reportsTo)?.role || 'Manager unassigned'}</span><ArrowRight className="h-4 w-4 shrink-0" /><span className="font-semibold">{r.role}</span></div>)}</div>{!roles.length && <p className="mt-3 text-sm">Add your first role to build the organization.</p>}</section>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(r => <article key={r.id} className="card p-5"><div className="flex justify-between"><h2 className="font-semibold">{r.role}</h2><IconDelete label={`Delete ${r.role}`} onClick={() => setRoles(current => current.filter(role => role.id !== r.id).map(role => role.reportsTo === r.id ? { ...role, reportsTo: '' } : role))} /></div><p className="mb-3 text-sm text-slate-500">{inr(r.salary)}/month · {r.hiringStage}</p><div className="space-y-3"><Select label="Move to hiring stage" value={r.hiringStage} onChange={e => update(r.id, { hiringStage: e.target.value })}>{hiringStages.map(s => <option key={s}>{s}</option>)}</Select><Select label="Hiring status" value={r.hiringStatus || 'Planned'} onChange={e => update(r.id, { hiringStatus: e.target.value as TeamRole['hiringStatus'] })}><option>Planned</option><option>Recruiting</option><option>Filled</option></Select><Select label="Reports to" value={r.reportsTo || ''} onChange={e => update(r.id, { reportsTo: e.target.value })}><option value="">Unassigned / top-level role</option>{roles.filter(manager => canReportTo(roles, r.id, manager.id)).map(manager => <option key={manager.id} value={manager.id}>{manager.role}</option>)}</Select></div><details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-brand-700">Edit role, salary and responsibilities</summary><div className="mt-3 space-y-3"><Field label="Role" value={r.role} onChange={e => update(r.id, { role: e.target.value })} /><Field label="Monthly salary (INR)" type="number" min="0" value={r.salary} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 0) update(r.id, { salary: value }) }} /><Field label="Responsibilities / notes" value={r.notes} onChange={e => update(r.id, { notes: e.target.value })} /></div></details></article>)}</div>
    <label className="my-5 flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm"><input type="checkbox" checked={syncBudget} onChange={e => setSyncBudget(e.target.checked)} />On save, replace Finance’s monthly employee expense with the full planned payroll ({inr(payroll)}). This includes all hiring stages.</label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}<PageSaveBar saving={saving} onSave={doSave} />
  </>
}
export function TeamPage() { return <StartupPageState>{state => <Team {...state} />}</StartupPageState> }
