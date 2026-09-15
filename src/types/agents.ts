export type AgentRole = 'planner' | 'product' | 'finance' | 'compliance' | 'team' | 'scaling' | 'reviewer'
export interface AgentAction { title: string; module: string; reason: string; evidenceIds: string[] }
export interface AgentFinding { role: AgentRole; model: string; summary: string; actions: AgentAction[]; uncertainties: string[]; evidenceIds: string[] }
export interface AgentEvidence { id: string; title: string; content: string; sourceUrl?: string; score: number; kind: 'startup' | 'government' }
export interface AgentRun { id: string; question: string; createdAt: string; findings: AgentFinding[]; evidence: AgentEvidence[]; review: AgentFinding; mode: 'multi-agent'; durationMs: number }
export interface AgentProgress { stage: string; state: 'running' | 'complete'; detail: string; elapsedMs: number }
