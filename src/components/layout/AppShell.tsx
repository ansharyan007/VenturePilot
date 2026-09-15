import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BarChart3, Blocks, Bot, Boxes, Building2, Calculator, ChevronDown, ClipboardCheck, FileText, Factory, Fingerprint, Gauge, LayoutDashboard, LogOut, Map, Menu, PackageSearch, Route, Scaling, Settings, ShieldAlert, Sparkles, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../services/authService'
import clsx from 'clsx'

const startupItems = [
  ['Visual Plan', '/visual-plan', Route],
  ['Overview', '', Gauge], ['Identity', '/identity', Fingerprint], ['Product', '/product', PackageSearch], ['BOM', '/bom', Blocks], ['Manufacturing', '/manufacturing', Factory], ['Supply Chain', '/supply-chain', Route], ['Distribution', '/distribution', Map], ['Compliance', '/compliance', ClipboardCheck], ['Finance', '/finance', Calculator], ['Team', '/team', Users], ['Risks', '/risks', ShieldAlert], ['Scaling', '/scaling', Scaling], ['Roadmap', '/roadmap', BarChart3],
] as const

export function AppShell() {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { user } = useAuth()
  const { startupId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const routeMatch = location.pathname.match(/\/startup\/([^/]+)/)
  const activeId = startupId || routeMatch?.[1]
  const startupBase = activeId && activeId !== 'new' ? `/startup/${activeId}` : ''
  const close = () => setOpen(false)
  const navClass = ({ isActive }: { isActive: boolean }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium', isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')

  const sidebar = <>
    <div className="flex h-20 items-center justify-between px-5">
      <NavLink to="/dashboard" onClick={close} className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white"><Sparkles className="h-4 w-4" /></span><span className="font-display text-lg font-bold tracking-tight">BuildMyIdea</span></NavLink>
      <button className="rounded-lg p-2 lg:hidden" onClick={close}><X className="h-5 w-5" /></button>
    </div>
    <div className="flex-1 overflow-y-auto px-3 pb-5">
      <NavLink to="/dashboard" onClick={close} className={navClass}><LayoutDashboard className="h-4 w-4" />Dashboard</NavLink>
      {startupBase ? <>
        <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">My startup</p>
        <div className="space-y-0.5">{startupItems.map(([label, suffix, Icon]) => <NavLink end={!suffix} key={label} to={`${startupBase}${suffix}`} onClick={close} className={navClass}><Icon className="h-4 w-4" />{label}</NavLink>)}</div>
        <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">AI</p>
        <NavLink to={`${startupBase}/copilot`} onClick={close} className={navClass}><Bot className="h-4 w-4" />Startup Copilot</NavLink>
        <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Documents</p>
        <NavLink to={`${startupBase}/blueprint`} onClick={close} className={navClass}><FileText className="h-4 w-4" />Startup Blueprint</NavLink>
      </> : <div className="mx-2 mt-6 rounded-xl border border-dashed p-4 text-xs leading-5 text-slate-500"><Boxes className="mb-2 h-5 w-5 text-brand-600" />Open or create a startup to access its planning workspace.</div>}
    </div>
    <div className="border-t p-3">
      <NavLink to="/settings" onClick={close} className={navClass}><Settings className="h-4 w-4" />Settings</NavLink>
      <button onClick={() => void logout()} className="mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"><LogOut className="h-4 w-4" />Logout</button>
    </div>
  </>

  return <div className="min-h-screen bg-canvas">
    {open && <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={close} />}
    <aside className={clsx('fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-white transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>{sidebar}</aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-canvas/90 px-4 backdrop-blur-md sm:px-7">
        <button className="rounded-lg border bg-white p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
        <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex"><Building2 className="h-4 w-4" />Founder workspace</div>
        <div className="relative">
          <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{(user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase()}</span><span className="hidden text-sm font-medium sm:block">{user?.displayName || user?.email?.split('@')[0]}</span><ChevronDown className="h-4 w-4 text-slate-400" /></button>
          {profileOpen && <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white p-2 shadow-xl"><p className="truncate px-3 py-2 text-xs text-slate-500">{user?.email}</p><button onClick={() => { setProfileOpen(false); navigate('/settings') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Settings className="h-4 w-4" />Account settings</button><button onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Log out</button></div>}
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] p-4 sm:p-7 lg:p-9"><Outlet /></main>
    </div>
  </div>
}
