import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { friendlyAuthError, login, register } from '../services/authService'
import { Button, Field } from '../components/ui'
import { duplicateDemo } from '../services/firestoreService'
import { demoStartup } from '../data/demoStartup'

function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]"><div className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16"><Link to="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white"><Sparkles className="h-4 w-4" /></span><span className="font-display text-lg font-bold">BuildMyIdea</span></Link><div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12"><Link to="/" className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back to home</Link><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>{children}</div></div><div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-end"><div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#72a68a_0,transparent_30%),radial-gradient(circle_at_80%_60%,#b99555_0,transparent_25%)]" /><div className="relative max-w-lg"><span className="eyebrow !text-brand-300">Founder operating system</span><blockquote className="mt-5 font-display text-3xl font-medium leading-snug">“Turn assumptions into a plan you can inspect, improve, and execute.”</blockquote><div className="mt-9 grid grid-cols-3 gap-3">{['28 modules','1 blueprint','Your data'].map(x => <div key={x} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">{x}</div>)}</div></div></div></div>
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false)
  return <label><span className="label">{label}</span><span className="relative block"><input className="input pr-11" type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} required minLength={6} /><button type="button" onClick={() => setVisible(!visible)} className="absolute right-3 top-2.5 text-slate-400" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
}

export function LoginPage() {
  const { user } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/dashboard" replace />
  const submit = async (e: FormEvent) => { e.preventDefault(); setLoading(true); setError(''); try { await login(email, password); navigate((location.state as { from?: string } | null)?.from || '/dashboard') } catch (err) { setError(friendlyAuthError(err)) } finally { setLoading(false) } }
  return <AuthLayout title="Welcome back" subtitle="Sign in to continue building your venture."><form onSubmit={submit} className="mt-8 space-y-5"><Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="founder@company.com" required /><PasswordField label="Password" value={password} onChange={setPassword} />{error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}<Button className="w-full" loading={loading}>Sign in <ArrowRight className="h-4 w-4" /></Button></form><p className="mt-6 text-center text-sm text-slate-500">New to BuildMyIdea? <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-900">Create an account</Link></p></AuthLayout>
}

export function RegisterPage() {
  const { user } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams(); const wantsDemo = params.get('demo') === 'true'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' }); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/dashboard" replace />
  const submit = async (e: FormEvent) => { e.preventDefault(); if (form.password !== form.confirm) { setError('Passwords do not match.'); return } setLoading(true); setError(''); try { const next = await register(form.name.trim(), form.email.trim(), form.password); if (wantsDemo) { const demoId = await duplicateDemo(next.uid, demoStartup); navigate(`/startup/${demoId}`) } else navigate('/dashboard') } catch (err) { setError(friendlyAuthError(err)) } finally { setLoading(false) } }
  return <AuthLayout title={wantsDemo ? 'Create an account to open the demo' : 'Create your founder workspace'} subtitle="Your startup plans are private to your authenticated account."><form onSubmit={submit} className="mt-8 space-y-4"><Field label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" required /><Field label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="founder@company.com" required /><PasswordField label="Password" value={form.password} onChange={value => setForm({...form, password: value})} /><PasswordField label="Confirm password" value={form.confirm} onChange={value => setForm({...form, confirm: value})} />{error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}<Button className="w-full" loading={loading}>Create account <ArrowRight className="h-4 w-4" /></Button></form><p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-semibold text-brand-700">Sign in</Link></p></AuthLayout>
}
