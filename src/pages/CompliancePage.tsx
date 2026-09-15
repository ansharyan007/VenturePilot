import { useState } from 'react'
import { AlertTriangle, Database, ExternalLink, Plus } from 'lucide-react'
import { StartupPageState } from '../components/StartupPageState'
import { Badge, Button, Field, IconDelete, PageHeader, Progress, Select, Textarea } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import type { ComplianceItem, Startup, StartupUpdate } from '../types'
import { useToast } from '../context/ToastContext'
import { ComplianceWorkbench } from '../components/ComplianceWorkbench'
import { mergeProposals } from '../services/decisionWorkflow'
import { COMPLIANCE_KNOWLEDGE_VERSION } from '../data/complianceKnowledge'
import { ProcessFlow } from '../components/VisualPlan'

function Compliance({ startup, save }: { startup: Startup; save: (update: StartupUpdate) => Promise<void> }) {
  const [items, setItems] = useState(startup.compliance)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const complete = items.filter((item) => item.status === 'Complete').length

  const update = (id: string, key: keyof ComplianceItem, value: string) =>
    setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item))

  const doSave = async () => {
    setSaving(true)
    try {
      await save({ compliance: items, progress: Math.max(startup.progress, 68) })
      toast('Compliance checklist saved')
    } catch {
      toast('Could not save. Your checklist edits remain here; try again.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <PageHeader
      eyebrow="Readiness"
      title="Compliance & Regulatory Checklist"
      description="Retrieve potentially applicable obligations from a curated Government of India knowledge base, then track the evidence needed to close them."
      actions={<div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">India planning view</Badge>
      </div>}
    />

    <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex gap-3"><AlertTriangle className="mt-1 h-5 w-5 shrink-0" /><div><strong>Planning guidance, not legal advice.</strong> Requirements and applicability can change. Verify the exact product and business facts with the official regulator and qualified legal/tax professionals.</div></div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-xs text-slate-600">
        <Database className="h-5 w-5 text-brand-600" />
        <div><strong className="block text-slate-800">Bundled source summaries</strong>Snapshot {COMPLIANCE_KNOWLEDGE_VERSION}; applicability requires review</div>
      </div>
    </div>

    <ComplianceWorkbench key={startup.id} startup={startup} onAdd={proposals => setItems(current => mergeProposals(current, proposals))} />
    <ProcessFlow title="From evidence to launch review" steps={[
      { title: 'Product & market', detail: `${startup.category} · ${startup.founder.country}. Confirm the exact model, location and business role.` },
      { title: 'Official evidence', detail: 'The checklist builder selects bundled government summaries using category and specifications. Each sourced item links to the original document.' },
      { title: 'Review applicability', detail: 'Read the linked source, check current requirements and record the next action. Generated items start as unconfirmed.' },
      { title: 'Track completion', detail: `${complete} of ${items.length} items marked complete. Status is entered by you; it is not regulatory approval.` },
    ]} />
    <div className="card mb-5 p-5">
      <div className="flex justify-between text-sm"><span className="font-semibold">Checklist progress</span><span>{complete} of {items.length} complete</span></div>
      <Progress className="mt-3" value={items.length ? complete / items.length * 100 : 0} />
    </div>

    <div className="space-y-4">
      {items.map((item) => <details key={item.id} className="card p-5">
        <summary className="mb-4 cursor-pointer font-semibold">{item.name} · {item.status}{item.owner ? ` · ${item.owner}` : ' · Owner unassigned'}</summary>
        <div className="grid gap-4 md:grid-cols-[1fr_.65fr_.65fr_auto]">
          <Field label="Planning area" value={item.name} onChange={(event) => update(item.id, 'name', event.target.value)} />
          <Select label="Status" value={item.status} onChange={(event) => update(item.id, 'status', event.target.value)}>
            {['Not started', 'In progress', 'Complete', 'Not applicable'].map((status) => <option key={status}>{status}</option>)}
          </Select>
          <Select label="Importance" value={item.importance} onChange={(event) => update(item.id, 'importance', event.target.value)}>
            <option>Low</option><option>Medium</option><option>High</option>
          </Select>
          <div className="pt-6"><IconDelete onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} /></div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Action owner" value={item.owner ?? ''} onChange={event => update(item.id, 'owner', event.target.value)} />
          <Select label="Applicability decision" value={item.applicability ?? 'Needs review'} onChange={event => update(item.id, 'applicability', event.target.value)}><option>Needs review</option><option>Applicable</option><option>Not applicable</option></Select>
          <Textarea label="Evidence / review reference" value={item.evidenceNote ?? ''} onChange={event => update(item.id, 'evidenceNote', event.target.value)} />
          <Textarea label="Description" value={item.description} onChange={(event) => update(item.id, 'description', event.target.value)} />
          <Textarea label="Suggested next action" value={item.nextAction} onChange={(event) => update(item.id, 'nextAction', event.target.value)} />
        </div>
        {item.sourceUrl && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
          <a className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline" href={item.sourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />{item.sourceTitle ?? 'Official government source'}
          </a>
          {item.lastVerified && <span className="text-slate-500">Source snapshot {item.lastVerified}</span>}
        </div>}
      </details>)}
    </div>

    <Button variant="secondary" className="mt-4" onClick={() => setItems((current) => [...current, { id: crypto.randomUUID(), name: 'New requirement', status: 'Not started', importance: 'Medium', description: '', nextAction: '' }])}>
      <Plus className="h-4 w-4" />Add checklist item
    </Button>
    <PageSaveBar saving={saving} onSave={doSave} />
  </>
}

export function CompliancePage() {
  return <StartupPageState>{(state) => <Compliance {...state} />}</StartupPageState>
}
