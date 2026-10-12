// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { demoStartup } from '../data/demoStartup'
import type { AgentRun } from '../types/agents'
import { AgentResultDashboard } from './AgentResultDashboard'

afterEach(cleanup)

const result: AgentRun = {
  id: 'run-1',
  question: 'What should I do before launching this wearable?',
  createdAt: '2026-10-11T12:00:00.000Z',
  durationMs: 12000,
  mode: 'multi-agent',
  evidence: [
    { id: 'venture-scope', title: 'Authoritative venture scope', kind: 'startup', score: 1, content: JSON.stringify({ category: 'Wearable', originalIdea: 'Import a smart watch for India', targetCustomer: 'Students', geographicMarket: 'India' }) },
    { id: 'tool-calculations', title: 'Deterministic calculation tool', kind: 'startup', score: 1, content: JSON.stringify({ finance: { grossMargin: 28 }, capacity: { monthlyUnits: 500 } }) },
    { id: 's-bom-0', title: 'Saved BOM · Item 1 of 1', kind: 'startup', score: 0.82, content: JSON.stringify([{ component: 'Processor + chipset', quantity: 1, unitCost: 9000 }]) },
    { id: 's-scaling-1', title: 'Saved Scaling · Legacy fragment', kind: 'startup', score: 0.71, content: '-broken-id","capital":"Milestone-linked funding"},{"name":"Regional expansion","productionCapacity":"Scale to validated demand"},{"name":"partial' },
  ],
  findings: [{ role: 'product', model: 'qwen3:8b', summary: 'The product needs evidence.', actions: [], uncertainties: [], evidenceIds: ['venture-scope'] }],
  review: {
    role: 'reviewer', model: 'qwen3:8b', summary: 'Validate the import and compliance assumptions before committing launch capital.',
    actions: [
      { title: 'Draft the launch page', module: 'distribution', reason: 'Prepare this after the blocking work.', evidenceIds: ['venture-scope'], priority: 'low' },
      { title: 'Confirm import and compliance scope', module: 'compliance', reason: 'This blocks supplier and launch decisions.', evidenceIds: ['venture-scope'], priority: 'high' },
      { title: 'Validate landed cost', module: 'finance', reason: 'Use supplier and duty evidence.', evidenceIds: ['tool-calculations'], priority: 'medium' },
      { title: 'Plan the first campaign', module: 'distribution', reason: 'Wait for validated positioning.', evidenceIds: ['venture-scope'], priority: 'low' },
      { title: 'Prepare a scaling checkpoint', module: 'scaling', reason: 'Use it after launch evidence exists.', evidenceIds: ['tool-calculations'], priority: 'low' },
    ],
    uncertainties: ['Supplier quotation is missing.'], evidenceIds: ['venture-scope', 'tool-calculations'],
  },
}

it('puts the highest-priority action first and turns JSON evidence into visual fields', () => {
  const onAdd = vi.fn().mockResolvedValue(undefined)
  render(<MemoryRouter><AgentResultDashboard result={result} startup={{ ...demoStartup, id: 'startup-1', ownerId: 'owner', roadmap: [] }} adding={null} onAdd={onAdd} /></MemoryRouter>)

  const doFirst = screen.getByText('Do first').closest('section')
  expect(doFirst).not.toBeNull()
  expect(within(doFirst!).getByText('Confirm import and compliance scope')).toBeTruthy()
  expect(screen.getByText('Validate landed cost')).toBeTruthy()
  expect(screen.getByText('Show 1 later action')).toBeTruthy()

  fireEvent.click(screen.getByText('Evidence map'))
  expect(screen.getByText('Authoritative venture scope')).toBeTruthy()
  expect(screen.getByText('Category')).toBeTruthy()
  expect(screen.getByText('Wearable')).toBeTruthy()
  expect(screen.getAllByText('Retrieval match').length).toBeGreaterThan(0)
  expect(screen.getByText('Item 1 · Component')).toBeTruthy()
  expect(screen.getByText('Processor + chipset')).toBeTruthy()
  expect(screen.getByText('Regional expansion')).toBeTruthy()
  expect(screen.getByText('Saved with an older RAG index')).toBeTruthy()
  expect(screen.getByText('Auto-upgrade ready')).toBeTruthy()

  fireEvent.click(within(doFirst!).getByRole('button', { name: 'Add to roadmap' }))
  expect(onAdd).toHaveBeenCalledWith(result.review.actions[1], 1)
})
