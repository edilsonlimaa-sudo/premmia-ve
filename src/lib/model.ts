export type Option = { value: string; label: string; hint?: string }

export type QuestionId =
  | 'uso'
  | 'frecuencia'
  | 'tiempo_pago'
  | 'molestia'
  | 'info_hoy'
  | 'metodo_pago'
  | 'intencion'
  | 'recargo'
  | 'preocupacion'
  | 'iria_directo'

export type Question = {
  id: QuestionId
  block: string
  title: string
  subtitle?: string
  options: Option[]
  /** Multiple choice: the answer stores the selected values joined by MULTI_SEP. */
  multi?: boolean
  /** Max selections for a multi question. */
  max?: number
}

export const MULTI_SEP = '|'

/** Reference fill-up used to translate the % surcharge into money in P7. Adjust to the real price. */
export const REFERENCE_FILL_USD = 15

const money = (pct: number) => {
  const v = (REFERENCE_FILL_USD * pct) / 100
  return `≈ $${v.toFixed(2).replace('.', ',')} en una carga de $${REFERENCE_FILL_USD}`
}

export const QUESTIONS: Question[] = [
  // ----------------------------------------------------------------- A. Perfil
  {
    id: 'uso',
    block: 'Perfil',
    title: '¿Cómo usa este vehículo?',
    options: [
      { value: 'particular', label: 'Particular' },
      { value: 'pasajeros', label: 'Taxi / ruta / transporte de pasajeros' },
      { value: 'delivery', label: 'Delivery / moto' },
      { value: 'comercial', label: 'Comercial / empresa' },
    ],
  },
  {
    id: 'frecuencia',
    block: 'Perfil',
    title: '¿Cada cuánto carga gasolina?',
    options: [
      { value: 'diario', label: 'Diario' },
      { value: '2-3_semana', label: '2 a 3 veces por semana' },
      { value: '1_semana', label: '1 vez por semana' },
      { value: 'eventual', label: 'Eventual / de paso' },
    ],
  },
  // ------------------------------------------------------------ B. Dolor actual
  {
    id: 'tiempo_pago',
    block: 'Hoy',
    title: '¿Cuánto tiempo le toma el pago hoy?',
    subtitle: 'Bajarse, hacer pago móvil, mostrar comprobante, recibir ticket',
    options: [
      { value: '<5', label: 'Menos de 5 minutos' },
      { value: '5-15', label: 'De 5 a 15 minutos' },
      { value: '>15', label: 'Más de 15 minutos' },
    ],
  },
  {
    id: 'molestia',
    block: 'Hoy',
    title: '¿Qué es lo más molesto de cargar gasolina hoy?',
    subtitle: 'Puede marcar varias',
    multi: true,
    options: [
      { value: 'bajarse', label: 'Bajarse del carro y hacer fila para pagar' },
      { value: 'pago_movil', label: 'Fallas del pago móvil / internet en la estación' },
      { value: 'sin_info', label: 'No saber si hay gasolina antes de llegar' },
      { value: 'cola', label: 'La espera en la cola en general' },
      { value: 'nada', label: 'Nada, está bien así' },
    ],
  },
  {
    id: 'info_hoy',
    block: 'Hoy',
    title: '¿Cómo se entera hoy de dónde hay gasolina?',
    options: [
      { value: 'whatsapp', label: 'Grupos de WhatsApp / redes' },
      { value: 'pasando', label: 'Pasando por la bomba a ver' },
      { value: 'aviso', label: 'Me avisa un amigo o chofer' },
      { value: 'nada', label: 'No me entero, voy y pruebo' },
    ],
  },
  {
    id: 'metodo_pago',
    block: 'Hoy',
    title: '¿Cómo paga normalmente?',
    options: [
      { value: 'pago_movil', label: 'Pago Móvil' },
      { value: 'usd', label: 'Efectivo (USD)' },
      { value: 'ves', label: 'Efectivo (Bs)' },
      { value: 'punto', label: 'Punto de venta / tarjeta' },
      { value: 'biopago', label: 'Biopago' },
    ],
  },
  // ---------------------------------------------------------------- C. Solución
  {
    id: 'intencion',
    block: 'La app',
    title: 'Si pudiera pagar desde el carro con una app y recibir el ticket sin bajarse, ¿la usaría?',
    options: [
      { value: 'si', label: 'Definitivamente sí' },
      { value: 'tal_vez', label: 'Tal vez / la probaría' },
      { value: 'no', label: 'No me interesa' },
    ],
  },
  {
    id: 'recargo',
    block: 'La app',
    title: '¿Cuánto más pagaría por esa comodidad?',
    subtitle: 'El máximo que aceptaría',
    options: [
      { value: '5%', label: 'Hasta 5 % más', hint: money(5) },
      { value: '3%', label: 'Hasta 3 % más', hint: money(3) },
      { value: 'fijo', label: 'Solo un monto fijo pequeño', hint: 'Unos centavos por carga' },
      { value: 'nada', label: 'Nada extra' },
    ],
  },
  {
    id: 'preocupacion',
    block: 'La app',
    title: '¿Qué le preocuparía más al pagar por la app?',
    options: [
      { value: 'no_reconocen', label: 'Que no me reconozcan el pago en la bomba' },
      { value: 'seguridad', label: 'La seguridad de mi dinero o mis datos' },
      { value: 'internet', label: 'Que falle el internet y me quede sin cargar' },
      { value: 'nada', label: 'Nada, lo usaría tranquilo' },
    ],
  },
  {
    id: 'iria_directo',
    block: 'La app',
    title: 'Si una app le dijera, antes de salir, qué estación tiene gasolina ahora y cuánta cola hay, ¿qué haría?',
    options: [
      { value: 'directo', label: 'Iría directo a esa estación' },
      { value: 'miraria', label: 'Lo miraría, pero cargo donde me quede de paso' },
      { value: 'nada', label: 'No me cambiaría nada' },
    ],
  },
]

export type Answers = Record<QuestionId, string>

export type Survey = Answers & {
  id: string
  seq: number
  station: string
  createdAt: string // ISO timestamp (when saved)
  startedAt?: string // ISO timestamp (when the interviewer pressed "Iniciar")
  durationSec?: number // seconds between start and save
  plate: string
  whatsapp: string
}

export const EMPTY_ANSWERS: Answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, ''])) as Answers

export function splitMulti(value: string | undefined): string[] {
  return value ? value.split(MULTI_SEP).filter(Boolean) : []
}

/** True when the response has `value` selected for `qid` (works for single and multi). */
export function hasValue(r: Partial<Answers>, qid: QuestionId, value: string): boolean {
  return splitMulti(r[qid]).includes(value)
}

export function labelFor(qid: QuestionId, value: string): string {
  const q = QUESTIONS.find((x) => x.id === qid)
  if (!q) return value
  return splitMulti(value)
    .map((v) => q.options.find((o) => o.value === v)?.label ?? v)
    .join(' + ')
}

// --- Derived KPIs ------------------------------------------------------------
export const wouldUse = (r: Partial<Answers>) => r.intencion === 'si' || r.intencion === 'tal_vez'
export const wouldPay = (r: Partial<Answers>) => r.recargo === '5%' || r.recargo === '3%'
/** The info-driven KPI: drivers the app could steer to a station that reports fuel + queue. */
export const wouldGoDirect = (r: Partial<Answers>) => r.iria_directo === 'directo'
/** Drivers who today have no channel with the station (find out by passing by or trying). */
export const noInfoChannel = (r: Partial<Answers>) => r.info_hoy === 'pasando' || r.info_hoy === 'nada'
export const isProfessional = (r: Partial<Answers>) => r.uso === 'pasajeros' || r.uso === 'delivery' || r.uso === 'comercial'

/** Formats seconds as m:ss. */
export function fmtDuration(sec: number | undefined | null): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function durationStats(list: { durationSec?: number }[]) {
  const d = list.map((r) => r.durationSec).filter((x): x is number => typeof x === 'number' && x >= 0)
  if (d.length === 0) return null
  const sorted = [...d].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return {
    n: d.length,
    avg: d.reduce((a, b) => a + b, 0) / d.length,
    median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

export const DURATION_BUCKETS: { label: string; max: number }[] = [
  { label: 'Menos de 45 s', max: 45 },
  { label: '45 s a 1 min', max: 60 },
  { label: '1 a 1:30 min', max: 90 },
  { label: '1:30 a 2 min', max: 120 },
  { label: 'Más de 2 min', max: Infinity },
]

// The app ships with no stations; the interviewer registers them in the app.
export const DEFAULT_STATIONS: string[] = []
