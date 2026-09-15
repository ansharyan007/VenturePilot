import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from './ui'
import type { Startup, StartupUpdate } from '../types'
import { useStartup } from '../hooks/useStartup'

export function StartupPageState({ children }: { children: (state: { startup: Startup; save: (update: StartupUpdate) => Promise<void> }) => ReactNode }) {
  const { startup, loading, error, save } = useStartup()
  if (loading) return <Skeleton />
  if (error || !startup) return <div className="card p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500" /><h2 className="mt-3 font-semibold">Startup unavailable</h2><p className="mt-1 text-sm text-slate-500">{error || 'This startup could not be found.'}</p></div>
  return <>{children({ startup, save })}</>
}
