import { describe, expect, it } from 'vitest'
import { createStartupDraft, demoStartup } from '../data/demoStartup'
import type { Startup } from '../types'
import { fillMissingPlan, metricCoverage, missingPlanningSections } from './workspacePlanning'

const startup = (): Startup => ({ ...createStartupDraft({ founderName: 'Founder', name: 'Watch importer', country: 'India', region: 'Karnataka', founderCount: 1, experience: '', budget: 5000000, idea: 'Import fitness watches from China to India', category: 'Wearable', description: 'Affordable fitness watches', targetCustomer: 'Students', targetMarket: 'Schools', geographicMarket: 'India', sellingPrice: 2400, launchTimeline: '9 months' }), id: 's', ownerId: 'alice', createdAt: '', updatedAt: '' })

describe('initial workspace planning', () => {
  it('distinguishes missing inputs from genuine calculated zeroes', () => {
    expect(missingPlanningSections(startup())).toHaveLength(13)
    expect(metricCoverage(startup())).toEqual({ bom: false, finance: false, capacity: false, risks: false })
    expect(metricCoverage({ ...demoStartup, id: 'demo', ownerId: 'alice' })).toEqual({ bom: true, finance: true, capacity: true, risks: true })
  })

  it('fills blanks while retaining founder inputs and customized data, including intentional zeroes', () => {
    const original = startup()
    original.identity.mission = 'My custom mission'
    original.financials.monthlySales = 10
    const update = fillMissingPlan(original, { identity: demoStartup.identity, bom: demoStartup.bom, financials: demoStartup.financials })
    expect(update.identity?.mission).toBe('My custom mission')
    expect(update.identity?.vision).toBe(demoStartup.identity.vision)
    expect(update.financials?.initialCapital).toBe(5000000)
    expect(update.financials?.sellingPrice).toBe(2400)
    expect(update.financials?.monthlySales).toBe(10)
    expect(update.financials?.rent).toBe(0)
    expect(update.bom?.length).toBeGreaterThan(0)
    expect(original.bom).toHaveLength(0)
    original.bom = [{ ...demoStartup.bom[0], component: 'Custom watch', unitCost: 900 }]
    expect(fillMissingPlan(original, { bom: demoStartup.bom }).bom).toBeUndefined()
  })
})
