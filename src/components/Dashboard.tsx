import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Copy, Download, Trash2, Users, Smartphone, BadgePercent, Inbox } from 'lucide-react'
import type { Screen } from '../App'
import type { ToastMsg } from './Toast'
import { TopBar } from './TopBar'
import { QUESTIONS, labelFor, type Question, type Survey } from '../lib/model'
import { deleteResponse, useResponses, useTheme } from '../lib/storage'
import { downloadCSV } from '../lib/csv'

// Validated categorical palette (dataviz skill reference instance), one slot per
// payment method so a filter never repaints survivors.
const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500'],
}
const SINGLE_HUE = { light: '#2a78d6', dark: '#3987e5' }
const INK = {
  light: { primary: '#0f172a', secondary: '#64748b', surface: '#ffffff', grid: '#e2e8f0' },
  dark: { primary: '#f1f5f9', secondary: '#94a3b8', surface: '#111a2e', grid: '#334155' },
}

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100))

export function Dashboard({
  go,
  showToast,
}: {
  go: (s: Screen) => void
  showToast: (text: string, kind?: ToastMsg['kind']) => void
}) {
  const all = useResponses()
  const theme = useTheme()
  const [stationFilter, setStationFilter] = useState<string>('all')

  const stations = useMemo(() => Array.from(new Set(all.map((r) => r.station))).sort(), [all])
  const data = useMemo(
    () => (stationFilter === 'all' ? all : all.filter((r) => r.station === stationFilter)),
    [all, stationFilter],
  )

  const total = data.length
  const wouldUse = data.filter((r) => r.p3 === 'si' || r.p3 === 'tal_vez').length
  const wouldPay = data.filter((r) => r.p4 === '5%' || r.p4 === '3%').length
  const leads = data.filter((r) => r.plate || r.whatsapp)

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`${what} copiado`, 'info')
    } catch {
      showToast('No se pudo copiar', 'info')
    }
  }

  return (
    <>
      <TopBar
        title="Métricas / Reporte"
        subtitle={stationFilter === 'all' ? 'Todas las estaciones' : stationFilter}
        onBack={() => go('home')}
      />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4">
        {all.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center text-slate-500 dark:text-slate-400">
            <Inbox className="size-14" />
            <p className="text-lg font-semibold">Aún no hay respuestas</p>
            <p className="text-sm">Completa la primera encuesta para ver el reporte.</p>
            <button
              type="button"
              onClick={() => go('survey')}
              className="mt-3 h-14 rounded-2xl bg-brand-600 px-6 text-lg font-bold text-white active:bg-brand-700"
            >
              Nueva encuesta
            </button>
          </div>
        ) : (
          <>
            {stations.length > 1 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {['all', ...stations].map((s) => {
                  const active = stationFilter === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStationFilter(s)}
                      aria-pressed={active}
                      className={`h-11 shrink-0 whitespace-nowrap rounded-full border-2 px-4 text-sm font-semibold ${
                        active
                          ? 'border-slate-800 bg-slate-800 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                          : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {s === 'all' ? 'Todas' : s}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              <Kpi icon={<Users className="size-5" />} label="Entrevistados" value={String(total)} />
              <Kpi
                icon={<Smartphone className="size-5" />}
                label="Usarían la app"
                value={`${pct(wouldUse, total)}%`}
                sub={`${wouldUse} de ${total}`}
              />
              <Kpi
                icon={<BadgePercent className="size-5" />}
                label="Pagarían 3–5%"
                value={`${pct(wouldPay, total)}%`}
                sub={`${wouldPay} de ${total}`}
              />
            </div>

            <PaymentDonut data={data} theme={theme} />

            <DistributionBars question={QUESTIONS[1]} data={data} theme={theme} title="Tiempo perdido en la fila / oficina" />
            <DistributionBars question={QUESTIONS[2]} data={data} theme={theme} title="Intención de uso" />
            <DistributionBars question={QUESTIONS[3]} data={data} theme={theme} title="Disposición a pagar recargo" />
            <DistributionBars question={QUESTIONS[0]} data={data} theme={theme} title="Frecuencia de abastecimiento" />

            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold">Leads ({leads.length})</h2>
                {leads.some((l) => l.whatsapp) && (
                  <button
                    type="button"
                    onClick={() =>
                      copy(
                        leads
                          .filter((l) => l.whatsapp)
                          .map((l) => l.whatsapp)
                          .join('\n'),
                        'Lista de WhatsApp',
                      )
                    }
                    className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-800 active:bg-slate-200 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <Copy className="size-4" /> Copiar WhatsApp
                  </button>
                )}
              </div>
              {leads.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ningún conductor dejó placa o WhatsApp todavía.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {[...leads].reverse().map((l) => (
                    <LeadRow key={l.id} lead={l} onCopy={copy} />
                  ))}
                </ul>
              )}
            </Card>

            <button
              type="button"
              onClick={() => {
                downloadCSV(data)
                showToast(`CSV con ${data.length} respuestas descargado`)
              }}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white text-base font-bold text-slate-800 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <Download className="size-5" /> Exportar CSV
              {stationFilter !== 'all' && <span className="font-normal text-slate-500">({stationFilter})</span>}
            </button>
            <p className="-mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
              Para borrar datos, usa Ajustes → Zona de peligro.
            </p>
          </>
        )}
      </main>
    </>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#111a2e]">
      {children}
    </section>
  )
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#111a2e]">
      <div className="mb-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">{icon}</div>
      <p className="text-2xl font-extrabold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  )
}

function tooltipStyle(theme: 'light' | 'dark') {
  const ink = INK[theme]
  return {
    contentStyle: {
      background: ink.surface,
      border: `1px solid ${ink.grid}`,
      borderRadius: 12,
      color: ink.primary,
      fontSize: 13,
      padding: '6px 10px',
    },
    itemStyle: { color: ink.primary },
    labelStyle: { color: ink.secondary, fontWeight: 600 },
  }
}

function PaymentDonut({ data, theme }: { data: Survey[]; theme: 'light' | 'dark' }) {
  const q = QUESTIONS[4]
  const total = data.length
  const rows = q.options.map((o, i) => ({
    name: o.label,
    value: data.filter((r) => r.p5 === o.value).length,
    color: SERIES[theme][i],
  }))
  const pagoMovil = rows[0].value
  return (
    <Card>
      <h2 className="text-base font-bold">Método de pago principal hoy</h2>
      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        Pago Móvil: <strong className="text-slate-800 dark:text-slate-100">{pct(pagoMovil, total)}%</strong> · Otros
        métodos: <strong className="text-slate-800 dark:text-slate-100">{pct(total - pagoMovil, total)}%</strong>
      </p>
      <div className="flex items-center gap-3">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows.filter((r) => r.value > 0)}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={2}
                stroke={INK[theme].surface}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows
                  .filter((r) => r.value > 0)
                  .map((r) => (
                    <Cell key={r.name} fill={r.color} />
                  ))}
              </Pie>
              <Tooltip
                {...tooltipStyle(theme)}
                formatter={(v) => [`${v} (${pct(Number(v), total)}%)`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-1 flex-col gap-2 text-sm">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-2">
              <span className="size-3 shrink-0 rounded-sm" style={{ background: r.color }} />
              <span className="flex-1 truncate">{r.name}</span>
              <span className="tabular-nums font-semibold">{pct(r.value, total)}%</span>
              <span className="w-6 text-right tabular-nums text-slate-400 dark:text-slate-500">{r.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function DistributionBars({
  question,
  data,
  theme,
  title,
}: {
  question: Question
  data: Survey[]
  theme: 'light' | 'dark'
  title: string
}) {
  const total = data.length
  const rows = question.options.map((o) => {
    const n = data.filter((r) => r[question.id] === o.value).length
    return { name: o.label, n, pct: pct(n, total) }
  })
  const ink = INK[theme]
  return (
    <Card>
      <h2 className="mb-2 text-base font-bold">{title}</h2>
      <div style={{ height: rows.length * 44 + 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={8}>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tickLine={false}
              axisLine={false}
              tick={{ fill: ink.primary, fontSize: 12 }}
              interval={0}
            />
            <Tooltip
              {...tooltipStyle(theme)}
              cursor={{ fill: ink.grid, opacity: 0.4 }}
              formatter={(v, _n, item) => [`${item.payload.n} respuestas (${v}%)`, '']}
            />
            <Bar dataKey="pct" fill={SINGLE_HUE[theme]} radius={[0, 4, 4, 0]} isAnimationActive={false} background={{ fill: ink.grid, opacity: 0.35, radius: 4 }}>
              <LabelList
                dataKey="pct"
                position="right"
                formatter={(v: unknown) => `${v}%`}
                style={{ fill: ink.primary, fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function LeadRow({ lead, onCopy }: { lead: Survey; onCopy: (text: string, what: string) => void }) {
  const d = new Date(lead.createdAt)
  return (
    <li className="flex items-center gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {lead.plate && (
            <button
              type="button"
              onClick={() => onCopy(lead.plate, 'Placa')}
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-mono text-sm font-bold tracking-wider active:bg-slate-200 dark:bg-slate-700"
            >
              {lead.plate} <Copy className="size-3.5 text-slate-400" />
            </button>
          )}
          {lead.whatsapp && (
            <button
              type="button"
              onClick={() => onCopy(lead.whatsapp, 'WhatsApp')}
              className="flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-sm font-semibold text-brand-700 active:bg-brand-100 dark:bg-brand-700/30 dark:text-brand-100"
            >
              {lead.whatsapp} <Copy className="size-3.5 opacity-60" />
            </button>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
          #{lead.seq} · {lead.station} · {d.toLocaleDateString('es-VE')}{' '}
          {d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })} · {labelFor('p3', lead.p3)}
        </p>
      </div>
      <button
        type="button"
        aria-label="Eliminar respuesta"
        onClick={() => {
          if (confirm(`¿Eliminar la respuesta #${lead.seq}?`)) deleteResponse(lead.id)
        }}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-400 active:bg-red-50 active:text-red-600 dark:active:bg-red-900/30"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  )
}
