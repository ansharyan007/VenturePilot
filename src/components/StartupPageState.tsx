import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, LoaderCircle, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button, Skeleton } from './ui'
import type { Startup, StartupUpdate } from '../types'
import type { AgentProgress } from '../types/agents'
import { useStartup } from '../hooks/useStartup'
import { requestWorkspacePlan } from '../services/agentClient'
import { getStartup } from '../services/firestoreService'
import { fillMissingPlan, hasSectionData, missingPlanningSections, planningSections, sectionLabels } from '../utils/workspacePlanning'

export function StartupPageState({ children }: { children: (state: { startup: Startup; save: (update: StartupUpdate) => Promise<void> }) => ReactNode }) {
  const { startup, loading, error, save } = useStartup()
  const [params, setParams] = useSearchParams()
  const [working, setWorking] = useState(false)
  const [planError, setPlanError] = useState('')
  const [progress, setProgress] = useState<AgentProgress[]>([])
  const [pending, setPending] = useState<StartupUpdate | null>(null)
  const controller = useRef<AbortController | null>(null)
  const autoStarted = useRef(false)
  useEffect(() => () => controller.current?.abort(), [])

  const generate = useCallback(async (retry?: StartupUpdate) => {
    if (!startup || controller.current) return
    const abort = new AbortController()
    const started = Date.now()
    controller.current = abort
    setWorking(true); setPlanError('')
    if (!retry) setProgress([])
    try {
      const proposal = retry || await requestWorkspacePlan(startup, abort.signal, update => {
        setProgress(current => [...current.filter(item => item.stage !== update.stage), update])
      })
      abort.signal.throwIfAborted()
      setPending(proposal)
      // Re-read before merging so changes saved in another tab are preserved too.
      const latest = await getStartup(startup.ownerId, startup.id)
      abort.signal.throwIfAborted()
      setProgress(current => [...current.filter(item => item.stage !== 'Save workspace'), { stage: 'Save workspace', state: 'running', detail: 'Saving structured sections and draft assumptions to your workspace.', elapsedMs: Date.now() - started }])
      await save(fillMissingPlan(latest, proposal))
      setPending(null)
    } catch (failure) {
      if (abort.signal.aborted) setPlanError('Generation cancelled. Your saved startup was not changed.')
      else setPlanError(failure instanceof Error ? failure.message : 'Could not build the plan. Check the agent server and Ollama.')
    } finally {
      controller.current = null
      setWorking(false)
    }
  }, [startup, save])

  useEffect(() => {
    if (!startup || loading || params.get('generate') !== '1' || autoStarted.current) return
    autoStarted.current = true
    const next = new URLSearchParams(params)
    next.delete('generate')
    setParams(next, { replace: true })
    if (missingPlanningSections(startup).length) void generate()
  }, [startup, loading, params, setParams, generate])

  if (loading) return <Skeleton />
  if (error || !startup) return <div className="card p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500" /><h2 className="mt-3 font-semibold">Startup unavailable</h2><p className="mt-1 text-sm text-slate-500">{error || 'This startup could not be found.'}</p></div>
  const missing = missingPlanningSections(startup)
  return <>
    {!startup.isDemo && (missing.length > 0 || startup.planningDraft || working || planError) && <section className="card mb-5 overflow-hidden border-brand-100" aria-label="Workspace planning setup">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3"><Sparkles className="mt-1 h-5 w-5 shrink-0 text-brand-700" /><div>
          <h2 className="font-semibold">{working ? 'Building your idea into a plan' : pending ? 'Your draft is ready to save' : missing.length ? `${missing.length} sections need a starting plan` : 'Your initial plan is ready'}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">{startup.planningDraft ? 'AI draft estimates · Review costs, capacity, demand and risk ratings before making decisions.' : 'Your idea → product & components → operations & costs → launch & growth. Figures will be labelled as estimates.'}</p>
        </div></div>
        {working ? <Button variant="secondary" onClick={() => controller.current?.abort()}>Cancel</Button> : (missing.length > 0 || pending) && <Button onClick={() => void generate(pending || undefined)}><Sparkles className="h-4 w-4" />{pending ? 'Retry saving draft' : 'Fill missing sections'}</Button>}
      </div>
      {working ? <div className="grid gap-2 border-t bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">{progress.map(item => <div key={item.stage} className="flex items-start gap-2 rounded-xl border bg-white p-3 text-xs">{item.state === 'complete' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-brand-600" />}<span><strong className="block">{item.stage}</strong><span className="mt-1 block text-slate-500">{item.detail}</span></span></div>)}{!progress.length && <p>Connecting to your local models…</p>}</div> : <div className="flex flex-wrap gap-2 border-t bg-slate-50 px-5 py-3">{planningSections.map(section => <span key={section} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${hasSectionData(startup, section) ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{hasSectionData(startup, section) ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}{sectionLabels[section]}</span>)}</div>}
      {planError && <p className="border-t bg-red-50 p-4 text-sm text-red-700" role="alert">{planError}{pending && ' Your generated draft is kept here. Retry saving without running the models again.'}</p>}
      {startup.planningDraft && !working && <details className="border-t px-5 py-3 text-xs"><summary className="cursor-pointer font-semibold text-brand-700">Review draft assumptions and missing evidence</summary><p className="mt-3 leading-5">{startup.planningDraft.review}</p><div className="mt-3 grid gap-4 md:grid-cols-2"><div><h3 className="font-semibold">Planning assumptions</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-slate-600">{startup.planningDraft.assumptions.map((value, index) => <li key={index}>{value}</li>)}</ul></div><div><h3 className="font-semibold">Still needs real evidence</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-slate-600">{startup.planningDraft.missingInformation.map((value, index) => <li key={index}>{value}</li>)}</ul></div></div></details>}
    </section>}
    {!working && <Fragment key={startup.planningDraft?.generatedAt || startup.id}>{children({ startup, save })}</Fragment>}
  </>
}
