import { z } from 'zod'

const text = z.string().trim().min(1).max(800)
const amount = z.number().finite().nonnegative().max(1e12)
const positive = amount.positive()
const notes = z.string().max(800)
const list = <T extends z.ZodTypeAny>(schema: T) => z.array(schema).min(1).max(12)
const row = { id: z.string().optional() }
const flow = z.object({ ...row, name: text, purpose: text, requirements: text, dependencies: text, risks: text, notes })
const importance = z.enum(['Low', 'Medium', 'High'])

export const planSections = {
  analysis: z.object({ concept: text, problem: text, targetCustomer: text, valueProposition: text, businessModel: text, productStrategy: text, competitivePositioning: text, feasibility: text, scores: z.object({ 'Market potential': amount.max(10), 'Technical complexity': amount.max(10), 'Capital requirement': amount.max(10), 'Manufacturing difficulty': amount.max(10), 'Regulatory complexity': amount.max(10), Scalability: amount.max(10) }) }),
  identity: z.object({ mission: text, vision: text, problem: text, solution: text, valueProposition: text, targetMarket: text, customerPersona: text, businessModel: text, brandPositioning: text }),
  product: z.object({ mvp: text, futureProducts: text, technicalRequirements: text, differentiators: text, specs: list(z.object({ ...row, name: text, value: text, notes })) }),
  bom: list(z.object({ ...row, component: text, quantity: positive, unitCost: positive, supplierType: text, criticality: importance, notes })),
  manufacturing: z.object({ strategy: z.enum(['Contract manufacturing', 'Own manufacturing', 'Hybrid manufacturing']), advantages: text, disadvantages: text, complexity: text, capitalRequirements: amount, workforce: text, qualityControl: text, risks: text, factorySize: amount, productionLines: positive.int(), unitsPerHour: positive, hoursPerDay: positive.max(24), daysPerMonth: positive.max(31), utilization: positive.max(100) }),
  supplyChain: list(flow),
  distribution: z.object({ model: text, stages: list(flow) }),
  compliance: list(z.object({ ...row, name: text, importance, description: text, nextAction: text, status: z.literal('Not started').default('Not started'), applicability: z.literal('Needs review').default('Needs review') })),
  financials: z.object({ initialCapital: amount, sellingPrice: positive, manufacturingCost: amount, packaging: amount, logistics: amount, employeeExpenses: amount, rent: amount, marketing: amount, technology: amount, compliance: amount, otherExpenses: amount, monthlySales: positive.int() }),
  team: list(z.object({ ...row, role: text, salary: amount, hiringStage: text, notes, hiringStatus: z.literal('Planned').default('Planned') })),
  risks: list(z.object({ ...row, category: text, title: text, probability: z.number().int().min(1).max(5), impact: z.number().int().min(1).max(5), mitigation: text, owner: text, status: z.literal('Open').default('Open') })),
  roadmap: list(z.object({ ...row, name: text, timing: text, description: text, status: z.literal('Planned').default('Planned') })),
  scaling: list(z.object({ ...row, name: text, productionCapacity: text, team: text, capital: text, distribution: text, technology: text, risks: text, milestones: text, targetUnits: positive.int(), targetBudget: amount, gateStatus: z.literal('Not reviewed').default('Not reviewed') })),
}

export const workspacePlanSchema = z.object(planSections).partial().extend({
  planningDraft: z.object({ generatedAt: z.string(), model: z.string(), modules: z.array(z.string()), assumptions: z.array(z.string()), missingInformation: z.array(z.string()), review: z.string() }),
})

// Descriptions keep local model output compact and match the schemas above.
export const planShapes: Record<keyof typeof planSections, unknown> = {
  analysis: { concept: 'text', problem: 'text', targetCustomer: 'text', valueProposition: 'text', businessModel: 'text', productStrategy: 'text', competitivePositioning: 'text', feasibility: 'text', scores: { 'Market potential': 0, 'Technical complexity': 0, 'Capital requirement': 0, 'Manufacturing difficulty': 0, 'Regulatory complexity': 0, Scalability: 0 } },
  identity: { mission: 'text', vision: 'text', problem: 'text', solution: 'text', valueProposition: 'text', targetMarket: 'text', customerPersona: 'text', businessModel: 'text', brandPositioning: 'text' },
  product: { mvp: 'text', futureProducts: 'text', technicalRequirements: 'text', differentiators: 'text', specs: [{ name: 'text', value: 'proposed target', notes: 'Assumption; validation needed' }] },
  bom: [{ component: 'idea-specific component or purchased finished unit', quantity: 1, unitCost: 'positive INR estimate', supplierType: 'type, never an invented company', criticality: 'High | Medium | Low', notes: 'Assumption; validate quote' }],
  manufacturing: { strategy: 'Contract manufacturing | Own manufacturing | Hybrid manufacturing', advantages: 'text', disadvantages: 'text', complexity: 'text', capitalRequirements: 'number INR', workforce: 'text', qualityControl: 'text', risks: 'text', factorySize: 'number sq ft (0 for outsourced)', productionLines: 'positive integer', unitsPerHour: 'positive number', hoursPerDay: 'positive number <=24', daysPerMonth: 'positive number <=31', utilization: 'positive number <=100' },
  supplyChain: [{ name: 'text', purpose: 'text', requirements: 'text', dependencies: 'text', risks: 'text', notes: 'Proposed handoff' }],
  distribution: { model: 'text', stages: [{ name: 'text', purpose: 'text', requirements: 'text', dependencies: 'text', risks: 'text', notes: 'Proposed handoff' }] },
  compliance: [{ name: 'candidate review area', importance: 'High | Medium | Low', description: 'source-grounded candidate; applicability unconfirmed', nextAction: 'confirm with official evidence' }],
  financials: { initialCapital: 'saved founder budget', sellingPrice: 'saved selling price', manufacturingCost: 'number INR per unit', packaging: 'number INR per unit', logistics: 'number INR per unit', employeeExpenses: 'number INR monthly (sum all planned salaries)', rent: 'number INR monthly', marketing: 'number INR monthly', technology: 'number INR monthly', compliance: 'number INR monthly', otherExpenses: 'number INR monthly', monthlySales: 'positive integer assumption; never validated demand' },
  team: [{ role: 'text', salary: 'number INR monthly estimate', hiringStage: 'Now | Prototype | Pre-launch | Launch | Scale', notes: 'Assumption; proposed responsibilities' }],
  risks: [{ category: 'text', title: 'idea-specific risk', probability: 'integer 1-5 hypothesis', impact: 'integer 1-5 hypothesis', mitigation: 'text', owner: 'Founder' }],
  roadmap: [{ name: 'text', timing: 'relative timing within saved launch timeline', description: 'proposed measurable exit criteria' }],
  scaling: [{ name: 'text', productionCapacity: 'proposed capacity assumption', team: 'text', capital: 'text', distribution: 'text', technology: 'text', risks: 'text', milestones: 'measurable proposed gate', targetUnits: 'positive integer', targetBudget: 'number INR' }],
}
