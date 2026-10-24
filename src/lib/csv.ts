import { QUESTIONS, labelFor, type Survey } from './model'

function esc(v: string | number): string {
  const s = String(v ?? '')
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(list: Survey[]): string {
  const header = [
    'n',
    'fecha',
    'hora',
    'estacion',
    ...QUESTIONS.flatMap((q) => [`${q.id}_codigo`, `${q.id}_${q.title}`]),
    'placa',
    'whatsapp',
    'timestamp_iso',
  ]
  const rows = list.map((s) => {
    const d = new Date(s.createdAt)
    return [
      s.seq,
      d.toLocaleDateString('es-VE'),
      d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      s.station,
      ...QUESTIONS.flatMap((q) => [s[q.id], labelFor(q.id, s[q.id])]),
      s.plate,
      s.whatsapp,
      s.createdAt,
    ]
  })
  // Semicolon separator + BOM so Excel in es/pt locales opens it in columns.
  const BOM = '﻿'
  return BOM + [header, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
}

export function downloadCSV(list: Survey[]) {
  const blob = new Blob([toCSV(list)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  a.href = url
  a.download = `encuesta-gasolina-${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
