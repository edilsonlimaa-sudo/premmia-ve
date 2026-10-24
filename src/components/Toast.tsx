import { useEffect } from 'react'
import { CheckCircle2, Info } from 'lucide-react'

export type ToastMsg = { id: number; text: string; kind: 'success' | 'info' }

export function Toast({ toast, onDone }: { toast: ToastMsg | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [toast, onDone])

  if (!toast) return null
  const success = toast.kind === 'success'
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 flex justify-center px-4"
    >
      <div
        className={`animate-toast flex items-center gap-3 rounded-2xl px-5 py-3.5 text-base font-semibold shadow-xl ${
          success ? 'bg-brand-600 text-white' : 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
        }`}
      >
        {success ? <CheckCircle2 className="size-6 shrink-0" /> : <Info className="size-6 shrink-0" />}
        <span>{toast.text}</span>
      </div>
    </div>
  )
}
