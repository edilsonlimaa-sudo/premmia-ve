import { useState } from 'react'
import { Check, Fuel, Plus, X } from 'lucide-react'
import { addStation, setCurrentStation, useCurrentStation, useStations } from '../lib/storage'

export function StationPicker({ compact = false }: { compact?: boolean }) {
  const stations = useStations()
  const current = useCurrentStation()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const commit = () => {
    if (name.trim()) addStation(name)
    setName('')
    setAdding(false)
  }

  return (
    <section aria-label="Estación / Gasolinera">
      {!compact && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <Fuel className="size-4" /> Estación / Gasolinera actual
        </p>
      )}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stations.map((s) => {
          const active = s === current
          return (
            <button
              key={s}
              type="button"
              onClick={() => setCurrentStation(s)}
              aria-pressed={active}
              className={`flex h-12 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-4 text-base font-semibold transition-colors active:scale-95 ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
              }`}
            >
              {active && <Check className="size-4" />}
              {s}
            </button>
          )
        })}
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              commit()
            }}
            className="flex shrink-0 items-center gap-1"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la estación"
              maxLength={40}
              className="h-12 w-48 rounded-full border-2 border-brand-500 bg-white px-4 text-base outline-none dark:bg-slate-800"
            />
            <button
              type="submit"
              aria-label="Agregar estación"
              className="flex size-12 items-center justify-center rounded-full bg-brand-600 text-white"
            >
              <Check className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              onClick={() => {
                setAdding(false)
                setName('')
              }}
              className="flex size-12 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            >
              <X className="size-5" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label="Agregar estación"
            className="flex h-12 shrink-0 items-center gap-1 rounded-full border-2 border-dashed border-slate-400 px-4 text-base font-semibold text-slate-600 active:scale-95 dark:border-slate-500 dark:text-slate-300"
          >
            <Plus className="size-5" /> Nueva
          </button>
        )}
      </div>
    </section>
  )
}
