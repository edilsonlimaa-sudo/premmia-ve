import { BarChart3, Download, Plus, Settings as SettingsIcon, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Screen } from '../App'
import type { ToastMsg } from './Toast'
import { TopBar } from './TopBar'
import { StationPicker } from './StationPicker'
import { isToday, useCurrentStation, useResponses } from '../lib/storage'
import { downloadCSV } from '../lib/csv'
import { durationStats, fmtDuration } from '../lib/model'

export function Home({
  go,
  showToast,
}: {
  go: (s: Screen) => void
  showToast: (text: string, kind?: ToastMsg['kind']) => void
}) {
  const responses = useResponses()
  const station = useCurrentStation()
  const today = responses.filter((r) => isToday(r.createdAt))
  const todayHere = today.filter((r) => r.station === station).length
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const exportCSV = () => {
    if (responses.length === 0) {
      showToast('Aún no hay respuestas para exportar', 'info')
      return
    }
    downloadCSV(responses)
    showToast(`CSV con ${responses.length} respuestas descargado`)
  }

  return (
    <>
      <TopBar
        title={station ? `Posto: ${station}` : 'Sin estación seleccionada'}
        subtitle={
          <>
            Hoy: <strong className="text-slate-800 dark:text-slate-100">{today.length}</strong>{' '}
            respuestas
            {todayHere !== today.length && ` · ${todayHere} en esta estación`}
          </>
        }
        right={
          <button
            type="button"
            onClick={() => go('settings')}
            aria-label="Ajustes"
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-700 active:bg-slate-200 dark:text-slate-200 dark:active:bg-slate-700"
          >
            <SettingsIcon className="size-6" />
          </button>
        }
      />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5">
        {offline && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            <WifiOff className="size-4 shrink-0" />
            Sin conexión. Las respuestas se guardan en este teléfono.
          </div>
        )}

        <StationPicker allowRemove />

        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Hoy" value={String(today.length)} />
          <Stat label="Total" value={String(responses.length)} />
          <Stat label="Tiempo prom. hoy" value={fmtDuration(durationStats(today)?.avg)} />
        </div>

        <button
          type="button"
          onClick={() => go('survey')}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl bg-brand-600 px-6 py-8 text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-[0.98] active:bg-brand-700"
        >
          <Plus className="size-14" strokeWidth={2.5} />
          <span className="text-2xl font-extrabold tracking-wide">NUEVA ENCUESTA</span>
          <span className="text-sm font-medium text-brand-100">Toca para empezar con el próximo conductor</span>
        </button>

        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => go('dashboard')}
            className="flex h-20 items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white px-5 text-left shadow-sm transition-transform active:scale-[0.98] active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              <BarChart3 className="size-7" />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-bold">Ver Métricas / Reporte</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">KPIs, gráficos y leads</span>
            </span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="flex h-20 items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white px-5 text-left shadow-sm transition-transform active:scale-[0.98] active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              <Download className="size-7" />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-bold">Exportar CSV</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">
                {responses.length} respuestas guardadas en el navegador
              </span>
            </span>
          </button>
        </div>

        <p className="mt-auto text-center text-xs text-slate-400 dark:text-slate-500">
          Encuesta Gasolina · Estudio de Mercado · Funciona sin internet
        </p>
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
    </div>
  )
}
