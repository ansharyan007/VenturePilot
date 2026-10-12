// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createStartupDraft, demoStartup } from '../data/demoStartup'
import type { Startup, StartupUpdate } from '../types'
import { StartupPageState } from './StartupPageState'

const mocks = vi.hoisted(() => ({ request: vi.fn(), save: vi.fn(), latest: vi.fn(), startup: null as unknown }))
vi.mock('../services/agentClient', () => ({ requestWorkspacePlan: mocks.request }))
vi.mock('../services/firestoreService', () => ({ getStartup: mocks.latest }))
vi.mock('../hooks/useStartup', () => ({ useStartup: () => {
  const [startup, setStartup] = useState(mocks.startup as Startup)
  return { startup, loading: false, error: '', save: async (update: StartupUpdate) => { await mocks.save(update); setStartup(current => ({ ...current, ...update })) } }
} }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.startup = { ...createStartupDraft({ founderName: 'A', name: 'WatchCo', country: 'India', region: 'Karnataka', founderCount: 1, experience: '', budget: 1000000, idea: 'Import fitness watches', category: 'Wearable', description: 'Student fitness watch', targetCustomer: 'Students', targetMarket: 'Schools', geographicMarket: 'India', sellingPrice: 2400, launchTimeline: '9 months' }), id: 'test', ownerId: 'alice', createdAt: '', updatedAt: '' }
  mocks.latest.mockResolvedValue(mocks.startup)
  mocks.save.mockResolvedValue(undefined)
  mocks.request.mockResolvedValue({ product: { ...demoStartup.product, mvp: 'Draft fitness watch' }, planningDraft: { generatedAt: '2026-10-12', model: 'qwen3:8b', modules: ['product'], assumptions: ['Cost needs a quote'], missingInformation: ['Supplier quote'], review: 'Draft needs review' } })
})
afterEach(cleanup)

function View() {
  return <StartupPageState>{({ startup }) => <p>{startup.product.mvp || 'No product yet'}</p>}</StartupPageState>
}

it('generates once for a newly created startup and displays the saved product immediately', async () => {
  render(<MemoryRouter initialEntries={['/startup/test?generate=1']}><View /></MemoryRouter>)
  await waitFor(() => expect(screen.getByText('Draft fitness watch')).toBeTruthy())
  expect(mocks.request).toHaveBeenCalledOnce()
  expect(mocks.save.mock.calls[0][0].product.specs.length).toBeGreaterThan(0)
  expect(screen.getByText('Review draft assumptions and missing evidence')).toBeTruthy()
})

it('offers recovery for an old startup and retries a failed save without repeating inference', async () => {
  mocks.save.mockRejectedValueOnce(new Error('Firestore offline')).mockResolvedValueOnce(undefined)
  render(<MemoryRouter><View /></MemoryRouter>)
  expect(mocks.request).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Fill missing sections' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Firestore offline'))
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving draft' }))
  await waitFor(() => expect(screen.getByText('Draft fitness watch')).toBeTruthy())
  expect(mocks.request).toHaveBeenCalledOnce()
  expect(mocks.save).toHaveBeenCalledTimes(2)
})
