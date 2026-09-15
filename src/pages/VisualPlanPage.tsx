import { StartupPageState } from '../components/StartupPageState'
import { StartupJourney } from '../components/StartupJourney'
import { PageHeader } from '../components/ui'

export function VisualPlanPage() {
  return <StartupPageState>{({ startup }) => <>
    <PageHeader eyebrow="Stage 1 to responsible scale" title="Startup journey" description="See where you are, what each stage needs, how decisions connect, and what must happen next." />
    <StartupJourney startup={startup} />
  </>}</StartupPageState>
}
