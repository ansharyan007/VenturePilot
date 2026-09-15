import { StartupPageState } from '../components/StartupPageState'
import { CopilotMechanism, EconomicsExplorer, ProcessFlow, StartupMap } from '../components/VisualPlan'
import { PageHeader } from '../components/ui'

export function VisualPlanPage() {
  return <StartupPageState>{({ startup }) => <>
    <PageHeader eyebrow="Explore the connections" title="Visual startup plan" description="Follow your idea from customer needs to launch. Explore the decisions, calculations and evidence behind your plan." />
    <StartupMap startup={startup} />
    <EconomicsExplorer startup={startup} />
    <ProcessFlow title="Supply chain: how the product moves" steps={startup.supplyChain.map(stage => ({ title: stage.name, detail: stage.purpose || 'Purpose not specified' }))} />
    <ProcessFlow title="People → execution → risk review" steps={[
      { title: `${startup.team.length} planned roles`, detail: startup.team.slice(0, 3).map(role => role.role).join(', ') || 'Add your team roles.' },
      { title: `${startup.roadmap.length} milestones`, detail: 'Assign responsibility and check dependencies before advancing each milestone.' },
      { title: `${startup.risks.filter(risk => risk.status !== 'Resolved').length} unresolved risks`, detail: 'Review probability × impact scores and mitigations before launch. Team-to-milestone assignments require manual review.' },
    ]} />
    <ProcessFlow title="Launch roadmap · saved order and timing" steps={startup.roadmap.map(milestone => ({ title: milestone.name, detail: `${milestone.timing} · ${milestone.status}` }))} />
    <CopilotMechanism />
  </>}</StartupPageState>
}
