import type { Startup } from '../types'
import { calculateFinance, sumBOM } from './calculations'

export type JourneyModule = 'identity' | 'product' | 'bom' | 'supply-chain' | 'manufacturing' | 'compliance' | 'finance' | 'team' | 'risks' | 'distribution' | 'roadmap' | 'scaling'
export type JourneyStatus = 'complete' | 'in-progress' | 'not-started'

export interface JourneyCheck { label: string; complete: boolean }
export interface JourneyStage {
  id: string
  number: number
  title: string
  shortTitle: string
  purpose: string
  input: string
  work: string
  output: string
  modules: JourneyModule[]
  checks: JourneyCheck[]
  percent: number
  status: JourneyStatus
  dependencies: string[]
}

const hasText = (value?: string) => Boolean(value?.trim())
const stage = (details: Omit<JourneyStage, 'percent' | 'status'>): JourneyStage => {
  const done = details.checks.filter(check => check.complete).length
  const percent = details.checks.length ? Math.round(done / details.checks.length * 100) : 0
  return { ...details, percent, status: percent === 100 ? 'complete' : percent > 0 ? 'in-progress' : 'not-started' }
}

export function buildStartupJourney(startup: Startup): JourneyStage[] {
  const bomCost = sumBOM(startup.bom)
  const finance = calculateFinance(startup.financials, bomCost)
  const highCompliance = startup.compliance.filter(item => item.importance === 'High')
  const unresolvedCriticalRisks = startup.risks.filter(risk => risk.status !== 'Resolved' && risk.probability * risk.impact >= 15)

  return [
    stage({
      id: 'validate', number: 1, title: 'Validate the opportunity', shortTitle: 'Opportunity',
      purpose: 'Confirm that a specific customer has a problem worth solving before committing capital.',
      input: 'Founder idea, market, customer and geography', work: 'Define the problem, interview assumptions and value proposition', output: 'A focused opportunity statement and customer hypothesis',
      modules: ['identity'], dependencies: [],
      checks: [
        { label: 'Problem is clearly described', complete: hasText(startup.analysis.problem) || hasText(startup.identity.problem) },
        { label: 'Target customer is specific', complete: hasText(startup.targetCustomer) && hasText(startup.identity.customerPersona) },
        { label: 'Target geography is recorded', complete: hasText(startup.geographicMarket) },
        { label: 'Value proposition is written', complete: hasText(startup.analysis.valueProposition) || hasText(startup.identity.valueProposition) },
      ],
    }),
    stage({
      id: 'define', number: 2, title: 'Define the product', shortTitle: 'Product',
      purpose: 'Translate the customer problem into a testable minimum product and measurable requirements.',
      input: 'Validated problem and customer needs', work: 'Choose MVP boundaries, specifications and differentiators', output: 'A product brief that engineering and suppliers can evaluate',
      modules: ['product'], dependencies: ['validate'],
      checks: [
        { label: 'MVP scope is defined', complete: hasText(startup.product.mvp) },
        { label: 'Technical requirements are recorded', complete: hasText(startup.product.technicalRequirements) },
        { label: 'At least three measurable specifications exist', complete: startup.product.specs.filter(spec => hasText(spec.name) && hasText(spec.value)).length >= 3 },
        { label: 'Differentiation is explained', complete: hasText(startup.product.differentiators) },
      ],
    }),
    stage({
      id: 'source', number: 3, title: 'Cost and source the build', shortTitle: 'BOM & supply',
      purpose: 'Understand what the product contains, what it costs and how every critical part reaches production.',
      input: 'Frozen product requirements', work: 'Build the BOM, identify supplier types and map supply handoffs', output: 'A costed component plan with visible dependencies',
      modules: ['bom', 'supply-chain'], dependencies: ['define'],
      checks: [
        { label: 'BOM contains costed components', complete: startup.bom.length > 0 && bomCost > 0 },
        { label: 'Every critical component has a supplier type', complete: startup.bom.some(item => item.criticality === 'High') && startup.bom.filter(item => item.criticality === 'High').every(item => hasText(item.supplierType)) },
        { label: 'Supply-chain stages are mapped', complete: startup.supplyChain.length >= 2 },
        { label: 'Supply dependencies and risks are recorded', complete: startup.supplyChain.length > 0 && startup.supplyChain.every(item => hasText(item.dependencies) && hasText(item.risks)) },
      ],
    }),
    stage({
      id: 'prove', number: 4, title: 'Prove manufacturing', shortTitle: 'Production',
      purpose: 'Show that the design can be produced repeatedly at the required quality and capacity.',
      input: 'Product specification, BOM and supplier plan', work: 'Choose the production strategy, capacity and quality controls', output: 'A pilot-ready manufacturing plan',
      modules: ['manufacturing'], dependencies: ['define', 'source'],
      checks: [
        { label: 'Manufacturing strategy is selected', complete: startup.manufacturing.strategy !== 'Not decided' },
        { label: 'Production capacity assumptions are positive', complete: startup.manufacturing.productionLines > 0 && startup.manufacturing.unitsPerHour > 0 && startup.manufacturing.hoursPerDay > 0 && startup.manufacturing.daysPerMonth > 0 },
        { label: 'Quality-control method is documented', complete: hasText(startup.manufacturing.qualityControl) },
        { label: 'Production risks and capital are recorded', complete: hasText(startup.manufacturing.risks) && startup.manufacturing.capitalRequirements > 0 },
      ],
    }),
    stage({
      id: 'comply', number: 5, title: 'Build the compliance case', shortTitle: 'Compliance',
      purpose: 'Identify applicable obligations early and keep evidence behind every launch-critical decision.',
      input: 'Exact product, radio features, packaging, market and business role', work: 'Review official sources, decide applicability, assign owners and collect evidence', output: 'An owned compliance checklist with traceable evidence',
      modules: ['compliance'], dependencies: ['define', 'prove'],
      checks: [
        { label: 'Compliance topics are identified', complete: startup.compliance.length > 0 },
        { label: 'Applicability is reviewed for every item', complete: startup.compliance.length > 0 && startup.compliance.every(item => item.applicability === 'Applicable' || item.applicability === 'Not applicable' || item.status === 'Not applicable') },
        { label: 'Every high-priority item has an owner', complete: highCompliance.length > 0 && highCompliance.every(item => hasText(item.owner)) },
        { label: 'Every high-priority item has evidence or an official source', complete: highCompliance.length > 0 && highCompliance.every(item => hasText(item.evidenceNote) || hasText(item.sourceUrl)) },
        { label: 'No high-priority item remains open', complete: highCompliance.length > 0 && highCompliance.every(item => item.status === 'Complete' || item.status === 'Not applicable') },
      ],
    }),
    stage({
      id: 'fund', number: 6, title: 'Prove the economics', shortTitle: 'Finance',
      purpose: 'Test whether price, unit cost, operating expenses and available capital support the plan.',
      input: 'BOM, production cost, price and monthly operating assumptions', work: 'Calculate contribution, margin, break-even and runway constraints', output: 'A financially testable launch scenario',
      modules: ['finance'], dependencies: ['source', 'prove'],
      checks: [
        { label: 'Selling price is positive', complete: startup.financials.sellingPrice > 0 },
        { label: 'Unit costs are recorded', complete: finance.unitCost > 0 },
        { label: 'Unit contribution is positive', complete: finance.grossProfitPerUnit > 0 },
        { label: 'Monthly sales and operating expenses are modeled', complete: startup.financials.monthlySales > 0 && finance.operatingExpenses > 0 },
        { label: 'Available launch capital is recorded', complete: startup.financials.initialCapital > 0 },
      ],
    }),
    stage({
      id: 'organize', number: 7, title: 'Organize execution and risk', shortTitle: 'Team & risk',
      purpose: 'Make ownership visible and prevent launch-critical work from becoming nobody’s responsibility.',
      input: 'Work plan, budget, technical constraints and compliance obligations', work: 'Sequence hiring, assign reporting lines, owners and mitigations', output: 'An accountable execution structure and risk register',
      modules: ['team', 'risks'], dependencies: ['prove', 'comply', 'fund'],
      checks: [
        { label: 'Required roles and hiring stages are listed', complete: startup.team.length > 0 && startup.team.every(role => hasText(role.role) && hasText(role.hiringStage)) },
        { label: 'Hiring status is set for every role', complete: startup.team.length > 0 && startup.team.every(role => Boolean(role.hiringStatus)) },
        { label: 'Risks have owners and mitigations', complete: startup.risks.length > 0 && startup.risks.every(risk => hasText(risk.owner) && hasText(risk.mitigation)) },
        { label: 'No unresolved critical risk remains', complete: startup.risks.length > 0 && unresolvedCriticalRisks.length === 0 },
      ],
    }),
    stage({
      id: 'launch', number: 8, title: 'Prepare and launch', shortTitle: 'Launch',
      purpose: 'Coordinate product release, inventory movement, channels and timed milestones around readiness evidence.',
      input: 'Pilot product, approvals, owners, budget and channel plan', work: 'Connect distribution handoffs and execute launch milestones', output: 'A controlled market launch with measurable handoffs',
      modules: ['distribution', 'roadmap'], dependencies: ['comply', 'fund', 'organize'],
      checks: [
        { label: 'Distribution model and stages are defined', complete: hasText(startup.distribution.model) && startup.distribution.stages.length >= 2 },
        { label: 'Distribution handoffs include dependencies and risks', complete: startup.distribution.stages.length > 0 && startup.distribution.stages.every(item => hasText(item.dependencies) && hasText(item.risks)) },
        { label: 'Launch timeline is recorded', complete: hasText(startup.launchTimeline) },
        { label: 'Roadmap milestones have timing and descriptions', complete: startup.roadmap.length > 0 && startup.roadmap.every(item => hasText(item.timing) && hasText(item.description)) },
        { label: 'At least one milestone is in progress or complete', complete: startup.roadmap.some(item => item.status !== 'Planned') },
      ],
    }),
    stage({
      id: 'scale', number: 9, title: 'Scale with evidence', shortTitle: 'Scale',
      purpose: 'Increase capacity only after demand, quality, margin and service evidence pass explicit gates.',
      input: 'Launch demand, quality, margin, capacity and support evidence', work: 'Set target capacity, budget, exit criteria and gate decisions', output: 'A staged growth plan that protects cash and product quality',
      modules: ['scaling'], dependencies: ['launch'],
      checks: [
        { label: 'Scaling stages are defined', complete: startup.scaling.length > 0 },
        { label: 'Each stage has capacity and budget targets', complete: startup.scaling.length > 0 && startup.scaling.every(item => Number(item.targetUnits) > 0 && Number(item.targetBudget) >= 0) },
        { label: 'Each stage has measurable milestones', complete: startup.scaling.length > 0 && startup.scaling.every(item => hasText(item.milestones)) },
        { label: 'Gate evidence is recorded for reviewed stages', complete: startup.scaling.some(item => item.gateStatus && item.gateStatus !== 'Not reviewed') && startup.scaling.filter(item => item.gateStatus === 'Ready').every(item => hasText(item.evidence)) },
      ],
    }),
  ]
}

export const journeyProgress = (stages: JourneyStage[]) => Math.round(stages.reduce((total, item) => total + item.percent, 0) / Math.max(1, stages.length))
