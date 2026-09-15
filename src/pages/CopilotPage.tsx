import { StartupPageState } from '../components/StartupPageState'
import { AgentWorkbench } from '../components/AgentWorkbench'
import { PageHeader } from '../components/ui'
import { ScopeAnchor } from '../components/ScopeAnchor'

export function CopilotPage() {
  return <StartupPageState>{({ startup, save }) => <>
    <PageHeader eyebrow="Decisions with evidence" title="Startup Copilot" description="Bring a decision to the specialists. See the evidence they retrieved, their separate findings, the reviewer’s concerns, and actions you can add to your plan." />
    <ScopeAnchor startup={startup} destination="Specialist review" />
    <AgentWorkbench startup={startup} save={save} />
    {startup.conversations.length > 0 && <details className="card p-5"><summary className="cursor-pointer font-semibold">Earlier conversation history ({startup.conversations.length})</summary><div className="mt-4 space-y-3">{startup.conversations.map(message => <article key={message.id} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{message.role} · {new Date(message.createdAt).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap text-sm">{message.content}</p></article>)}</div></details>}
  </>}</StartupPageState>
}
