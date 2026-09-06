import { useState } from 'react'
import { StartupPageState } from '../components/StartupPageState'
import { FlowEditor } from '../components/FlowEditor'
import { PageHeader } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import type { Startup, StartupUpdate } from '../types'
import { useToast } from '../context/ToastContext'

function Supply({startup,save}:{startup:Startup;save:(u:StartupUpdate)=>Promise<void>}){const [stages,setStages]=useState(startup.supplyChain);const [saving,setSaving]=useState(false);const {toast}=useToast();const doSave=async()=>{setSaving(true);try{await save({supplyChain:stages,progress:Math.max(startup.progress,56)});toast('Supply chain saved')}finally{setSaving(false)}};return <><PageHeader eyebrow="Operations network" title="Supply Chain Planner" description="Map every handoff from component source to customer. Capture dependencies before they become surprises."/><FlowEditor stages={stages} onChange={setStages}/><PageSaveBar saving={saving} onSave={doSave}/></>}
export function SupplyChainPage(){return <StartupPageState>{state=><Supply {...state}/>}</StartupPageState>}
