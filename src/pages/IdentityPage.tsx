import { useState } from 'react'
import { ArrowDown, Check, Circle, GitBranch } from 'lucide-react'
import { StartupPageState } from '../components/StartupPageState'
import { PageHeader, Textarea } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import { ScopeAnchor } from '../components/ScopeAnchor'
import type { Identity, Startup, StartupUpdate } from '../types'
import { useToast } from '../context/ToastContext'

type IdentityKey = keyof Identity
const definitions: Array<{ key: IdentityKey; label: string; group: 'Evidence' | 'Logic' | 'Direction'; sources: string[]; hint: string }> = [
  { key: 'customerPersona', label: 'Customer', group: 'Evidence', sources: ['Initial target customer'], hint: 'The exact buyer or user whose problem you are solving.' },
  { key: 'targetMarket', label: 'Market', group: 'Evidence', sources: ['Initial target market', 'Launch geography'], hint: 'The reachable segment and geography for this venture.' },
  { key: 'problem', label: 'Problem', group: 'Logic', sources: ['Original idea', 'Customer'], hint: 'The measurable customer pain—not a description of the product.' },
  { key: 'solution', label: 'Solution', group: 'Logic', sources: ['Problem', 'Initial product description'], hint: 'How the venture resolves the stated problem.' },
  { key: 'valueProposition', label: 'Value', group: 'Logic', sources: ['Problem', 'Solution', 'Customer'], hint: 'Why this customer should choose the solution.' },
  { key: 'businessModel', label: 'Revenue', group: 'Logic', sources: ['Value', 'Customer', 'Market'], hint: 'Who pays, for what, and how the venture earns.' },
  { key: 'mission', label: 'Mission', group: 'Direction', sources: ['Value', 'Market'], hint: 'What the company does now, for whom, and why.' },
  { key: 'vision', label: 'Vision', group: 'Direction', sources: ['Problem', 'Mission'], hint: 'The future change the company wants to create.' },
  { key: 'brandPositioning', label: 'Positioning', group: 'Direction', sources: ['Category', 'Value', 'Product differentiators'], hint: 'The distinct place the venture should own in the customer’s mind.' },
]

function sourceValue(source: string, startup: Startup, identity: Identity) {
  const values: Record<string, string> = {
    'Original idea': startup.idea, 'Initial target customer': startup.targetCustomer,
    'Initial target market': startup.targetMarket, 'Launch geography': startup.geographicMarket,
    'Initial product description': startup.description, Category: startup.category,
    Customer: identity.customerPersona, Market: identity.targetMarket, Problem: identity.problem,
    Solution: identity.solution, Value: identity.valueProposition, Mission: identity.mission,
    'Product differentiators': startup.product.differentiators,
  }
  return values[source] || ''
}

function IdentityView({ startup, save }: { startup: Startup; save: (u: StartupUpdate) => Promise<void> }) {
  const [identity, setIdentity] = useState(startup.identity)
  const [selected, setSelected] = useState<IdentityKey>('problem')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const active = definitions.find(item => item.key === selected)!
  const update = (value: string) => setIdentity(current => ({ ...current, [selected]: value }))
  const doSave = async () => { setSaving(true); try { await save({ identity, progress: Math.max(startup.progress, 24) }); toast('Startup identity saved') } finally { setSaving(false) } }

  return <>
    <PageHeader eyebrow="Foundation logic" title="Startup Identity" description="See the reasoning chain behind every statement. Select a node to inspect its source inputs and edit it." />
    <ScopeAnchor startup={startup} destination="Identity logic" />
    <section className="card overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          {(['Evidence', 'Logic', 'Direction'] as const).map((group, groupIndex) => <div key={group}>
            {groupIndex > 0 && <ArrowDown className="mx-auto my-2 h-5 w-5 text-brand-400" aria-hidden="true" />}
            <div className="mb-2 flex items-center gap-2"><GitBranch className="h-4 w-4 text-brand-600" /><h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group}</h2></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{definitions.filter(item => item.group === group).map(item => <button type="button" key={item.key} aria-pressed={selected === item.key} onClick={() => setSelected(item.key)} className={`rounded-xl border p-3 text-left ${selected === item.key ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'bg-white hover:border-brand-300'}`}><span className="flex items-center justify-between gap-2 text-sm font-semibold">{item.label}{identity[item.key].trim() ? <Check className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-300" />}</span><span className="mt-1 block truncate text-xs text-slate-500">{identity[item.key] || 'Needs definition'}</span></button>)}</div>
          </div>)}
        </div>
        <div className="rounded-2xl bg-slate-50 p-5" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-700">{active.label}</p>
          <p className="mt-2 text-sm text-slate-600">{active.hint}</p>
          <div className="my-4"><p className="mb-2 text-xs font-semibold text-slate-500">Ground it in</p><div className="space-y-2">{active.sources.map(source => <div className="rounded-lg bg-white p-3" key={source}><span className="text-[10px] font-bold uppercase text-slate-400">{source}</span><p className="mt-1 line-clamp-2 text-xs text-slate-700">{sourceValue(source, startup, identity) || 'Source input is still empty'}</p></div>)}</div></div>
          <Textarea label={`Edit ${active.label}`} value={identity[selected]} onChange={event => update(event.target.value)} />
          <p className="mt-3 text-xs text-slate-500">These links explain the intended basis. The statement remains a founder hypothesis until supported by evidence.</p>
        </div>
      </div>
    </section>
    <PageSaveBar saving={saving} onSave={doSave} />
  </>
}

export function IdentityPage() { return <StartupPageState>{state => <IdentityView {...state} />}</StartupPageState> }
