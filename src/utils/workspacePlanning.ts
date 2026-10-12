import type { Startup, StartupUpdate } from '../types'

export const planningSections = ['analysis', 'identity', 'product', 'bom', 'manufacturing', 'supplyChain', 'distribution', 'compliance', 'financials', 'team', 'risks', 'roadmap', 'scaling'] as const
export type PlanningSection = typeof planningSections[number]
export const sectionLabels: Record<PlanningSection, string> = {
  analysis: 'Opportunity', identity: 'Identity', product: 'Product', bom: 'BOM', manufacturing: 'Manufacturing',
  supplyChain: 'Supply chain', distribution: 'Distribution', compliance: 'Compliance', financials: 'Finance',
  team: 'Team', risks: 'Risks', roadmap: 'Roadmap', scaling: 'Scaling',
}

export function hasSectionData(startup: Startup, section: PlanningSection): boolean {
  switch (section) {
    case 'analysis': return !!startup.analysis?.valueProposition
    case 'identity': return !!startup.identity?.mission
    case 'product': return !!startup.product?.mvp && !!startup.product.specs?.length
    case 'bom': return !!startup.bom?.length
    case 'manufacturing': return startup.manufacturing?.strategy !== 'Not decided' && !!startup.manufacturing?.qualityControl
    case 'distribution': return !!startup.distribution?.stages?.length
    case 'financials': return !!startup.financials && (startup.financials.monthlySales > 0 || startup.financials.manufacturingCost > 0 || startup.financials.logistics > 0 || startup.financials.employeeExpenses > 0)
    default: return !!startup[section]?.length
  }
}

export const missingPlanningSections = (startup: Startup) => planningSections.filter(section => !hasSectionData(startup, section))

/** Fill empty fields only. Saved numbers in an already configured module are intentional. */
export function fillMissingPlan(startup: Startup, proposal: StartupUpdate): StartupUpdate {
  const update: StartupUpdate = {}
  for (const section of planningSections) {
    const incoming = proposal[section]
    if (incoming === undefined) continue
    const current = startup[section]
    if (Array.isArray(current)) {
      if (!current.length) Object.assign(update, { [section]: incoming })
      continue
    }
    const configured = hasSectionData(startup, section)
    const merged = { ...current } as Record<string, unknown>
    for (const [field, value] of Object.entries(incoming)) {
      const before = merged[field]
      if (before == null || before === '' || before === 'Not decided' || (Array.isArray(before) && !before.length) || (!configured && typeof before === 'number' && before === 0)) merged[field] = value
    }
    // The founder's pricing and capital inputs are authoritative, including zero capital.
    if (section === 'financials') {
      merged.initialCapital = startup.financials.initialCapital
      merged.sellingPrice = startup.financials.sellingPrice
    }
    Object.assign(update, { [section]: merged })
  }
  if (proposal.planningDraft) update.planningDraft = proposal.planningDraft
  return update
}

export function metricCoverage(startup: Startup) {
  return {
    bom: !!startup.bom?.length && startup.bom.every(item => item.unitCost > 0 && item.quantity > 0),
    finance: !!startup.bom?.length && startup.bom.every(item => item.unitCost > 0 && item.quantity > 0) && startup.financials.sellingPrice > 0,
    capacity: ['productionLines', 'unitsPerHour', 'hoursPerDay', 'daysPerMonth', 'utilization'].every(key => startup.manufacturing[key as keyof Startup['manufacturing']] as number > 0),
    risks: !!startup.risks?.length,
  }
}
