import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from './ui'
import type { Startup, StartupUpdate } from '../types'
import { useStartup } from '../hooks/useStartup'
import { DecisionWorkbench } from './DecisionWorkbench'
import { AgentWorkbench } from './AgentWorkbench'
import { useLocation } from 'react-router-dom'
import type { AgentRole } from '../types/agents'
import { ModuleVisual } from './ModuleVisual'

export function StartupPageState({ children }: { children: (state: { startup: Startup; save: (update: StartupUpdate) => Promise<void> }) => ReactNode }) {
  const { startup, loading, error, save } = useStartup()
  const location = useLocation()
  const module = location.pathname.split('/').pop() || ''
  const specialist: Record<string, AgentRole> = { team: 'team', scaling: 'scaling', finance: 'finance', bom: 'product', product: 'product', manufacturing: 'product', 'supply-chain': 'product', distribution: 'scaling', compliance: 'compliance', risks: 'planner', roadmap: 'planner', identity: 'planner' }
  if (loading) return <Skeleton />
  if (error || !startup) return <div className="card p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500" /><h2 className="mt-3 font-semibold">Startup unavailable</h2><p className="mt-1 text-sm text-slate-500">{error || 'This startup could not be found.'}</p></div>
  return <><DecisionWorkbench key={startup.id} startup={startup} />{module !== 'copilot' && module !== 'blueprint' && <details className="mb-5 print:hidden"><summary className="cursor-pointer rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm font-semibold text-brand-800">Ask the {specialist[module] || 'planner'} agent to review this plan → reviewer checks the findings</summary><AgentWorkbench key={`${startup.id}-${module}`} startup={startup} save={save} initialRole={specialist[module] || 'planner'} /></details>}<ModuleVisual startup={startup} module={module} />{children({ startup, save })}</>
}
