import { useEffect, useRef, useState } from 'react'
import { Check, MessageCircle, Play, Save, Car, Timer, UserX, X, Undo2 } from 'lucide-react'
import type { Screen } from '../App'
import type { ToastMsg } from './Toast'
import { TopBar } from './TopBar'
import { StationPicker } from './StationPicker'
import {
  EMPTY_ANSWERS,
  MULTI_SEP,
  QUESTIONS,
  durationStats,
  fmtDuration,
  splitMulti,
  type Answers,
  type Question,
  type QuestionId,
} from '../lib/model'
import {
  addRefusal,
  addResponse,
  isToday,
  undoLastRefusal,
  useCurrentStation,
  useRefusals,
  useResponses,
} from '../lib/storage'

function vibrate(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* unsupported */
  }
}

export function Survey({
  go,
  showToast,
}: {
  go: (s: Screen) => void
  showToast: (text: string, kind?: ToastMsg['kind']) => void
}) {
  const station = useCurrentStation()
  const responses = useResponses()
  const refusals = useRefusals()
  const today = responses.filter((r) => isToday(r.createdAt))
  const refusalsToday = refusals.filter((r) => isToday(r.createdAt))
  const todayStats = durationStats(today)
  const last = responses[responses.length - 1]
  const approached = today.length + refusalsToday.length
  const rate = approached === 0 ? null : Math.round((today.length / approached) * 100)

  // Timer: null = waiting at the start gate, number = Date.now() when "Iniciar" was pressed.
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (startedAt === null) return
    setElapsed(0)
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250)
    return () => clearInterval(t)
  }, [startedAt])

  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [plate, setPlate] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const answered = QUESTIONS.filter((q) => answers[q.id]).length
  const hasStation = station.trim().length > 0
  const complete = answered === QUESTIONS.length && hasStation

  const reset = () => {
    setAnswers(EMPTY_ANSWERS)
    setPlate('')
    setWhatsapp('')
    setStartedAt(null)
    window.scrollTo({ top: 0 })
  }

  const start = () => {
    if (!hasStation) return
    vibrate(20)
    setStartedAt(Date.now())
    window.scrollTo({ top: 0 })
  }

  const cancel = () => {
    if (answered > 0 && !confirm('¿Cancelar esta encuesta? Las respuestas marcadas se pierden.')) return
    reset()
  }

  const refuse = () => {
    if (!hasStation) return
    vibrate(20)
    addRefusal(station)
    showToast('Registrado: no quiso participar', 'info')
  }

  const scrollToNext = (qid: QuestionId) => {
    const idx = QUESTIONS.findIndex((q) => q.id === qid)
    const next = QUESTIONS[idx + 1]?.id ?? 'leads'
    requestAnimationFrame(() => {
      sectionRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const select = (q: Question, value: string) => {
    vibrate()
    if (q.multi) {
      const current = splitMulti(answers[q.id])
      const max = q.max ?? Infinity
      let next: string[]
      if (current.includes(value)) {
        next = current.filter((v) => v !== value)
      } else if (value === 'nada') {
        next = ['nada'] // "nothing bothers me" is exclusive
      } else {
        const base = current.filter((v) => v !== 'nada')
        if (base.length >= max) {
          vibrate(40)
          return
        }
        next = [...base, value]
      }
      setAnswers((a) => ({ ...a, [q.id]: next.join(MULTI_SEP) }))
      if (next.length >= max || value === 'nada') scrollToNext(q.id)
      return
    }
    const first = !answers[q.id]
    setAnswers((a) => ({ ...a, [q.id]: value }))
    if (first) scrollToNext(q.id)
  }

  const save = () => {
    if (!complete || saving || startedAt === null) return
    setSaving(true)
    const durationSec = Math.round((Date.now() - startedAt) / 1000)
    const s = addResponse({
      ...answers,
      station,
      plate: plate.trim(),
      whatsapp: whatsapp.trim(),
      startedAt: new Date(startedAt).toISOString(),
      durationSec,
    })
    vibrate(30)
    showToast(`Respuesta #${s.seq} guardada · ${fmtDuration(durationSec)}`)
    reset()
    setTimeout(() => setSaving(false), 300)
  }

  // ---------------------------------------------------------------- start gate
  if (startedAt === null) {
    return (
      <>
        <TopBar
          title="Nueva encuesta"
          subtitle={`${station || 'Sin estación'} · ${today.length} hoy`}
          onBack={() => go('home')}
        />
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5">
          <StationPicker />

          <div className="grid grid-cols-3 gap-2.5">
            <Stat label="Hoy" value={String(today.length)} />
            <Stat label="Promedio hoy" value={fmtDuration(todayStats?.avg)} />
            <Stat label="Última" value={fmtDuration(last?.durationSec)} />
          </div>

          <button
            type="button"
            onClick={start}
            disabled={!hasStation}
            className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-3xl bg-brand-600 px-6 py-8 text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-[0.98] active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            <Play className="size-14" strokeWidth={2.5} fill="currentColor" />
            <span className="text-2xl font-extrabold tracking-wide">INICIAR ENCUESTA</span>
            <span className={`text-sm font-medium ${hasStation ? 'text-brand-100' : ''}`}>
              {hasStation
                ? 'Toca cuando el conductor acepte participar. Arranca el cronómetro.'
                : 'Primero selecciona o agrega la estación'}
            </span>
          </button>

          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={refuse}
              disabled={!hasStation}
              className="flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl border-2 border-slate-300 bg-white text-base font-bold text-slate-700 active:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
            >
              <UserX className="size-6 text-slate-400" />
              <span className="flex flex-col items-start leading-tight">
                <span>No quiso participar</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Hoy: {refusalsToday.length}
                  {rate !== null && ` · tasa de respuesta ${rate}%`}
                </span>
              </span>
            </button>
            {refusalsToday.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  undoLastRefusal()
                  showToast('Última negativa deshecha', 'info')
                }}
                aria-label="Deshacer última negativa"
                className="flex w-16 items-center justify-center rounded-2xl border-2 border-slate-300 bg-white text-slate-500 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <Undo2 className="size-6" />
              </button>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            El tiempo se mide desde Iniciar hasta Guardar. Las negativas cuentan para la tasa de respuesta.
          </p>
        </main>
      </>
    )
  }

  // ---------------------------------------------------------------- questions
  return (
    <>
      <TopBar
        title="Nueva encuesta"
        subtitle={`${station} · ${answered}/${QUESTIONS.length} respondidas`}
        onBack={() => go('home')}
        right={
          <>
            <span
              className="mr-1 flex h-10 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-base font-bold tabular-nums text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              aria-label="Tiempo transcurrido"
            >
              <Timer className="size-4 text-brand-600" />
              {fmtDuration(elapsed)}
            </span>
            <button
              type="button"
              onClick={cancel}
              aria-label="Cancelar encuesta"
              className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-200 dark:text-slate-300 dark:active:bg-slate-700"
            >
              <X className="size-6" />
            </button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-32 pt-4">
        <div className="flex flex-col gap-8">
          {QUESTIONS.map((q, i) => {
            const selected = splitMulti(answers[q.id])
            const done = selected.length > 0
            const newBlock = i === 0 || QUESTIONS[i - 1].block !== q.block
            return (
              <section
                key={q.id}
                ref={(el) => {
                  sectionRefs.current[q.id] = el
                }}
                className="scroll-mt-20"
                aria-labelledby={`${q.id}-title`}
              >
                {newBlock && (
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-500">
                    {q.block}
                  </p>
                )}
                <div className="mb-3 flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      done ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {done ? <Check className="size-5" strokeWidth={3} /> : i + 1}
                  </span>
                  <div>
                    <h2 id={`${q.id}-title`} className="text-lg font-bold leading-snug">
                      {q.title}
                    </h2>
                    {q.subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{q.subtitle}</p>}
                  </div>
                </div>

                <div
                  className="grid grid-cols-1 gap-2.5"
                  role={q.multi ? 'group' : 'radiogroup'}
                  aria-labelledby={`${q.id}-title`}
                >
                  {q.options.map((o) => {
                    const active = selected.includes(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        role={q.multi ? 'checkbox' : 'radio'}
                        aria-checked={active}
                        onClick={() => select(q, o.value)}
                        className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-100 active:scale-[0.98] ${
                          active
                            ? 'animate-pop border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/30'
                            : 'border-slate-200 bg-white text-slate-900 active:border-brand-500 active:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:active:border-brand-500 dark:active:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center border-2 ${
                            q.multi ? 'rounded-md' : 'rounded-full'
                          } ${active ? 'border-white bg-white text-brand-600' : 'border-slate-300 dark:border-slate-500'}`}
                        >
                          {active && <Check className="size-4" strokeWidth={3} />}
                        </span>
                        <span className="flex-1">
                          <span className="block text-base font-semibold leading-tight">{o.label}</span>
                          {o.hint && (
                            <span className={`block text-sm ${active ? 'text-brand-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              {o.hint}
                            </span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}

          <section
            ref={(el) => {
              sectionRefs.current.leads = el
            }}
            className="scroll-mt-20"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-500">Lead</p>
            <div className="mb-3 flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {QUESTIONS.length + 1}
              </span>
              <div>
                <h2 className="text-lg font-bold leading-snug">¿Le avisamos cuando funcione en esta estación?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Opcional · placa y/o WhatsApp</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 focus-within:border-brand-500 dark:border-slate-700 dark:bg-slate-800">
                <Car className="size-6 shrink-0 text-slate-400" />
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="Placa del vehículo"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={10}
                  className="h-14 w-full bg-transparent text-lg font-semibold uppercase tracking-wider outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 focus-within:border-brand-500 dark:border-slate-700 dark:bg-slate-800">
                <MessageCircle className="size-6 shrink-0 text-slate-400" />
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+\s-]/g, ''))}
                  placeholder="Número de WhatsApp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={20}
                  className="h-14 w-full bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </label>
            </div>
          </section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur dark:border-slate-800 dark:bg-[#0b1220]/95">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={save}
            disabled={!complete || saving}
            className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-brand-600 text-xl font-extrabold tracking-wide text-white shadow-lg shadow-brand-600/30 transition-all active:scale-[0.98] active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            <Save className="size-7" />
            {complete
              ? 'GUARDAR Y SIGUIENTE'
              : answered < QUESTIONS.length
                ? `Faltan ${QUESTIONS.length - answered} respuestas`
                : 'Selecciona la estación'}
          </button>
        </div>
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
    </div>
  )
}
