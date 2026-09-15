// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { demoStartup } from '../data/demoStartup'
import type { Startup, StartupUpdate } from '../types'
import type { ReactNode } from 'react'
import { TeamPage } from './TeamPage'
import { ScalingPage } from './ScalingPage'
const mocks = vi.hoisted(() => ({ save: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../components/StartupPageState', () => ({ StartupPageState: ({ children }: { children: (state: { startup: Startup; save: (update: StartupUpdate) => Promise<void> }) => ReactNode }) => children({ startup: { ...demoStartup, id: 'test', ownerId: 'owner' }, save: mocks.save }) }))
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ toast: () => {} }) }))
afterEach(() => { cleanup(); mocks.save.mockClear() })
it('moves a role between stages and saves without implicitly overwriting finance', async () => {
  render(<TeamPage />)
  fireEvent.change(screen.getAllByLabelText('Move to hiring stage')[0], { target: { value: 'Launch' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalled())
  expect(mocks.save.mock.calls[0][0].team[0].hiringStage).toBe('Launch')
  expect(mocks.save.mock.calls[0][0].financials).toBeUndefined()
})
it('blocks a ready scaling gate without evidence', () => {
  render(<ScalingPage />)
  fireEvent.change(screen.getByLabelText('Gate review decision'), { target: { value: 'Ready' } })
  expect(screen.getByRole('status').textContent).toContain('supporting evidence')
  expect(mocks.save).not.toHaveBeenCalled()
})
