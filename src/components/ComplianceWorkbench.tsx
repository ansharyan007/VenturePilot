import { useState } from 'react'
import { Button, Field, Select } from './ui'
import { ProcessFlow } from './VisualPlan'
import { proposalToItem, runComplianceReview, type ReviewFacts, type ComplianceReview } from '../services/decisionWorkflow'
import type { ComplianceItem, Startup } from '../types'

export function ComplianceWorkbench({ startup, onAdd }: { startup: Startup; onAdd: (items: ComplianceItem[]) => void }) {
  const [facts, setFacts] = useState<ReviewFacts>({ market: 'Unknown', wireless: 'Unknown', role: 'Unknown', packaged: 'Unknown' })
  const [review, setReview] = useState<ComplianceReview | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [owner, setOwner] = useState('')
  const [note, setNote] = useState('')
  const [notice, setNotice] = useState('')
  const controls = [ ['market', 'Sales market', ['Unknown', 'India', 'Other']], ['wireless', 'Wireless hardware', ['Unknown', 'Yes', 'No']], ['role', 'Business role', ['Unknown', 'Brand owner', 'Importer', 'Manufacturer']], ['packaged', 'Retail packaged goods', ['Unknown', 'Yes', 'No']] ] as const
  return <section className="card mb-6 p-5">
    <h2 className="text-lg font-semibold">Build an evidence-backed action plan</h2>
    <p className="mt-2 text-sm text-slate-500">Confirm facts → inspect evidence → select review actions → assign an owner. Saved category: {startup.category}; {startup.product.specs.length} product specifications.</p>
    <div className="my-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{controls.map(([key, label, options]) => <Select key={key} label={label} value={facts[key]} onChange={event => { setFacts({ ...facts, [key]: event.target.value }); setReview(null); setSelected([]); setNotice('Facts changed. Run the review again.')}}>{options.map(option => <option key={option}>{option}</option>)}</Select>)}</div>
    <Button onClick={() => { setReview(runComplianceReview(startup, facts)); setSelected([]); setNotice('Review complete. Select the actions you want to add. No checklist changes have been saved.') }}>Build with compliance RAG</Button>
    <p role="status" className="mt-3 text-sm text-brand-700">{notice}</p>
    {review && <>
      <ProcessFlow title="This run: worker handoffs" steps={review.steps.map(step => ({ title: step.name, detail: `${step.input} → ${step.output}. ${step.method}.` }))} />
      {review.gaps.length > 0 && <ul className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{review.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul>}
      <div className="grid gap-4 lg:grid-cols-2">{review.candidates.map(candidate => <article key={candidate.source.id} className={`rounded-xl border-2 p-4 ${selected.includes(candidate.source.id) ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
        <label className="flex items-start gap-3 font-semibold"><input className="mt-1" type="checkbox" checked={selected.includes(candidate.source.id)} onChange={event => setSelected(current => event.target.checked ? [...current, candidate.source.id] : current.filter(id => id !== candidate.source.id))} />{candidate.source.title}</label>
        <dl className="mt-4 space-y-3 text-sm"><div><dt className="font-medium text-slate-500">Why it appeared</dt><dd>{candidate.reason}</dd></div><div><dt className="font-medium text-slate-500">Decision needed</dt><dd>{candidate.question}</dd></div><div><dt className="font-medium text-slate-500">Proposed action</dt><dd>{candidate.action}</dd></div></dl>
        <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium text-brand-700">Inspect retrieved evidence</summary><p className="my-3">{candidate.source.content}</p><p className="text-xs text-slate-500">Product tag matches: {candidate.matched.join(', ') || 'General business topic; no matching product tags'}. Bundled snapshot: {candidate.source.lastVerified}. Current applicability unverified.</p><a href={candidate.source.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-brand-700 underline">Open original source</a></details>
      </article>)}</div>
      {review.candidates.length > 0 && <div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="mb-4 grid gap-4 sm:grid-cols-2"><Field label="Action owner (optional)" value={owner} onChange={e => setOwner(e.target.value)} /><Field label="Evidence / review reference (optional)" value={note} onChange={e => setNote(e.target.value)} /></div><Button disabled={!selected.length} onClick={() => { onAdd(review.candidates.filter(c => selected.includes(c.source.id)).map(c => proposalToItem(c, owner, note))); setSelected([]); setNotice('Selected actions merged into the checklist below. Existing entries were preserved. Use Save to persist changes.') }}>Add {selected.length} selected review actions</Button></div>}
    </>}
  </section>
}
