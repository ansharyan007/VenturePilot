import { describe, expect, it } from 'vitest'
import { canReportTo, reviewGate } from './planning'
import { demoStartup } from '../data/demoStartup'
describe('editable planning relationships', () => {
  it('rejects circular reporting lines and missing managers', () => {
    const base = { salary: 0, hiringStage: 'Now', notes: '' }
    const roles = [{ ...base, id: 'a', role: 'Lead' }, { ...base, id: 'b', role: 'Engineer', reportsTo: 'a' }]
    expect(canReportTo(roles, 'a', 'b')).toBe(false)
    expect(canReportTo(roles, 'b', 'a')).toBe(true)
    expect(canReportTo(roles, 'b', 'missing')).toBe(false)
  })
  it('requires earlier gates and evidence and invalidates later approvals', () => {
    const stages = demoStartup.scaling.slice(0, 2).map(s => ({ ...s, evidence: 'Review record', gateStatus: 'Not reviewed' as const }))
    expect(() => reviewGate(stages, 1, 'Ready')).toThrow('earlier')
    const ready = reviewGate(reviewGate(stages, 0, 'Ready'), 1, 'Ready')
    expect(reviewGate(ready, 0, 'Needs work')[1].gateStatus).toBe('Not reviewed')
    expect(() => reviewGate([{ ...stages[0], evidence: '' }], 0, 'Ready')).toThrow('evidence')
  })
})
