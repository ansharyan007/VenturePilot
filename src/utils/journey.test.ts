import { describe, expect, it } from 'vitest'
import { demoStartup } from '../data/demoStartup'
import { buildStartupJourney, journeyProgress } from './journey'

const startup = { ...structuredClone(demoStartup), id: 'demo', ownerId: 'owner' }

describe('startup journey', () => {
  it('builds every stage in order with bounded readiness', () => {
    const stages = buildStartupJourney(startup)
    expect(stages.map(stage => stage.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(stages.every(stage => stage.percent >= 0 && stage.percent <= 100)).toBe(true)
    expect(journeyProgress(stages)).toBeGreaterThanOrEqual(0)
    expect(journeyProgress(stages)).toBeLessThanOrEqual(100)
  })

  it('shows compliance and launch gaps from actual saved fields', () => {
    const stages = buildStartupJourney(startup)
    const compliance = stages.find(stage => stage.id === 'comply')!
    const launch = stages.find(stage => stage.id === 'launch')!
    expect(compliance.checks.find(check => check.label.includes('owner'))?.complete).toBe(false)
    expect(launch.checks.find(check => check.label.includes('in progress'))?.complete).toBe(false)
  })

  it('marks positive unit contribution using deterministic financial calculations', () => {
    const finance = buildStartupJourney(startup).find(stage => stage.id === 'fund')!
    expect(finance.checks.find(check => check.label === 'Unit contribution is positive')?.complete).toBe(true)
  })
})
