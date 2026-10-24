import { useSyncExternalStore } from 'react'
import { DEFAULT_STATIONS, type Survey } from './model'

const KEY_RESPONSES = 'encuesta:responses:v2'
const KEY_REFUSALS = 'encuesta:refusals:v1'
const KEY_STATIONS = 'encuesta:stations:v1'
const KEY_STATION = 'encuesta:current-station:v1'
const KEY_THEME = 'encuesta:theme:v1'

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(l: Listener) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('encuesta:')) {
      // Another tab changed the data: drop caches and notify.
      responsesCache = null
      refusalsCache = null
      stationsCache = null
      currentStationCache = null
      l()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('No se pudo guardar en localStorage', e)
  }
  emit()
}

// --- Responses -------------------------------------------------------------
let responsesCache: Survey[] | null = null

function getResponses(): Survey[] {
  if (!responsesCache) responsesCache = read<Survey[]>(KEY_RESPONSES, [])
  return responsesCache
}

function setResponses(list: Survey[]) {
  responsesCache = list
  write(KEY_RESPONSES, list)
}

export function addResponse(input: Omit<Survey, 'id' | 'seq' | 'createdAt'>): Survey {
  const list = getResponses()
  const seq = list.reduce((m, s) => Math.max(m, s.seq), 0) + 1
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${seq}`
  const survey: Survey = { ...input, id, seq, createdAt: new Date().toISOString() }
  if (survey.durationSec === undefined) delete survey.durationSec
  if (survey.startedAt === undefined) delete survey.startedAt
  setResponses([...list, survey])
  return survey
}

export function deleteResponse(id: string) {
  setResponses(getResponses().filter((s) => s.id !== id))
}

export function clearResponses() {
  setResponses([])
  setRefusals([])
}

// --- Refusals ("No quiso participar") -----------------------------------------
export type Refusal = { station: string; createdAt: string }
let refusalsCache: Refusal[] | null = null

function getRefusals(): Refusal[] {
  if (!refusalsCache) refusalsCache = read<Refusal[]>(KEY_REFUSALS, [])
  return refusalsCache
}

function setRefusals(list: Refusal[]) {
  refusalsCache = list
  write(KEY_REFUSALS, list)
}

export function addRefusal(station: string) {
  setRefusals([...getRefusals(), { station, createdAt: new Date().toISOString() }])
}

export function undoLastRefusal() {
  setRefusals(getRefusals().slice(0, -1))
}

export function useRefusals(): Refusal[] {
  return useSyncExternalStore(subscribe, getRefusals, getRefusals)
}

/** Wipes everything the app stored on this device (responses, stations, theme) and reloads. */
export function resetApp() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('encuesta:'))
      .forEach((k) => localStorage.removeItem(k))
  } catch (e) {
    console.error('No se pudo limpiar localStorage', e)
  }
  responsesCache = null
  refusalsCache = null
  stationsCache = null
  currentStationCache = null
  themeCache = null
  emit()
  window.location.reload()
}

export function useResponses(): Survey[] {
  return useSyncExternalStore(subscribe, getResponses, getResponses)
}

// --- Stations --------------------------------------------------------------
let stationsCache: string[] | null = null

function getStations(): string[] {
  if (!stationsCache) stationsCache = read<string[]>(KEY_STATIONS, DEFAULT_STATIONS)
  return stationsCache
}

export function addStation(name: string) {
  const clean = name.trim()
  if (!clean) return
  const list = getStations()
  if (!list.includes(clean)) {
    stationsCache = [...list, clean]
    write(KEY_STATIONS, stationsCache)
  }
  setCurrentStation(clean)
}

export function removeStation(name: string) {
  const list = getStations().filter((s) => s !== name)
  stationsCache = list
  write(KEY_STATIONS, list)
  if (getCurrentStation() === name) setCurrentStation(list[0] ?? '')
}

export function useStations(): string[] {
  return useSyncExternalStore(subscribe, getStations, getStations)
}

let currentStationCache: string | null = null

function getCurrentStation(): string {
  if (currentStationCache === null) {
    currentStationCache = read<string>(KEY_STATION, '') || getStations()[0] || ''
  }
  return currentStationCache
}

export function setCurrentStation(name: string) {
  currentStationCache = name
  write(KEY_STATION, name)
}

export function useCurrentStation(): string {
  return useSyncExternalStore(subscribe, getCurrentStation, getCurrentStation)
}

// --- Theme -----------------------------------------------------------------
export type Theme = 'light' | 'dark'
let themeCache: Theme | null = null

function getTheme(): Theme {
  if (!themeCache) {
    const stored = read<Theme | ''>(KEY_THEME, '')
    themeCache =
      stored || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }
  return themeCache
}

export function setTheme(t: Theme) {
  themeCache = t
  write(KEY_THEME, t)
  applyTheme(t)
}

export function applyTheme(t: Theme = getTheme()) {
  document.documentElement.classList.toggle('dark', t === 'dark')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', t === 'dark' ? '#0b1220' : '#16a34a')
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, getTheme)
}

// --- Helpers ---------------------------------------------------------------
export function isToday(iso: string): boolean {
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}
