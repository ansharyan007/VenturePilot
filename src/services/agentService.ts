import type { ComplianceItem, RagDocument, RetrievedContext, Startup } from '../types'
import { callGroundedModel } from './llmGateway'
import { governmentSourcesFor, retrieveRagContext } from './ragService'

function sourceLine(document: RagDocument) {
  return document.sourceUrl ? `${document.title}: ${document.sourceUrl}` : document.title
}

function localComplianceAnswer(startup: Startup, context: RetrievedContext[]) {
  const government = context.filter(({ document }) => document.kind === 'government-compliance')
  if (government.length === 0) {
    return `I could not find an authoritative government source matching that question for ${startup.name}. Treat it as an applicability question and verify it with the relevant regulator or a qualified adviser.`
  }

  const findings = government.slice(0, 4).map(({ document }, index) =>
    `${index + 1}. ${document.title}: ${document.content}`)
  const sources = government.slice(0, 4).map(({ document }) => `- ${sourceLine(document)}`)
  return [
    `Compliance RAG result for ${startup.name}`,
    '',
    ...findings,
    '',
    'Recommended next step: confirm applicability against the exact product configuration, importer/manufacturer role, sales channel and launch state before committing money or dates.',
    '',
    'Official sources:',
    ...sources,
    '',
    'Planning guidance only—not legal or tax advice. Source pages can change.',
  ].join('\n')
}

/** A narrow specialist agent. The router invokes it only for compliance intent. */
export async function runComplianceAgent(startup: Startup, question: string) {
  const context = await retrieveRagContext(startup, question, 7)
  const modelReply = await callGroundedModel({ agent: 'compliance-specialist', startup, question, context })
  return modelReply ?? localComplianceAnswer(startup, context)
}

export async function runPlanningModel(startup: Startup, question: string) {
  const context = await retrieveRagContext(startup, question, 5)
  return callGroundedModel({ agent: 'planning-copilot', startup, question, context })
}

export function complianceChecklistFromKnowledge(startup: Startup): ComplianceItem[] {
  const existingBySource = new Map(startup.compliance.map((item) => [item.sourceUrl, item]))

  return governmentSourcesFor(startup).map((document) => {
    const existing = existingBySource.get(document.sourceUrl)
    return {
      id: existing?.id ?? `rag-${document.id}`,
      name: document.title,
      status: existing?.status ?? 'Not started',
      importance: 'High',
      description: document.content,
      nextAction: existing?.nextAction || 'Open the official source, confirm applicability for the exact product and retain evidence of the decision.',
      sourceTitle: document.title,
      sourceUrl: document.sourceUrl,
      lastVerified: document.lastVerified,
    }
  })
}

