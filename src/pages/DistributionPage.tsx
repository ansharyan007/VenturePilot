import { useState } from 'react'
import { StartupPageState } from '../components/StartupPageState'
import { FlowEditor } from '../components/FlowEditor'
import { PageHeader, Select } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import type { Startup, StartupUpdate } from '../types'
import { useToast } from '../context/ToastContext'

function Distribution({startup,save}:{startup:Startup;save:(u:StartupUpdate)=>Promise<void>}){const [plan,setPlan]=useState(startup.distribution);const [saving,setSaving]=useState(false);const {toast}=useToast();const doSave=async()=>{setSaving(true);try{await save({distribution:plan,progress:Math.max(startup.progress,62)});toast('Distribution plan saved')}finally{setSaving(false)}};return <><PageHeader eyebrow="Go to market" title="Distribution Planner" description="Design the customer path and define ownership at each inventory handoff."/><div className="card mb-5 max-w-md p-5"><Select label="Distribution model" value={plan.model} onChange={e=>setPlan({...plan,model:e.target.value})}>{['Direct-to-consumer','E-commerce','Retail','Distributor','Dealer','Hybrid'].map(x=><option key={x}>{x}</option>)}</Select></div><FlowEditor stages={plan.stages} onChange={stages=>setPlan({...plan,stages})}/><PageSaveBar saving={saving} onSave={doSave}/></>}
export function DistributionPage(){return <StartupPageState>{state=><Distribution {...state}/>}</StartupPageState>}
