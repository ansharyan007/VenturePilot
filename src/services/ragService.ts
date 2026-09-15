import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { complianceKnowledge } from '../data/complianceKnowledge'
import type { RagDocument, RetrievedContext, Startup } from '../types'
import { db } from './firebase'

const ragCollection = (uid: string, startupId: string) =>
  collection(db, 'users', uid, 'startups', startupId, 'ragDocuments')

const memoryCache = new Map<string, { revision: string; documents: RagDocument[] }>()

function hashText(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function readable(value: unknown) {
  return JSON.stringify(value, (_key, item) => item === '' ? undefined : item, 2)
}

export function buildStartupRagDocuments(startup: Startup): RagDocument[] {
  const sections: Array<[string, string, unknown, string[]]> = [
    ['profile', 'Startup profile', {
      name: startup.name, category: startup.category, idea: startup.idea,
      description: startup.description, targetMarket: startup.targetMarket,
      targetCustomer: startup.targetCustomer, geographicMarket: startup.geographicMarket,
      expectedSellingPrice: startup.expectedSellingPrice, launchTimeline: startup.launchTimeline,
      stage: startup.stage,
    }, ['startup', 'idea', 'market', 'customer', 'launch']],
    ['founder', 'Founder and available resources', startup.founder, ['founder', 'budget', 'experience', 'location']],
    ['analysis', 'Idea analysis', startup.analysis, ['analysis', 'feasibility', 'market', 'strategy']],
    ['identity', 'Identity and business model', startup.identity, ['identity', 'business model', 'positioning']],
    ['product', 'Product plan and specifications', startup.product, ['product', 'specification', 'mvp', startup.category]],
    ['bom', 'Bill of materials', startup.bom, ['bom', 'component', 'cost', 'supplier']],
    ['manufacturing', 'Manufacturing plan', startup.manufacturing, ['manufacturing', 'factory', 'quality', 'capacity']],
    ['supply-chain', 'Supply-chain plan', startup.supplyChain, ['supply chain', 'supplier', 'logistics']],
    ['distribution', 'Distribution plan', startup.distribution, ['distribution', 'sales', 'channel']],
    ['compliance', 'Saved compliance checklist', startup.compliance, ['compliance', 'legal', 'regulatory', 'certification']],
    ['financials', 'Financial assumptions', startup.financials, ['finance', 'price', 'cost', 'margin', 'capital']],
    ['team', 'Team and hiring plan', startup.team, ['team', 'hire', 'role', 'salary']],
    ['risks', 'Risk register', startup.risks, ['risk', 'mitigation', 'probability', 'impact']],
    ['roadmap', 'Roadmap and milestones', startup.roadmap, ['roadmap', 'milestone', 'timeline', 'launch']],
    ['scaling', 'Scaling plan', startup.scaling, ['scaling', 'capacity', 'growth']],
    ['conversations', 'Recent copilot decisions', startup.conversations.slice(-12), ['conversation', 'decision', 'copilot']],
  ]

  return sections.map(([id, title, value, tags]) => {
    const content = readable(value)
    return {
      id,
      kind: 'startup',
      title,
      content,
      tags: tags.map((tag) => tag.toLowerCase()),
      sourcePath: `users/${startup.ownerId}/startups/${startup.id}`,
      updatedAt: startup.updatedAt,
      contentHash: hashText(content),
    }
  })
}

function getStoredHashes(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

/**
 * Mirrors startup sections into the owner's private Firestore RAG subcollection.
 * It is called on demand by the copilot and only writes sections whose hash changed.
 */
export async function syncStartupRagDocuments(startup: Startup) {
  const documents = buildStartupRagDocuments(startup)
  const storageKey = `buildmyidea:rag-hashes:${startup.ownerId}:${startup.id}`
  const storedHashes = getStoredHashes(storageKey)
  const changed = documents.filter((item) => storedHashes[item.id] !== item.contentHash)

  if (changed.length > 0) {
    const batch = writeBatch(db)
    changed.forEach((item) => batch.set(doc(ragCollection(startup.ownerId, startup.id), item.id), item))
    await batch.commit()
    try {
      localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(documents.map((item) => [item.id, item.contentHash]))))
    } catch {
      // Storage can be unavailable in private browsing; Firestore remains authoritative.
    }
  }

  return documents
}

export function isComplianceQuery(query: string) {
  return /\b(compliance|legal|law|regulat|certif|licen[cs]e|bis|crs|wpc|eta|e-?waste|epr|gst|tax|incorporat|spice|dpiit|label|packag|government)\b/i.test(query)
}

function tokens(value: string) {
  return value.toLowerCase().match(/[a-z0-9+.-]{2,}/g) ?? []
}

export function rankRagDocuments(query: string, documents: RagDocument[], limit = 6): RetrievedContext[] {
  const queryTokens = [...new Set(tokens(query))]
  const complianceIntent = isComplianceQuery(query)

  return documents
    .map((document) => {
      const title = document.title.toLowerCase()
      const tags = document.tags.join(' ').toLowerCase()
      const bodyTokens = tokens(document.content)
      let score = 0

      queryTokens.forEach((token) => {
        if (title.includes(token)) score += 5
        if (tags.includes(token)) score += 4
        score += Math.min(3, bodyTokens.filter((item) => item === token).length)
      })

      if (complianceIntent && document.kind === 'government-compliance') score += 3
      return { document, score }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
}

/** Retrieves private startup documents from Firestore and joins official sources only for legal intent. */
export async function retrieveRagContext(startup: Startup, query: string, limit = 6): Promise<RetrievedContext[]> {
  const cacheKey = `${startup.ownerId}:${startup.id}`
  let startupDocuments: RagDocument[]
  const cached = memoryCache.get(cacheKey)

  if (cached?.revision === startup.updatedAt) {
    startupDocuments = cached.documents
  } else {
    const localDocuments = buildStartupRagDocuments(startup)
    try {
      await syncStartupRagDocuments(startup)
      const snapshot = await getDocs(ragCollection(startup.ownerId, startup.id))
      startupDocuments = snapshot.empty
        ? localDocuments
        : snapshot.docs.map((item) => item.data() as RagDocument)
    } catch {
      // The app remains useful offline; locally built documents are identical to the write payload.
      startupDocuments = localDocuments
    }
    memoryCache.set(cacheKey, { revision: startup.updatedAt, documents: startupDocuments })
  }

  const corpus = isComplianceQuery(query)
    ? [...startupDocuments, ...complianceKnowledge]
    : startupDocuments
  return rankRagDocuments(query, corpus, limit)
}

export function governmentSourcesFor(startup: Startup) {
  const productText = `${startup.category} ${startup.idea} ${readable(startup.product)}`.toLowerCase()
  return complianceKnowledge.filter((document) => {
    if (document.id === 'bis-crs-electronics') return /laptop|notebook|tablet/.test(productText)
    if (document.id === 'dot-wpc-eta') return /wifi|wi-fi|bluetooth|wireless|radio|laptop|phone|tablet|iot|wearable/.test(productText)
    if (document.id === 'cpcb-ewaste-epr') return true
    if (document.id === 'legal-metrology-packaged-commodities') return true
    return true
  })
}
