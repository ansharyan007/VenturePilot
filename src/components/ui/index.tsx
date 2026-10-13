import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

export function Button({ className, variant = 'primary', loading, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  const styles = { primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800', danger: 'inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60' }
  return <button className={clsx(styles[variant], className)} disabled={loading || props.disabled} {...props}>{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}{children}</button>
}
function canonicalNumber(value: string) {
  // Keep an empty field editable, but never pass a numeric value such as 0300
  // back to a controlled input. This applies to every numeric Field in the app.
  if (!value || !/^[-+]?\d/.test(value)) return value
  const sign = value.startsWith('-') || value.startsWith('+') ? value.slice(0, 1) : ''
  const digits = value.slice(sign.length)
  return `${sign}${digits.replace(/^0+(?=\d)/, '')}`
}

export function Field({ label, hint, onChange, onBlur, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const numeric = props.type === 'number'
  const normalize = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (numeric) event.currentTarget.value = canonicalNumber(event.currentTarget.value)
    onChange?.(event)
  }
  const normalizeOnBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (numeric) event.currentTarget.value = canonicalNumber(event.currentTarget.value)
    onBlur?.(event)
  }
  return <label><span className="label">{label}</span><input className="input" {...props} onChange={normalize} onBlur={normalizeOnBlur} />{hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}</label>
}
export function Textarea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) { return <label><span className="label">{label}</span><textarea className="input min-h-24 resize-y" {...props} /></label> }
export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) { return <label><span className="label">{label}</span><select className="input" {...props}>{children}</select></label> }
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue' }) { const map = { neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', green: 'bg-emerald-50 text-emerald-700 dark:bg-brand-500/10 dark:text-brand-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', red: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300', blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' }; return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', map[tone])}>{children}</span> }
export function Progress({ value, className }: { value: number; className?: string }) { return <div className={clsx('h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div> }
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) { return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}<h1 className="text-2xl font-semibold text-ink dark:text-white sm:text-[1.75rem]">{title}</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p></div>{actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}</div> }
export function Section({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) { return <section className={clsx('card p-4 sm:p-5', className)}><div className="mb-4"><h2 className="text-base font-semibold dark:text-slate-100">{title}</h2>{description && <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>}</div>{children}</section> }
export function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div className="card p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1.5 font-display text-2xl font-semibold text-ink dark:text-white">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}</div> }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10"><Plus className="h-5 w-5 text-brand-700 dark:text-brand-300" /></div><h3 className="font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>{action && <div className="mt-5">{action}</div>}</div> }
export function IconDelete({ onClick, label = 'Delete' }: { onClick: () => void; label?: string }) { return <button type="button" onClick={onClick} aria-label={label} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"><Trash2 className="h-4 w-4" /></button> }
export function Skeleton() { return <div className="space-y-5 animate-pulse"><div className="h-8 w-56 rounded-lg bg-slate-200 dark:bg-slate-800" /><div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />)}</div><div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-800" /></div> }
