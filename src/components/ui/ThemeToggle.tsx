import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  return <button
    type="button"
    onClick={toggleTheme}
    aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
    title={`Switch to ${dark ? 'light' : 'dark'} mode`}
    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
  >
    {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    {!compact && <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>}
  </button>
}
