import { Link } from 'react-router-dom'
import { StartupPageState } from '../components/StartupPageState'
import { AgentWorkbench } from '../components/AgentWorkbench'
import { ProcessFlow } from '../components/VisualPlan'
import { PageHeader } from '../components/ui'

export function CopilotPage() {
  return <StartupPageState>{({ startup, save }) => <>
    <PageHeader eyebrow="Decisions with evidence" title="Startup Copilot" description="Bring a decision to the specialists. See the evidence they retrieved, their separate findings, the reviewer’s concerns, and actions you can add to your plan." />
    <ProcessFlow title="A bounded multi-agent run" steps={[
      { title: 'Route', detail: 'Choose the relevant specialist, or let the router select up to two.' },
      { title: 'Retrieve', detail: 'Embed changed startup sections, search persistent vectors and include financial calculations.' },
      { title: 'Specialists', detail: 'Separate LLM contexts produce structured findings, actions and evidence references.' },
      { title: 'Reviewer', detail: 'A separate agent receives their findings and original evidence, then identifies gaps and conflicts.' },
      { title: 'Your decision', detail: 'Inspect the report and selectively add actions to your roadmap.' },
    ]} />
    <AgentWorkbench startup={startup} save={save} />
    <div className="card my-5 p-5"><h2 className="font-semibold">Explore without a model</h2><p className="my-3 text-sm text-slate-500">The local decision checks, visual plan, cost simulator and compliance evidence workbench remain available while models are offline.</p><Link className="btn-secondary" to={`/startup/${startup.id}/visual-plan`}>Open visual plan and simulator</Link></div>
    {startup.conversations.length > 0 && <details className="card p-5"><summary className="cursor-pointer font-semibold">Earlier conversation history ({startup.conversations.length})</summary><div className="mt-4 space-y-3">{startup.conversations.map(message => <article key={message.id} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{message.role} · {new Date(message.createdAt).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap text-sm">{message.content}</p></article>)}</div></details>}
  </>}</StartupPageState>
}
