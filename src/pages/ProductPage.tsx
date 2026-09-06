import { useState } from 'react'
import { Plus } from 'lucide-react'
import { StartupPageState } from '../components/StartupPageState'
import { Button, Field, IconDelete, PageHeader, Section, Textarea } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import type { ProductPlan, Startup, StartupUpdate } from '../types'
import { useToast } from '../context/ToastContext'

function Product({ startup, save }: { startup: Startup; save: (u: StartupUpdate) => Promise<void> }) {
  const [product,setProduct]=useState<ProductPlan>(startup.product); const [saving,setSaving]=useState(false); const {toast}=useToast()
  const updateSpec=(id:string,key:'name'|'value'|'notes',value:string)=>setProduct(p=>({...p,specs:p.specs.map(x=>x.id===id?{...x,[key]:value}:x)}))
  const doSave=async()=>{setSaving(true);try{await save({product,progress:Math.max(startup.progress,30)});toast('Product blueprint saved')}finally{setSaving(false)}}
  return <><PageHeader eyebrow="Product system" title="Product Blueprint" description={`Define the MVP and technical backbone for ${startup.name}.`} /><div className="grid gap-5 lg:grid-cols-2"><Section title="Product strategy"><div className="space-y-5"><Textarea label="MVP product" value={product.mvp} onChange={e=>setProduct({...product,mvp:e.target.value})}/><Textarea label="Future products" value={product.futureProducts} onChange={e=>setProduct({...product,futureProducts:e.target.value})}/></div></Section><Section title="Product advantage"><div className="space-y-5"><Textarea label="Technical requirements" value={product.technicalRequirements} onChange={e=>setProduct({...product,technicalRequirements:e.target.value})}/><Textarea label="Product differentiators" value={product.differentiators} onChange={e=>setProduct({...product,differentiators:e.target.value})}/></div></Section></div><Section className="mt-5" title={`${startup.category} specifications`} description="Edit the suggested component categories or add your own."><div className="space-y-3">{product.specs.map(spec=><div key={spec.id} className="grid items-end gap-3 rounded-xl border bg-slate-50/60 p-3 sm:grid-cols-[.8fr_1.2fr_1fr_auto]"><Field label="Specification" value={spec.name} onChange={e=>updateSpec(spec.id,'name',e.target.value)}/><Field label="Target" value={spec.value} onChange={e=>updateSpec(spec.id,'value',e.target.value)}/><Field label="Notes" value={spec.notes} onChange={e=>updateSpec(spec.id,'notes',e.target.value)}/><IconDelete onClick={()=>setProduct(p=>({...p,specs:p.specs.filter(x=>x.id!==spec.id)}))}/></div>)}</div><Button variant="secondary" className="mt-4" onClick={()=>setProduct(p=>({...p,specs:[...p.specs,{id:crypto.randomUUID(),name:'',value:'',notes:''}]}))}><Plus className="h-4 w-4"/>Add specification</Button></Section><PageSaveBar saving={saving} onSave={doSave}/></>
}
export function ProductPage(){return <StartupPageState>{state=><Product {...state}/>}</StartupPageState>}
