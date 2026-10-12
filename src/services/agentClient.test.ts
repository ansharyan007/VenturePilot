import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
}))

vi.mock('./firebase', () => ({
  auth: { currentUser: { getIdToken: mocks.getIdToken } },
  db: {},
}))

import { authenticatedFetch, readAgentStream } from './agentClient'

describe('authenticatedFetch', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    mocks.getIdToken.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('refreshes a rejected Firebase ID token and retries once', async () => {
    mocks.getIdToken.mockResolvedValueOnce('cached-token').mockResolvedValueOnce('fresh-token')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'expired' }), { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    globalThis.fetch = fetchMock

    const response = await authenticatedFetch('/api/agents/run', { method: 'POST', body: '{}' })

    expect(response.status).toBe(200)
    expect(mocks.getIdToken).toHaveBeenNthCalledWith(1, false)
    expect(mocks.getIdToken).toHaveBeenNthCalledWith(2, true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((fetchMock.mock.calls[0][1]?.headers as Headers).get('Authorization')).toBe('Bearer cached-token')
    expect((fetchMock.mock.calls[1][1]?.headers as Headers).get('Authorization')).toBe('Bearer fresh-token')
  })

  it('does not refresh a token after a successful request', async () => {
    mocks.getIdToken.mockResolvedValue('current-token')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    globalThis.fetch = fetchMock

    await authenticatedFetch('/api/agents/run')

    expect(mocks.getIdToken).toHaveBeenCalledOnce()
    expect(mocks.getIdToken).toHaveBeenCalledWith(false)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})

it('handles fragmented progress messages and rejects a truncated run', async () => {
  const encoder = new TextEncoder()
  const lines = JSON.stringify({ type: 'progress', data: { stage: 'team', state: 'running', detail: 'Model call started', elapsedMs: 5 } }) + '\n'
  const events: unknown[] = []
  const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(lines.slice(0, 12))); controller.enqueue(encoder.encode(lines.slice(12))); controller.close() } }))
  await expect(readAgentStream(response, event => events.push(event))).rejects.toThrow('ended before a result')
  expect(events).toHaveLength(1)
})

it('reports a server model failure without presenting a completed result', async () => {
  const response = new Response(JSON.stringify({ type: 'error', data: { error: 'Model missing' } }) + '\n')
  await expect(readAgentStream(response, () => {})).rejects.toThrow('Model missing')
})
