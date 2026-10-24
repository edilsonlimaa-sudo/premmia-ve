import { useState } from 'react'
import { Check, Fuel, Plus, X } from 'lucide-react'
import {
  addStation,
  removeStation,
  setCurrentStation,
  useCurrentStation,
  useStations,
} from '../lib/storage'

export function StationPicker({ allowRemove = false }: { allowRemove?: boolean }) {
  const stations = useStations()
  const current = useCurrentStation()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const empty = stations.length === 0

  const commit = () => {
    if (name.trim()) addStation(name)
    setName('')
    setAdding(false)
  }

  const remove = (s: string) => {
    if (confirm(`¿Quitar la estación "${s}" de la lista? Las respuestas ya guardadas no se borran.`)) {
      removeStation(s)
    }
  }

  return (
    <section aria-label="Estación / Gasolinera">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Fuel className="size-4" /> Estación / Gasolinera actual
      </p>
      {empty && !adding && (
        <p className="mb-2 text-sm text-amber-700 dark:text-amber-300">
          Aún no hay estaciones. Agrega la primera para empezar a encuestar.
        </p>
      )}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stations.map((s) => {
          const active = s === current
          return (
            <div key={s} className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => setCurrentStation(s)}
                aria-pressed={active}
                className={`flex h-12 items-center gap-1.5 whitespace-nowrap border-2 px-4 text-base font-semibold transition-colors active:scale-95 ${
                  active && allowRemove ? 'rounded-l-full' : 'rounded-full'
                } ${
                  active
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                {active && <Check className="size-4" />}
                {s}
              </button>
              {active && allowRemove && (
                <button
                  type="button"
                  onClick={() => remove(s)}
                  aria-label={`Quitar estación ${s}`}
                  className="flex h-12 items-center rounded-r-full border-2 border-l-0 border-brand-600 bg-brand-700 pl-2 pr-3 text-white active:bg-brand-600"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
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
              className="h-12 w-52 rounded-full border-2 border-brand-500 bg-white px-4 text-base outline-none dark:bg-slate-800"
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
            className={`flex h-12 shrink-0 items-center gap-1 rounded-full border-2 px-4 text-base font-semibold active:scale-95 ${
              empty
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-dashed border-slate-400 text-slate-600 dark:border-slate-500 dark:text-slate-300'
            }`}
          >
            <Plus className="size-5" /> {empty ? 'Agregar estación' : 'Nueva'}
          </button>
        )}
      </div>
    </section>
  )
}
