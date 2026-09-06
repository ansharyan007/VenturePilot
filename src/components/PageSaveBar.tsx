import { Save } from 'lucide-react'
import { Button } from './ui'

export function PageSaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) { return <div className="sticky bottom-4 z-20 mt-6 flex justify-end"><div className="rounded-2xl border bg-white/95 p-2 shadow-lg backdrop-blur"><Button onClick={onSave} loading={saving}><Save className="h-4 w-4" />Save changes</Button></div></div> }
