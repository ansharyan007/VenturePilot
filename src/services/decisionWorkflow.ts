import type { ComplianceItem, RagDocument, Startup } from '../types'
import { complianceKnowledge } from '../data/complianceKnowledge'
import { calculateCapacity, calculateFinance, inr, number, sumBOM } from '../utils/calculations'

export interface ReviewFacts { market: 'India' | 'Other' | 'Unknown'; wireless: 'Yes' | 'No' | 'Unknown'; role: 'Brand owner' | 'Importer' | 'Manufacturer' | 'Unknown'; packaged: 'Yes' | 'No' | 'Unknown' }
export interface EvidenceCandidate { source: RagDocument; reason: string; question: string; action: string; matched: string[] }
export interface WorkflowStep { name: string; input: string; output: string; method: string }
export interface ComplianceReview { candidates: EvidenceCandidate[]; steps: WorkflowStep[]; gaps: string[] }

// These are bounded deterministic workers, not independent autonomous LLM agents.
// Each worker consumes the previous worker's typed output; no hidden model loop.
export function retrieveComplianceEvidence(startup: Startup, facts: ReviewFacts): EvidenceCandidate[] {
  if (facts.market !== 'India') return []
  const terms = `${startup.category} ${startup.description} ${startup.product.specs.map(s => `${s.name} ${s.value}`).join(' ')}`.toLowerCase()
  return complianceKnowledge.filter(source => !(source.id === 'dot-wpc-eta' && facts.wireless === 'No') && !(source.id === 'legal-metrology-packaged-commodities' && facts.packaged === 'No')).map(source => {
    const matched = source.tags.filter(tag => terms.includes(tag.toLowerCase()))
    const special: Record<string, [string, string, string]> = {
      'bis-crs-electronics': [`Product category: ${startup.category}. Category matching is a search signal only.`, 'Is the exact product covered by the current notified category and standard?', 'Record the exact product classification and confirm the certification path with an appropriate lab.'],
      'dot-wpc-eta': [`Wireless hardware: ${facts.wireless}.`, 'Which radios, frequency bands and equipment configuration will be sold?', 'Collect the radio specifications and test-report references, then verify the approval path.'],
      'cpcb-ewaste-epr': [`Business role: ${facts.role}.`, 'Does the exact equipment and business role fall within the current producer scope?', 'Record the equipment category and business role; check registration and EPR scope in the linked source.'],
      'legal-metrology-packaged-commodities': [`Retail packaging: ${facts.packaged}.`, 'Which declarations and exceptions apply to this package and sales channel?', 'Review a draft package label against the linked rules and record missing declarations.'],
      'mca-spice-plus': ['Entity type and incorporation evidence have not been captured.', 'Which legal entity will operate this business, and is it already registered?', 'Record the entity type and incorporation evidence or assign an incorporation review.'],
      'cbic-gst-registration': ['Turnover, supply type and tax registrations need confirmation.', 'Which registrations apply to the actual turnover, supply pattern and locations?', 'Collect turnover and sales-channel assumptions for a tax-registration review.'],
      'dpiit-startup-recognition': ['Potential benefit review; recognition is separate from incorporation.', 'Does the entity meet current recognition criteria, and do you want to apply?', 'Check current eligibility and decide whether to pursue recognition.'],
    }
    const [reason, question, action] = special[source.id] ?? ['Topic requires review.', 'Does this source apply?', 'Review the official source.']
    return { source, reason, question, action, matched }
  }).sort((a, b) => b.matched.length - a.matched.length)
}

export function runComplianceReview(startup: Startup, facts: ReviewFacts): ComplianceReview {
  const candidates = retrieveComplianceEvidence(startup, facts)
  const gaps = Object.entries(facts).filter(([, value]) => value === 'Unknown').map(([key]) => `Confirm ${key}`)
  if (facts.market !== 'India') gaps.push('The bundled corpus covers India only. Confirm India as a sales market or obtain jurisdiction-specific sources.')
  return { candidates, gaps, steps: [
    { name: 'Facts', input: `${startup.category} + ${startup.product.specs.length} specifications`, output: `${facts.market} market / ${facts.role} / wireless: ${facts.wireless} / packaged: ${facts.packaged}`, method: 'User-confirmed structured inputs' },
    { name: 'Evidence retriever', input: 'Confirmed facts + bundled government summaries', output: `${candidates.length} candidates ordered by matching product tags`, method: 'Local filters and tag matching; no live government fetch' },
    { name: 'Applicability reviewer', input: `${candidates.length} evidence candidates`, output: `${gaps.length} missing-fact warnings; every candidate requires review`, method: 'Deterministic questions; no legal determination' },
    { name: 'Action planner', input: 'Evidence + applicability questions', output: `${candidates.length} proposed review actions`, method: 'Structured templates; no LLM call' },
  ] }
}

export function proposalToItem(candidate: EvidenceCandidate, owner: string, evidenceNote: string): ComplianceItem {
  return { id: `rag-${candidate.source.id}`, name: candidate.source.title, status: 'Not started', importance: candidate.source.id === 'dpiit-startup-recognition' ? 'Low' : 'High', description: candidate.reason, nextAction: candidate.action, sourceUrl: candidate.source.sourceUrl!, sourceTitle: candidate.source.title, lastVerified: candidate.source.lastVerified!, owner, evidenceNote, applicability: 'Needs review' }
}

export function mergeProposals(existing: ComplianceItem[], proposals: ComplianceItem[]) {
  // Repeated runs preserve all edited fields, evidence and completion status.
  const keys = new Set(existing.map(item => item.sourceUrl || item.id))
  return [...existing, ...proposals.filter(item => { const key = item.sourceUrl || item.id; if (keys.has(key)) return false; keys.add(key); return true })]
}

export function inspectDecisions(startup: Startup) {
  const finance = calculateFinance(startup.financials, sumBOM(startup.bom))
  const capacity = calculateCapacity(startup.manufacturing).realisticMonthly
  const openCompliance = startup.compliance.filter(i => !['Complete', 'Not applicable'].includes(i.status)).length
  const unowned = startup.risks.filter(r => r.status !== 'Resolved' && !r.owner.trim()).length
  return [
    { title: 'Unit contribution', value: inr(finance.grossProfitPerUnit), formula: 'Selling price − (BOM + assembly + packaging + logistics)', needsAction: finance.grossProfitPerUnit <= 0, action: 'Compare pricing and component costs', route: 'finance' },
    { title: 'Capacity vs planned sales', value: `${number(capacity)} / ${number(startup.financials.monthlySales)} units`, formula: 'Lines × units/hour × hours/day × days/month × utilization', needsAction: capacity < startup.financials.monthlySales, action: 'Review production capacity', route: 'manufacturing' },
    { title: 'Break-even vs planned sales', value: finance.grossProfitPerUnit > 0 ? `${number(finance.breakEvenUnits)} / ${number(startup.financials.monthlySales)} units` : 'Positive contribution required', formula: 'Monthly operating expenses ÷ unit contribution, rounded up', needsAction: finance.grossProfitPerUnit <= 0 || finance.breakEvenUnits > startup.financials.monthlySales, action: 'Explore financial assumptions', route: 'finance' },
    { title: 'Compliance review queue', value: `${openCompliance} unfinished items`, formula: 'Saved checklist items not marked Complete or Not applicable', needsAction: openCompliance > 0 || !startup.compliance.length, action: 'Review evidence and assign actions', route: 'compliance' },
    { title: 'Risk ownership', value: `${unowned} open risks without owners`, formula: 'Unresolved risks with an empty owner', needsAction: unowned > 0, action: 'Assign mitigation owners', route: 'risks' },
  ]
}
