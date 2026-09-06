import { CheckCircle2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ToastValue { toast: (message: string) => void }
const ToastContext = createContext<ToastValue>({ toast: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const toast = useCallback((next: string) => { setMessage(next); window.setTimeout(() => setMessage(''), 3200) }, [])
  return <ToastContext.Provider value={{ toast }}>{children}{message && <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-xl"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{message}<button onClick={() => setMessage('')} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}</ToastContext.Provider>
}
export const useToast = () => useContext(ToastContext)
