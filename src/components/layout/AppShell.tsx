import { useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BarChart3, Blocks, Bot, Boxes, Building2, Calculator, ChevronDown, ClipboardCheck, FileText, Factory, Fingerprint, Gauge, LayoutDashboard, LogOut, Map, Menu, PackageSearch, Route, Scaling, Settings, ShieldAlert, Sparkles, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../services/authService'
import { ThemeToggle } from '../ui/ThemeToggle'
import clsx from 'clsx'

type NavItem = readonly [label: string, suffix: string, icon: ComponentType<{ className?: string }>]

const primaryItems: NavItem[] = [
  ['Overview', '', Gauge],
  ['Startup Journey', '/visual-plan', Route],
]

const workspaceGroups: { label: string; items: NavItem[] }[] = [
  { label: 'Define', items: [['Identity', '/identity', Fingerprint], ['Product', '/product', PackageSearch]] },
  { label: 'Build', items: [['BOM', '/bom', Blocks], ['Manufacturing', '/manufacturing', Factory], ['Supply Chain', '/supply-chain', Route], ['Distribution', '/distribution', Map], ['Compliance', '/compliance', ClipboardCheck]] },
  { label: 'Operate & grow', items: [['Finance', '/finance', Calculator], ['Team', '/team', Users], ['Risks', '/risks', ShieldAlert], ['Scaling', '/scaling', Scaling], ['Roadmap', '/roadmap', BarChart3], ['Startup Blueprint', '/blueprint', FileText]] },
]

const allItems = [...primaryItems, ...workspaceGroups.flatMap(group => group.items), ['Startup Copilot', '/copilot', Bot] as NavItem]

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
  const currentItem = allItems.find(([, suffix]) => suffix ? location.pathname.endsWith(suffix) : location.pathname === startupBase)
  const pageTitle = location.pathname === '/dashboard' ? 'Dashboard' : location.pathname === '/settings' ? 'Settings' : currentItem?.[0] || 'Founder workspace'
  const navClass = ({ isActive }: { isActive: boolean }) => clsx(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
    isActive ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
  )
  const itemLink = ([label, suffix, Icon]: NavItem) => <NavLink end={!suffix} key={label} to={`${startupBase}${suffix}`} onClick={close} className={navClass}><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></NavLink>

  const sidebar = <>
    <div className="flex h-16 items-center justify-between px-4">
      <NavLink to="/dashboard" onClick={close} className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white dark:bg-brand-600"><Sparkles className="h-4 w-4" /></span><span className="font-display text-base font-bold tracking-tight">BuildMyIdea</span></NavLink>
      <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={close} aria-label="Close navigation"><X className="h-5 w-5" /></button>
    </div>
    <div className="flex-1 overflow-y-auto px-3 pb-4">
      <NavLink to="/dashboard" onClick={close} className={navClass}><LayoutDashboard className="h-4 w-4" />Dashboard</NavLink>
      {startupBase ? <>
        <p className="mb-2 mt-5 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Current startup</p>
        <div className="space-y-1">{primaryItems.map(itemLink)}</div>
        <NavLink to={`${startupBase}/copilot`} onClick={close} className={({ isActive }) => clsx(navClass({ isActive }), 'mt-2 border border-brand-100 dark:border-brand-500/20')}><Bot className="h-4 w-4" />Startup Copilot</NavLink>
        <div className="mt-4 space-y-1">
          {workspaceGroups.map(group => {
            const active = group.items.some(([, suffix]) => location.pathname.endsWith(suffix))
            return <details key={group.label} className="nav-group" open={active || undefined}>
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"><span>{group.label}</span><ChevronDown className="h-3.5 w-3.5 transition-transform" /></summary>
              <div className="mt-1 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-700">{group.items.map(itemLink)}</div>
            </details>
          })}
        </div>
      </> : <div className="mx-1 mt-5 rounded-xl border border-dashed border-slate-300 p-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Boxes className="mb-2 h-5 w-5 text-brand-600" />Open or create a startup to access its planning workspace.</div>}
    </div>
    <div className="border-t border-slate-200 p-3 dark:border-slate-800">
      <NavLink to="/settings" onClick={close} className={navClass}><Settings className="h-4 w-4" />Settings</NavLink>
      <button onClick={() => void logout()} className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"><LogOut className="h-4 w-4" />Logout</button>
    </div>
  </>

  return <div className="min-h-screen bg-canvas dark:bg-slate-950">
    {open && <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={close} />}
    <aside className={clsx('fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>{sidebar}</aside>
    <div className="lg:pl-60">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-canvas/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</p><p className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex"><Building2 className="h-3 w-3" />Founder workspace</p></div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-expanded={profileOpen} aria-label="Open account menu"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">{(user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase()}</span><span className="hidden text-sm font-medium sm:block">{user?.displayName || user?.email?.split('@')[0]}</span><ChevronDown className="h-4 w-4 text-slate-400" /></button>
            {profileOpen && <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"><p className="truncate px-3 py-2 text-xs text-slate-500">{user?.email}</p><button onClick={() => { setProfileOpen(false); navigate('/settings') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Settings className="h-4 w-4" />Account settings</button><button onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"><LogOut className="h-4 w-4" />Log out</button></div>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>
}
