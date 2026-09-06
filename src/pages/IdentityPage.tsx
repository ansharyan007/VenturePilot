import { useState } from 'react'
import { StartupPageState } from '../components/StartupPageState'
import { PageHeader, Section, Textarea } from '../components/ui'
import { PageSaveBar } from '../components/PageSaveBar'
import type { Identity, Startup, StartupUpdate } from '../types'
import { useToast } from '../context/ToastContext'

function IdentityView({startup,save}:{startup:Startup;save:(u:StartupUpdate)=>Promise<void>}){const [identity,setIdentity]=useState(startup.identity);const [saving,setSaving]=useState(false);const {toast}=useToast();const update=(key:keyof Identity,value:string)=>setIdentity(i=>({...i,[key]:value}));const doSave=async()=>{setSaving(true);try{await save({identity,progress:Math.max(startup.progress,24)});toast('Startup identity saved')}finally{setSaving(false)}};const fields:[keyof Identity,string][]=[['mission','Mission'],['vision','Vision'],['problem','Problem'],['solution','Solution'],['valueProposition','Value proposition'],['targetMarket','Target market'],['customerPersona','Customer persona'],['businessModel','Business model'],['brandPositioning','Brand positioning']];return <><PageHeader eyebrow="Foundation" title="Startup Identity" description="Turn the idea into a clear strategic identity. Every AI-assisted field remains founder-editable."/><Section title={startup.name} description={`Product category: ${startup.category}`}><div className="grid gap-5 md:grid-cols-2">{fields.map(([key,label])=><Textarea key={key} label={label} value={identity[key]} onChange={e=>update(key,e.target.value)}/>)}</div></Section><PageSaveBar saving={saving} onSave={doSave}/></>}
export function IdentityPage(){return <StartupPageState>{state=><IdentityView {...state}/>}</StartupPageState>}
