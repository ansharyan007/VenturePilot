import { ArrowDown, Plus } from 'lucide-react'
import type { FlowStage } from '../types'
import { Button, Field, IconDelete, Textarea } from './ui'
import { ProcessFlow } from './VisualPlan'

export function FlowEditor({ stages, onChange }: { stages: FlowStage[]; onChange: (stages: FlowStage[]) => void }) {
 return <><ProcessFlow title="Process at a glance · follows your stage order" steps={stages.map(stage => ({ title: stage.name, detail: stage.purpose || 'Add a purpose for this stage.' }))} /><details><summary className="mb-4 cursor-pointer text-sm font-semibold text-brand-700">Edit stages, dependencies and risks</summary><FlowFields stages={stages} onChange={onChange} /></details></>
}

function FlowFields({ stages, onChange }: { stages: FlowStage[]; onChange: (stages: FlowStage[]) => void }) {
 const update=(id:string,key:keyof FlowStage,value:string)=>onChange(stages.map(stage=>stage.id===id?{...stage,[key]:value}:stage))
 return <div>{stages.map((stage,index)=><div key={stage.id}><div className="card p-5"><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{index+1}</span><div className="grid flex-1 gap-4 md:grid-cols-2"><Field label="Stage name" value={stage.name} onChange={e=>update(stage.id,'name',e.target.value)}/><Field label="Purpose" value={stage.purpose} onChange={e=>update(stage.id,'purpose',e.target.value)}/><Textarea label="Requirements" value={stage.requirements} onChange={e=>update(stage.id,'requirements',e.target.value)}/><Textarea label="Dependencies" value={stage.dependencies} onChange={e=>update(stage.id,'dependencies',e.target.value)}/><Textarea label="Risks" value={stage.risks} onChange={e=>update(stage.id,'risks',e.target.value)}/><Textarea label="Notes" value={stage.notes} onChange={e=>update(stage.id,'notes',e.target.value)}/></div><IconDelete onClick={()=>onChange(stages.filter(x=>x.id!==stage.id))}/></div></div>{index<stages.length-1&&<div className="flex h-10 justify-center"><ArrowDown className="mt-2 h-5 w-5 text-brand-500"/></div>}</div>)}<Button variant="secondary" className="mt-4" onClick={()=>onChange([...stages,{id:crypto.randomUUID(),name:'New stage',purpose:'',requirements:'',dependencies:'',risks:'',notes:''}])}><Plus className="h-4 w-4"/>Add stage</Button></div>
}
