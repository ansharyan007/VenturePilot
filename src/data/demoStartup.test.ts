import { describe, expect, it } from 'vitest'
import { createStartupDraft, demoStartup, sanitizeLegacyLaptopTemplate } from './demoStartup'

const input = { founderName: 'A', name: 'ChipCo', country: 'India', region: 'Karnataka', founderCount: 1, experience: '', budget: 1000000, idea: 'Build low-power semiconductor sensors', category: 'Semiconductor', description: 'An industrial sensor IC', targetCustomer: 'Equipment manufacturers', targetMarket: 'Industrial automation', geographicMarket: 'India', sellingPrice: 1200, launchTimeline: '18 months' }

describe('idea-scoped startup drafts', () => {
  it('does not copy laptop demo assumptions into a new venture', () => {
    const draft = createStartupDraft(input)
    expect(draft.category).toBe('Semiconductor')
    expect(draft.product.specs).toEqual([])
    expect(draft.bom).toEqual([])
    expect(draft.manufacturing.strategy).toBe('Not decided')
    expect(JSON.stringify(draft).toLowerCase()).not.toContain('laptop')
  })

  it('cleans only the recognizable legacy leak in a non-laptop venture', () => {
    const customTeam = [{ id: 'foundry', role: 'Process engineer', salary: 100000, hiringStage: 'Prototype', notes: 'Custom semiconductor role' }]
    const leaked = { ...structuredClone(demoStartup), id: 'chip', ownerId: 'owner', isDemo: false, category: input.category, idea: input.idea, description: input.description, team: customTeam }
    const cleaned = sanitizeLegacyLaptopTemplate(leaked)
    expect(cleaned.product.specs).toEqual([])
    expect(cleaned.bom).toEqual([])
    expect(cleaned.financials.sellingPrice).toBe(leaked.financials.sellingPrice)
    expect(cleaned.team).toEqual(customTeam)
    expect(sanitizeLegacyLaptopTemplate({ ...leaked, category: 'Laptop', idea: 'A laptop venture' }).bom.length).toBeGreaterThan(0)
  })
})
