import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react"
import localforage from "localforage"
import type { AppData, Sighting, Outing, Settings, QuizStats, BadgeContext } from "../types"
import { SPECIES, speciesById, RARITY_POINTS } from "../data/species"
import { BADGES } from "../data/badges"
import { uid, nowISO, dayKey } from "./util"
import { createEmptyData, parseBackup, validateBackup } from "./backup"

const KEY = "southwing-data-v1"

export interface LogResult {
  isLifer: boolean
  points: number
  newBadges: { id: string; name: string }[]
  speciesName: string
}

interface StoreValue {
  ready: boolean
  storageError: string | null
  data: AppData
  lifeList: Map<string, Sighting>
  points: number
  streak: number
  activeOuting: Outing | null
  addSighting: (s: Omit<Sighting, "id">) => LogResult
  deleteSighting: (id: string) => void
  startOuting: (name: string, hotspotId?: string) => Outing
  endOuting: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  recordQuiz: (correct: boolean, streak: number) => void
  importData: (raw: string) => { ok: boolean; message: string }
  exportJSON: () => string
  loadDemo: () => void
  resetAll: () => void
}

const Ctx = createContext<StoreValue | null>(null)

function computeLifeList(sightings: Sighting[]): Map<string, Sighting> {
  const map = new Map<string, Sighting>()
  const sorted = [...sightings].sort((a, b) => a.dateISO.localeCompare(b.dateISO))
  for (const s of sorted) if (!map.has(s.speciesId)) map.set(s.speciesId, s)
  return map
}

function computeStreak(sightings: Sighting[]): number {
  if (!sightings.length) return 0
  const days = new Set(sightings.map((s) => dayKey(s.dateISO)))
  const today = new Date()
  let streak = 0
  // streak may start today or yesterday (you haven't birded *yet* today)
  const start = new Date(today)
  const todayKey = start.toISOString().slice(0, 10)
  const localKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  let cursor = new Date(today)
  if (!days.has(localKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(localKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  void todayKey
  return streak
}

export function computePoints(lifeList: Map<string, Sighting>): number {
  let pts = 0
  for (const id of lifeList.keys()) {
    const sp = speciesById.get(id)
    if (sp) pts += RARITY_POINTS[sp.rarity]
  }
  return pts
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(createEmptyData)
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const current = useRef(data)
  const loaded = useRef(false)
  const protectStoredData = useRef(false)
  const writeQueue = useRef<Promise<void>>(Promise.resolve())
  const pendingWrites = useRef(0)
  const unsaved = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const stored = await localforage.getItem<unknown>(KEY)
        if (cancelled) return
        const next = stored === null ? createEmptyData() : validateBackup(stored)
        current.current = next
        setData(next)
      } catch (error) {
        if (cancelled) return
        protectStoredData.current = true
        const detail = error instanceof Error ? ` ${error.message}` : ""
        setStorageError(`Saved data could not be loaded.${detail} Existing browser data has not been overwritten. Any new work stays only in this tab: download a backup before leaving. Reload to retry loading, or restore a validated backup to explicitly replace the saved data.`)
      } finally {
        if (!cancelled) {
          loaded.current = true
          setReady(true)
        }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (!pendingWrites.current && !unsaved.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warnIfUnsaved)
    return () => window.removeEventListener("beforeunload", warnIfUnsaved)
  }, [])

  const persist = useCallback((next: AppData, replaceProtectedData = false) => {
    if (!loaded.current) return
    current.current = next
    setData(next)
    unsaved.current = true
    // A failed initial read must never be followed by an automatic write of empty data.
    // Only an explicitly confirmed restore may replace that protected stored value.
    if (replaceProtectedData) protectStoredData.current = false
    if (protectStoredData.current) return
    pendingWrites.current++
    // No debounce: every update is queued immediately, in order, even on navigation.
    writeQueue.current = writeQueue.current.then(async () => {
      try {
        await localforage.setItem(KEY, next)
        if (current.current === next) {
          unsaved.current = false
          setStorageError(null)
        }
      } catch {
        setStorageError("Changes could not be saved to this browser. Storage may be full or unavailable. Keep this tab open and download a backup now before reloading or closing it. A later edit or confirmed restore will retry saving.")
      } finally {
        pendingWrites.current--
      }
    })
  }, [])

  const lifeList = useMemo(() => computeLifeList(data.sightings), [data.sightings])
  const points = useMemo(() => computePoints(lifeList), [lifeList])
  const streak = useMemo(() => computeStreak(data.sightings), [data.sightings])
  const activeOuting = useMemo(() => data.outings.find((o) => !o.endISO) ?? null, [data.outings])

  const evaluateBadges = useCallback(
    (next: AppData): { data: AppData; newly: { id: string; name: string }[] } => {
      const ll = computeLifeList(next.sightings)
      const ctx: BadgeContext = {
        sightings: next.sightings,
        outings: next.outings,
        lifeList: ll,
        quiz: next.quiz,
        streak: computeStreak(next.sightings),
        points: computePoints(ll),
      }
      const newly: { id: string; name: string }[] = []
      const unlocked = { ...next.unlockedBadges }
      for (const b of BADGES) {
        if (!unlocked[b.id] && b.check(ctx).done) {
          unlocked[b.id] = nowISO()
          newly.push({ id: b.id, name: b.name })
        }
      }
      return { data: { ...next, unlockedBadges: unlocked }, newly }
    },
    []
  )

  const addSighting = useCallback(
    (s: Omit<Sighting, "id">): LogResult => {
      const data = current.current
      const sighting: Sighting = { ...s, id: uid() }
      const isLifer = !data.sightings.some((x) => x.speciesId === s.speciesId)
      const sp = speciesById.get(s.speciesId)
      const next0: AppData = { ...data, sightings: [...data.sightings, sighting] }
      const { data: next, newly } = evaluateBadges(next0)
      persist(next)
      return {
        isLifer,
        points: isLifer && sp ? RARITY_POINTS[sp.rarity] : 0,
        newBadges: newly,
        speciesName: sp?.name ?? s.speciesId,
      }
    },
    [evaluateBadges, persist]
  )

  const deleteSighting = useCallback(
    (id: string) => {
      const data = current.current
      persist({ ...data, sightings: data.sightings.filter((s) => s.id !== id) })
    },
    [persist]
  )

  const startOuting = useCallback(
    (name: string, hotspotId?: string): Outing => {
      const data = current.current
      const outing: Outing = { id: uid(), name, hotspotId, startISO: nowISO() }
      persist({ ...data, outings: [...data.outings, outing] })
      return outing
    },
    [persist]
  )

  const endOuting = useCallback(
    (id: string) => {
      const data = current.current
      const next0: AppData = {
        ...data,
        outings: data.outings.map((o) => (o.id === id ? { ...o, endISO: nowISO() } : o)),
      }
      const { data: next } = evaluateBadges(next0)
      persist(next)
    },
    [evaluateBadges, persist]
  )

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const data = current.current
      persist({ ...data, settings: { ...data.settings, ...patch } })
    },
    [persist]
  )

  const recordQuiz = useCallback(
    (correct: boolean, streakNow: number) => {
      const data = current.current
      const quiz: QuizStats = {
        ...data.quiz,
        played: data.quiz.played + 1,
        correct: data.quiz.correct + (correct ? 1 : 0),
        bestStreak: Math.max(data.quiz.bestStreak, streakNow),
      }
      const { data: next } = evaluateBadges({ ...data, quiz })
      persist(next)
    },
    [evaluateBadges, persist]
  )

  const exportJSON = useCallback(() => {
    if (!loaded.current) throw new Error("Data is still loading. Please wait before downloading a backup.")
    return JSON.stringify(current.current, null, 2)
  }, [])

  const importData = useCallback(
    (raw: string): { ok: boolean; message: string } => {
      if (!loaded.current) return { ok: false, message: "Data is still loading. Please wait before restoring a backup." }
      try {
        const next = parseBackup(raw)
        persist(next, true)
        return { ok: true, message: `Restored ${next.sightings.length} sightings and ${next.outings.length} outings. Saving to this browser in the background; keep your backup file.` }
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "Could not restore that backup. No data has been changed." }
      }
    },
    [persist]
  )

  const loadDemo = useCallback(() => {
    const data = current.current
    const now = new Date()
    const mk = (speciesId: string, daysAgo: number, hour: number, hotspotId: string, count = 1): Sighting => {
      const d = new Date(now)
      d.setDate(d.getDate() - daysAgo)
      d.setHours(hour, 15 + ((daysAgo * 7) % 40), 0, 0)
      const p = (n: number) => String(n).padStart(2, "0")
      return {
        id: uid(),
        speciesId,
        count,
        dateISO: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`,
        hotspotId,
      }
    }
    const demo: Sighting[] = [
      mk("piwakawaka", 6, 9, "hagley", 2),
      mk("papango", 6, 9, "hagley", 8),
      mk("kereru", 6, 10, "hagley"),
      mk("tauhou", 5, 8, "riccarton", 12),
      mk("riroriro", 5, 8, "riccarton"),
      mk("kotare", 4, 16, "mccormacks"),
      mk("white-faced-heron", 4, 16, "mccormacks"),
      mk("kuaka", 3, 11, "estuary", 40),
      mk("sipo", 3, 11, "estuary", 60),
      mk("poaka", 3, 11, "estuary", 9),
      mk("royal-spoonbill", 3, 12, "estuary", 5),
      mk("korimako", 2, 7, "victoria", 3),
      mk("miromiro", 2, 8, "victoria"),
      mk("pukeko", 1, 17, "travis", 6),
      mk("kuruwhengi", 1, 17, "travis", 4),
      mk("kahu", 1, 18, "travis"),
      mk("tarapunga", 0, 8, "sumnerbeach", 25),
      mk("tara", 0, 8, "sumnerbeach", 7),
    ]
    const { data: next } = evaluateBadges({ ...data, sightings: [...data.sightings, ...demo] })
    persist(next)
  }, [evaluateBadges, persist])

  const resetAll = useCallback(() => {
    persist({ ...createEmptyData(), settings: { ...current.current.settings } })
  }, [persist])

  const value: StoreValue = {
    ready,
    storageError,
    data,
    lifeList,
    points,
    streak,
    activeOuting,
    addSighting,
    deleteSighting,
    startOuting,
    endOuting,
    updateSettings,
    recordQuiz,
    importData,
    exportJSON,
    loadDemo,
    resetAll,
  }

  return (
    <Ctx.Provider value={value}>
      {storageError && (
        <div className="shell">
          <div className="card" role="alert" style={{ border: "1px solid var(--red)", marginTop: 16 }}>
            <h2>Protect your birding data</h2>
            <p>{storageError}</p>
            <a href="#/settings">Open backup and restore</a>
          </div>
        </div>
      )}
      {children}
    </Ctx.Provider>
  )
}

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error("useStore outside provider")
  return v
}

export const TOTAL_SPECIES = SPECIES.length
