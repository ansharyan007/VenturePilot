import type { Startup, IdeaAnalysis, Identity, ProductPlan, BOMItem, Risk, Milestone } from '../types'

export interface AIService {
  analyzeIdea(startup: Startup): Promise<IdeaAnalysis>
  generateStartupIdentity(startup: Startup): Promise<Identity>
  generateProductPlan(startup: Startup): Promise<ProductPlan>
  generateBOM(startup: Startup): Promise<BOMItem[]>
  generateManufacturingPlan(startup: Startup): Promise<Startup['manufacturing']>
  generateSupplyChain(startup: Startup): Promise<Startup['supplyChain']>
  generateDistributionPlan(startup: Startup): Promise<Startup['distribution']>
  generateComplianceChecklist(startup: Startup): Promise<Startup['compliance']>
  generateFinancialAssumptions(startup: Startup): Promise<Startup['financials']>
  generateRiskAnalysis(startup: Startup): Promise<Risk[]>
  generateRoadmap(startup: Startup): Promise<Milestone[]>
  updateStartupFromConversation(startup: Startup, message: string): Promise<{ reply: string; update?: Partial<Startup> }>
  generateBlueprint(startup: Startup): Promise<string>
}

const wait = () => new Promise((resolve) => window.setTimeout(resolve, 450))

export class MockAIService implements AIService {
  async analyzeIdea(startup: Startup) { await wait(); return { ...startup.analysis, concept: startup.description || startup.idea } }
  async generateStartupIdentity(startup: Startup) { await wait(); return startup.identity }
  async generateProductPlan(startup: Startup) { await wait(); return startup.product }
  async generateBOM(startup: Startup) { await wait(); return startup.bom }
  async generateManufacturingPlan(startup: Startup) { await wait(); return startup.manufacturing }
  async generateSupplyChain(startup: Startup) { await wait(); return startup.supplyChain }
  async generateDistributionPlan(startup: Startup) { await wait(); return startup.distribution }
  async generateComplianceChecklist(startup: Startup) { await wait(); return startup.compliance }
  async generateFinancialAssumptions(startup: Startup) { await wait(); return startup.financials }
  async generateRiskAnalysis(startup: Startup) { await wait(); return startup.risks }
  async generateRoadmap(startup: Startup) { await wait(); return startup.roadmap }
  async updateStartupFromConversation(startup: Startup, message: string) {
    await wait()
    const priceMatch = message.match(/(?:₹|rs\.?|inr)?\s*([\d,]{4,})/i)
    if (/selling price|price to/i.test(message) && priceMatch) {
      const price = Number(priceMatch[1].replace(/,/g, ''))
      return { reply: `I updated the planned selling price to ₹${price.toLocaleString('en-IN')}. Unit economics will recalculate from the structured financial model.`, update: { expectedSellingPrice: price, financials: { ...startup.financials, sellingPrice: price } } }
    }
    if (/biggest risk|top risk/i.test(message)) {
      const top = [...startup.risks].sort((a, b) => b.probability * b.impact - a.probability * a.impact)[0]
      return { reply: top ? `Your highest scored risk is “${top.title}” (${top.probability * top.impact}/25). Current mitigation: ${top.mitigation}` : 'Add risks first and I’ll compare their probability × impact scores.' }
    }
    if (/team|hire|before launch/i.test(message)) {
      const roles = startup.team.filter((role) => /now|prototype|pre-launch/i.test(role.hiringStage)).map((role) => role.role)
      return { reply: `For the current ${startup.stage.toLowerCase()} stage, prioritize ${roles.slice(0, 5).join(', ') || 'product, engineering, quality, and supply-chain ownership'}. Keep fixed hiring gated by prototype and demand milestones.` }
    }
    if (/bom|cost/i.test(message)) {
      const costly = [...startup.bom].sort((a, b) => b.quantity * b.unitCost - a.quantity * a.unitCost).slice(0, 3).map((item) => item.component)
      return { reply: `Start cost-down work with ${costly.join(', ')}. Validate alternate specifications, volume tiers, and dual sources without weakening reliability. Demo estimates are not supplier quotes.` }
    }
    return { reply: `For ${startup.name}, I’d treat that as a planning hypothesis. Tie the decision to a measurable gate—customer evidence, target cost, quality, compliance, or cash runway—and record the assumption in the relevant module.` }
  }
  async generateBlueprint(startup: Startup) { await wait(); return `${startup.name}: ${startup.idea}` }
}

export const aiService: AIService = new MockAIService()
