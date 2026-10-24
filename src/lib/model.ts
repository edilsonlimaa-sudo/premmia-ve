export type Option = { value: string; label: string; hint?: string }

export type QuestionId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5'

export type Question = {
  id: QuestionId
  title: string
  subtitle?: string
  options: Option[]
}

export const QUESTIONS: Question[] = [
  {
    id: 'p1',
    title: 'Frecuencia de abastecimiento',
    subtitle: '¿Cada cuánto carga gasolina?',
    options: [
      { value: 'diario', label: 'Diario', hint: 'Transporte / Chófer / Delivery' },
      { value: '2-3_semana', label: '2 a 3 veces por semana' },
      { value: '1_semana', label: '1 vez por semana' },
      { value: 'eventual', label: 'Eventual / De paso' },
    ],
  },
  {
    id: 'p2',
    title: 'Tiempo perdido en oficina / pago móvil',
    subtitle: '¿Cuánto tarda pagando hoy?',
    options: [
      { value: '<5', label: 'Menos de 5 minutos' },
      { value: '5-15', label: 'De 5 a 15 minutos' },
      { value: '>15', label: 'Más de 15 minutos' },
    ],
  },
  {
    id: 'p3',
    title: 'Intención de uso',
    subtitle: 'Pagar sin bajarse del vehículo',
    options: [
      { value: 'si', label: 'Definitivamente sí' },
      { value: 'tal_vez', label: 'Tal vez / Probaría una vez' },
      { value: 'no', label: 'No me interesa' },
    ],
  },
  {
    id: 'p4',
    title: 'Disposición a pagar recargo',
    subtitle: '¿Pagaría algo extra por la comodidad?',
    options: [
      { value: '5%', label: 'Sí, hasta un 5% adicional' },
      { value: '3%', label: 'Sí, hasta un 3% adicional' },
      { value: 'fijo', label: 'Solo un monto fijo pequeño', hint: 'Bolívares / centavos' },
      { value: 'nada', label: 'No pagaría nada extra' },
    ],
  },
  {
    id: 'p5',
    title: 'Método de pago principal hoy',
    options: [
      { value: 'pago_movil', label: 'Pago Móvil' },
      { value: 'usd', label: 'Efectivo (USD)' },
      { value: 'ves', label: 'Efectivo (VES)' },
      { value: 'punto', label: 'Punto de venta / Tarjeta' },
    ],
  },
]

export type Answers = Record<QuestionId, string>

export type Survey = Answers & {
  id: string
  seq: number
  station: string
  createdAt: string // ISO timestamp
  plate: string
  whatsapp: string
}

export const EMPTY_ANSWERS: Answers = { p1: '', p2: '', p3: '', p4: '', p5: '' }

export function labelFor(qid: QuestionId, value: string): string {
  const q = QUESTIONS.find((x) => x.id === qid)
  return q?.options.find((o) => o.value === value)?.label ?? value
}

export const DEFAULT_STATIONS = ['Ugarte Pelayo', 'Estación B', 'Estación C']
