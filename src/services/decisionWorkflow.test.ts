import { describe, expect, it } from 'vitest'
import { demoStartup } from '../data/demoStartup'
import type { Startup } from '../types'
import { inspectDecisions, mergeProposals, proposalToItem, runComplianceReview, type ReviewFacts } from './decisionWorkflow'

const startup: Startup = { ...demoStartup, id: 'test', ownerId: 'test-owner' }
const facts: ReviewFacts = { market: 'India', wireless: 'Yes', role: 'Brand owner', packaged: 'Yes' }
describe('Decision workflow', () => {
  it('does not offer Indian obligations for an unconfirmed or other market', () => {
    expect(runComplianceReview(startup, { ...facts, market: 'Unknown' }).candidates).toEqual([])
    expect(runComplianceReview(startup, { ...facts, market: 'Other' }).gaps.length).toBeGreaterThan(0)
  })
  it('uses explicit facts to exclude wireless and packaging candidates', () => {
    const result = runComplianceReview(startup, { ...facts, wireless: 'No', packaged: 'No' })
    expect(result.candidates.some(c => c.source.id === 'dot-wpc-eta')).toBe(false)
    expect(result.candidates.some(c => c.source.id === 'legal-metrology-packaged-commodities')).toBe(false)
  })
  it('preserves existing evidence, edits and completion status on repeated runs', () => {
    const candidate = runComplianceReview(startup, facts).candidates[0]
    const proposed = proposalToItem(candidate, 'Quality lead', 'Review pending')
    const edited = { ...proposed, status: 'Complete' as const, nextAction: 'Reviewed by adviser', evidenceNote: 'Report 123' }
    expect(mergeProposals([edited], [proposed, proposed])).toEqual([edited])
    expect(proposed.applicability).toBe('Needs review')
  })
  it('flags insufficient capacity and nonpositive contribution', () => {
    const changed = { ...startup, financials: { ...startup.financials, sellingPrice: 1, monthlySales: 999999 } }
    const results = inspectDecisions(changed)
    expect(results.slice(0, 3).every(d => d.needsAction)).toBe(true)
  })
})
