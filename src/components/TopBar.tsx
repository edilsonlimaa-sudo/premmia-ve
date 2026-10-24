import type { ReactNode } from 'react'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { setTheme, useTheme } from '../lib/storage'

export function TopBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: ReactNode
  subtitle?: ReactNode
  onBack?: () => void
  right?: ReactNode
}) {
  const theme = useTheme()
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur pt-[env(safe-area-inset-top)] dark:border-slate-800 dark:bg-[#0b1220]/95">
      <div className="mx-auto flex h-16 max-w-xl items-center gap-2 px-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-700 active:bg-slate-200 dark:text-slate-200 dark:active:bg-slate-700"
          >
            <ArrowLeft className="size-7" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        {right}
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-700 active:bg-slate-200 dark:text-slate-200 dark:active:bg-slate-700"
        >
          {theme === 'dark' ? <Sun className="size-6" /> : <Moon className="size-6" />}
        </button>
      </div>
    </header>
  )
}
