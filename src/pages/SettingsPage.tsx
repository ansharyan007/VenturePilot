import { Link } from 'react-router-dom'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme, type ThemePreference } from '../context/ThemeContext'
import { Badge, Field, PageHeader, Section } from '../components/ui'
import clsx from 'clsx'

const themes: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function SettingsPage() {
  const { user } = useAuth()
  const { preference, setPreference } = useTheme()

  return <>
    <PageHeader eyebrow="Account" title="Settings" description="Manage your profile, appearance and workspace connections." />
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Section title="Appearance" description="Choose a comfortable theme. Your choice is saved on this device.">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1.5 dark:bg-slate-950">
            {themes.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setPreference(value)} aria-pressed={preference === value} className={clsx('flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium', preference === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}><Icon className="h-4 w-4" />{label}</button>)}
          </div>
        </Section>
        <Section title="Profile"><div className="space-y-4"><Field label="Name" value={user?.displayName || ''} readOnly /><Field label="Email" value={user?.email || ''} readOnly /></div></Section>
      </div>
      <Section title="Workspace connections">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4"><div><p className="font-semibold">Firebase</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Authentication and saved startup data</p></div><Badge tone="green">Connected</Badge></div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4"><div><p className="font-semibold">Local AI runtime</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Model health is checked in Startup Copilot</p></div><Badge tone="blue">Local</Badge></div>
          <Link to="/api-status" className="btn-secondary w-full">Open API diagnostics</Link>
        </div>
      </Section>
    </div>
  </>
}
