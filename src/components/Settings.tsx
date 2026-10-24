import { useEffect, useState } from 'react'
import { AlertTriangle, Database, Fuel, RotateCcw, Trash2, X } from 'lucide-react'
import type { Screen } from '../App'
import type { ToastMsg } from './Toast'
import { TopBar } from './TopBar'
import { clearResponses, resetApp, useResponses, useStations } from '../lib/storage'

const KEYWORD = 'BORRAR'

type Danger = {
  title: string
  description: string
  button: string
  run: () => void
}

export function Settings({
  go,
  showToast,
}: {
  go: (s: Screen) => void
  showToast: (text: string, kind?: ToastMsg['kind']) => void
}) {
  const responses = useResponses()
  const stations = useStations()
  const [danger, setDanger] = useState<Danger | null>(null)

  const dangers: Danger[] = [
    {
      title: 'Borrar todas las respuestas',
      description: `Elimina las ${responses.length} respuestas guardadas en este teléfono. Las estaciones y el tema se mantienen.`,
      button: 'Borrar respuestas',
      run: () => {
        clearResponses()
        showToast('Respuestas borradas', 'info')
      },
    },
    {
      title: 'Restablecer la aplicación',
      description:
        'Borra TODO: respuestas, estaciones, estación seleccionada y tema. La app vuelve a su estado inicial, como recién instalada.',
      button: 'Restablecer app',
      run: () => resetApp(),
    },
  ]

  return (
    <>
      <TopBar title="Ajustes" subtitle="Datos guardados en este teléfono" onBack={() => go('home')} />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 text-base font-bold">Estado</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-center gap-2">
              <Database className="size-4 text-slate-400" />
              <span className="flex-1">Respuestas guardadas</span>
              <strong className="tabular-nums">{responses.length}</strong>
            </li>
            <li className="flex items-center gap-2">
              <Fuel className="size-4 text-slate-400" />
              <span className="flex-1">Estaciones registradas</span>
              <strong className="tabular-nums">{stations.length}</strong>
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Todo se guarda solo en este dispositivo. Exporta el CSV antes de borrar cualquier cosa.
          </p>
        </section>

        <section className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-red-700 dark:text-red-300">
            <AlertTriangle className="size-5" /> Zona de peligro
          </h2>
          <p className="mb-4 text-sm text-red-800/80 dark:text-red-200/80">
            Estas acciones no se pueden deshacer. Cada una pide confirmación escribiendo{' '}
            <strong>{KEYWORD}</strong>.
          </p>
          <div className="flex flex-col gap-3">
            {dangers.map((d) => (
              <button
                key={d.title}
                type="button"
                onClick={() => setDanger(d)}
                className="flex items-center gap-3 rounded-2xl border-2 border-red-300 bg-white px-4 py-3 text-left active:bg-red-100 dark:border-red-800 dark:bg-slate-900 dark:active:bg-red-900/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                  {d.run === dangers[1].run ? <RotateCcw className="size-5" /> : <Trash2 className="size-5" />}
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-red-700 dark:text-red-300">{d.title}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-400">{d.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {danger && <DangerModal danger={danger} onClose={() => setDanger(null)} />}
    </>
  )
}

function DangerModal({ danger, onClose }: { danger: Danger; onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const ok = typed.trim().toUpperCase() === KEYWORD

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="danger-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border-2 border-red-400 bg-white p-5 shadow-2xl dark:border-red-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
            <AlertTriangle className="size-6" />
          </span>
          <div className="flex-1">
            <h3 id="danger-title" className="text-lg font-bold leading-tight">
              {danger.title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{danger.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-200 dark:active:bg-slate-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-semibold">
            Escribe <span className="font-mono text-red-700 dark:text-red-300">{KEYWORD}</span> para confirmar
          </span>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={KEYWORD}
            autoComplete="off"
            autoCapitalize="characters"
            className="h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 font-mono text-lg uppercase tracking-widest outline-none focus:border-red-500 dark:border-slate-600 dark:bg-slate-800"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-14 rounded-2xl border-2 border-slate-300 text-base font-bold active:bg-slate-100 dark:border-slate-600 dark:active:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!ok}
            onClick={() => {
              onClose()
              danger.run()
            }}
            className="h-14 rounded-2xl bg-red-600 text-base font-bold text-white active:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {danger.button}
          </button>
        </div>
      </div>
    </div>
  )
}
