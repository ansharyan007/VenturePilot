export type StartupStage = 'Idea validation' | 'Product planning' | 'Prototype' | 'Pilot production' | 'Market launch' | 'Scaling'

export interface FounderProfile {
  name: string; country: string; region: string; founderCount: number; experience: string; availableBudget: number
}
export interface IdeaAnalysis {
  concept: string; problem: string; targetCustomer: string; valueProposition: string; businessModel: string; productStrategy: string; competitivePositioning: string; feasibility: string
  scores: Record<'Market potential' | 'Technical complexity' | 'Capital requirement' | 'Manufacturing difficulty' | 'Regulatory complexity' | 'Scalability', number>
}
export interface Identity {
  mission: string; vision: string; problem: string; solution: string; valueProposition: string; targetMarket: string; customerPersona: string; businessModel: string; brandPositioning: string
}
export interface ProductSpec { id: string; name: string; value: string; notes: string }
export interface ProductPlan { mvp: string; futureProducts: string; technicalRequirements: string; differentiators: string; specs: ProductSpec[] }
export interface BOMItem { id: string; component: string; quantity: number; unitCost: number; supplierType: string; criticality: 'Low' | 'Medium' | 'High'; notes: string }
export interface ManufacturingPlan { strategy: 'Contract manufacturing' | 'Own manufacturing' | 'Hybrid manufacturing'; advantages: string; disadvantages: string; complexity: string; capitalRequirements: number; workforce: string; qualityControl: string; risks: string; factorySize: number; productionLines: number; unitsPerHour: number; hoursPerDay: number; daysPerMonth: number; utilization: number }
export interface FlowStage { id: string; name: string; purpose: string; requirements: string; dependencies: string; risks: string; notes: string }
export interface DistributionPlan { model: string; stages: FlowStage[] }
export interface ComplianceItem { id: string; name: string; status: 'Not started' | 'In progress' | 'Complete' | 'Not applicable'; importance: 'Low' | 'Medium' | 'High'; description: string; nextAction: string }
export interface FinancialModel { initialCapital: number; sellingPrice: number; manufacturingCost: number; packaging: number; logistics: number; employeeExpenses: number; rent: number; marketing: number; technology: number; compliance: number; otherExpenses: number; monthlySales: number }
export interface TeamRole { id: string; role: string; salary: number; hiringStage: string; notes: string }
export interface Risk { id: string; category: string; title: string; probability: number; impact: number; mitigation: string; owner: string; status: 'Open' | 'Mitigating' | 'Resolved' }
export interface Milestone { id: string; name: string; timing: string; description: string; status: 'Planned' | 'In progress' | 'Complete' }
export interface ScalingStage { id: string; name: string; productionCapacity: string; team: string; capital: string; distribution: string; technology: string; risks: string; milestones: string }
export interface ConversationMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }

export interface Startup {
  id: string; ownerId: string; name: string; category: string; customCategory?: string; idea: string; description: string; targetMarket: string; targetCustomer: string; geographicMarket: string; expectedSellingPrice: number; launchTimeline: string; stage: StartupStage; progress: number; isDemo: boolean; createdAt: string; updatedAt: string
  founder: FounderProfile; analysis: IdeaAnalysis; identity: Identity; product: ProductPlan; bom: BOMItem[]; manufacturing: ManufacturingPlan; supplyChain: FlowStage[]; distribution: DistributionPlan; compliance: ComplianceItem[]; financials: FinancialModel; team: TeamRole[]; risks: Risk[]; roadmap: Milestone[]; scaling: ScalingStage[]; conversations: ConversationMessage[]
}

export interface UserProfile { id: string; name: string; email: string; createdAt: string }

export type StartupUpdate = Partial<Omit<Startup, 'id' | 'ownerId' | 'createdAt'>>
