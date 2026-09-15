import { expect, it } from 'vitest'
import { readAgentStream } from './agentClient'

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
