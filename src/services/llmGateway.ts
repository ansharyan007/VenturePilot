import type { RetrievedContext, Startup } from '../types'
import { auth } from './firebase'

interface GroundedModelRequest {
  agent: 'planning-copilot' | 'compliance-specialist'
  startup: Startup
  question: string
  context: RetrievedContext[]
}

/**
 * Calls an optional secure server-side LLM gateway. No provider key belongs in Vite.
 * The gateway should return JSON shaped as { "reply": "..." }.
 */
export async function callGroundedModel(request: GroundedModelRequest): Promise<string | null> {
  const endpoint = import.meta.env.VITE_AI_API_URL?.trim()
  if (!endpoint) return null
  const idToken = await auth.currentUser?.getIdToken()

  const context = request.context.map(({ document, score }) => ({
    title: document.title,
    content: document.content,
    sourceUrl: document.sourceUrl,
    lastVerified: document.lastVerified,
    score,
  }))

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      agent: request.agent,
      question: request.question,
      startupId: request.startup.id,
      startupName: request.startup.name,
      instructions: 'Answer only from the retrieved context. State uncertainty, never invent a legal requirement, and cite official source URLs used. This is planning guidance, not legal advice.',
      context,
    }),
  })

  if (!response.ok) throw new Error(`AI gateway returned ${response.status}`)
  const body = await response.json() as { reply?: unknown }
  if (typeof body.reply !== 'string' || !body.reply.trim()) throw new Error('AI gateway returned an invalid response')
  return body.reply.trim()
}
