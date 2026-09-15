import { describe, expect, it } from 'vitest'
import type { RagDocument } from '../types'
import { isComplianceQuery, rankRagDocuments } from './ragService'

const document = (id: string, title: string, content: string, tags: string[]): RagDocument => ({
  id,
  kind: id.startsWith('gov') ? 'government-compliance' : 'startup',
  title,
  content,
  tags,
  updatedAt: '2026-09-09',
  contentHash: id,
})

describe('RAG routing and ranking', () => {
  it('routes only legal and regulatory intent to the compliance specialist', () => {
    expect(isComplianceQuery('Do I need BIS certification for this laptop?')).toBe(true)
    expect(isComplianceQuery('How can I reduce my BOM cost?')).toBe(false)
  })

  it('ranks exact title and tag matches above unrelated documents', () => {
    const ranked = rankRagDocuments('wireless WPC approval', [
      document('startup-bom', 'Bill of materials', 'processor and display costs', ['bom', 'cost']),
      document('gov-wpc', 'WPC Equipment Type Approval', 'wireless radio approval', ['wireless', 'wpc', 'eta']),
    ])

    expect(ranked[0]?.document.id).toBe('gov-wpc')
    expect(ranked).toHaveLength(1)
  })
})

