import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Home } from './components/Home'
import { Survey } from './components/Survey'
import { Settings } from './components/Settings'
import { Toast, type ToastMsg } from './components/Toast'

// Recharts only loads when the report is opened, keeping the survey flow light.
const Dashboard = lazy(() =>
  import('./components/Dashboard').then((m) => ({ default: m.Dashboard })),
)

export type Screen = 'home' | 'survey' | 'dashboard' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [toast, setToast] = useState<ToastMsg | null>(null)

  const showToast = useCallback((text: string, kind: ToastMsg['kind'] = 'success') => {
    setToast({ id: Date.now(), text, kind })
  }, [])

  // Android/browser back button returns to the home screen.
  useEffect(() => {
    const onPop = () => setScreen('home')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((s: Screen) => {
    if (s === 'home') {
      if (history.state?.screen) history.back()
      else setScreen('home')
      return
    }
    history.pushState({ screen: s }, '')
    setScreen(s)
  }, [])

  return (
    <div className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      {screen === 'home' && <Home go={go} showToast={showToast} />}
      {screen === 'survey' && <Survey go={go} showToast={showToast} />}
      {screen === 'settings' && <Settings go={go} showToast={showToast} />}
      {screen === 'dashboard' && (
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center p-10 text-slate-500 dark:text-slate-400">
              Cargando reporte…
            </div>
          }
        >
          <Dashboard go={go} showToast={showToast} />
        </Suspense>
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  )
}
