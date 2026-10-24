import { useRef, useState } from 'react'
import { Check, MessageCircle, Save, Car } from 'lucide-react'
import type { Screen } from '../App'
import type { ToastMsg } from './Toast'
import { TopBar } from './TopBar'
import { StationPicker } from './StationPicker'
import { EMPTY_ANSWERS, QUESTIONS, type Answers, type QuestionId } from '../lib/model'
import { addResponse, isToday, useCurrentStation, useResponses } from '../lib/storage'

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
  const todayCount = responses.filter((r) => isToday(r.createdAt)).length

  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [plate, setPlate] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const topRef = useRef<HTMLDivElement | null>(null)

  const answered = QUESTIONS.filter((q) => answers[q.id]).length
  const complete = answered === QUESTIONS.length

  const select = (qid: QuestionId, value: string) => {
    vibrate()
    setAnswers((a) => ({ ...a, [qid]: value }))
    const idx = QUESTIONS.findIndex((q) => q.id === qid)
    const next = QUESTIONS[idx + 1]?.id ?? 'leads'
    // Only auto-advance when answering for the first time.
    if (!answers[qid]) {
      requestAnimationFrame(() => {
        sectionRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  const save = () => {
    if (!complete || saving) return
    setSaving(true)
    const s = addResponse({ ...answers, station, plate: plate.trim(), whatsapp: whatsapp.trim() })
    vibrate(30)
    showToast(`Respuesta #${s.seq} guardada correctamente`)
    setAnswers(EMPTY_ANSWERS)
    setPlate('')
    setWhatsapp('')
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => setSaving(false), 300)
  }

  return (
    <>
      <TopBar
        title="Nueva encuesta"
        subtitle={`${station} · ${todayCount} hoy`}
        onBack={() => go('home')}
        right={
          <span className="mr-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {answered}/{QUESTIONS.length}
          </span>
        }
      />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-32 pt-4">
        <div ref={topRef} className="scroll-mt-20">
          <StationPicker />
        </div>

        <div className="mt-6 flex flex-col gap-8">
          {QUESTIONS.map((q, i) => (
            <section
              key={q.id}
              ref={(el) => {
                sectionRefs.current[q.id] = el
              }}
              className="scroll-mt-20"
              aria-labelledby={`${q.id}-title`}
            >
              <div className="mb-3 flex items-start gap-3">
                <span
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    answers[q.id]
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {answers[q.id] ? <Check className="size-5" strokeWidth={3} /> : i + 1}
                </span>
                <div>
                  <h2 id={`${q.id}-title`} className="text-lg font-bold leading-snug">
                    {q.title}
                  </h2>
                  {q.subtitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{q.subtitle}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5" role="radiogroup" aria-labelledby={`${q.id}-title`}>
                {q.options.map((o) => {
                  const active = answers[q.id] === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => select(q.id, o.value)}
                      className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-100 active:scale-[0.98] ${
                        active
                          ? 'animate-pop border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/30'
                          : 'border-slate-200 bg-white text-slate-900 active:border-brand-500 active:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:active:border-brand-500 dark:active:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                          active ? 'border-white bg-white text-brand-600' : 'border-slate-300 dark:border-slate-500'
                        }`}
                      >
                        {active && <Check className="size-4" strokeWidth={3} />}
                      </span>
                      <span className="flex-1">
                        <span className="block text-base font-semibold leading-tight">{o.label}</span>
                        {o.hint && (
                          <span
                            className={`block text-sm ${active ? 'text-brand-100' : 'text-slate-500 dark:text-slate-400'}`}
                          >
                            {o.hint}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          <section
            ref={(el) => {
              sectionRefs.current.leads = el
            }}
            className="scroll-mt-20"
          >
            <div className="mb-3 flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                6
              </span>
              <div>
                <h2 className="text-lg font-bold leading-snug">Lead (opcional)</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Para avisarle cuando el servicio esté disponible
                </p>
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
            {complete ? 'GUARDAR Y SIGUIENTE' : `Faltan ${QUESTIONS.length - answered} respuestas`}
          </button>
        </div>
      </div>
    </>
  )
}
