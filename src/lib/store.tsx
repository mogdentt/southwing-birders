import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react"
import localforage from "localforage"
import type { AppData, Sighting, Outing, Settings, QuizStats, BadgeContext } from "../types"
import { SPECIES, speciesById, RARITY_POINTS } from "../data/species"
import { BADGES } from "../data/badges"
import { uid, nowISO, dayKey } from "./util"

const KEY = "southwing-data-v1"

const DEFAULT_SETTINGS: Settings = {
  name: "",
  theme: "auto",
  ebirdKey: "",
  homeLat: -43.5321,
  homeLng: 172.6362,
}

const EMPTY: AppData = {
  v: 1,
  sightings: [],
  outings: [],
  settings: DEFAULT_SETTINGS,
  quiz: { played: 0, correct: 0, bestStreak: 0 },
  unlockedBadges: {},
}

export interface LogResult {
  isLifer: boolean
  points: number
  newBadges: { id: string; name: string }[]
  speciesName: string
}

interface StoreValue {
  ready: boolean
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
  const [data, setData] = useState<AppData>(EMPTY)
  const [ready, setReady] = useState(false)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    localforage
      .getItem<AppData>(KEY)
      .then((stored) => {
        if (stored && stored.v === 1) setData({ ...EMPTY, ...stored, settings: { ...DEFAULT_SETTINGS, ...stored.settings } })
      })
      .finally(() => setReady(true))
  }, [])

  const persist = useCallback((next: AppData) => {
    setData(next)
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      localforage.setItem(KEY, next)
    }, 250)
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
    [data, evaluateBadges, persist]
  )

  const deleteSighting = useCallback(
    (id: string) => {
      persist({ ...data, sightings: data.sightings.filter((s) => s.id !== id) })
    },
    [data, persist]
  )

  const startOuting = useCallback(
    (name: string, hotspotId?: string): Outing => {
      const outing: Outing = { id: uid(), name, hotspotId, startISO: nowISO() }
      persist({ ...data, outings: [...data.outings, outing] })
      return outing
    },
    [data, persist]
  )

  const endOuting = useCallback(
    (id: string) => {
      const next0: AppData = {
        ...data,
        outings: data.outings.map((o) => (o.id === id ? { ...o, endISO: nowISO() } : o)),
      }
      const { data: next } = evaluateBadges(next0)
      persist(next)
    },
    [data, evaluateBadges, persist]
  )

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      persist({ ...data, settings: { ...data.settings, ...patch } })
    },
    [data, persist]
  )

  const recordQuiz = useCallback(
    (correct: boolean, streakNow: number) => {
      const quiz: QuizStats = {
        played: data.quiz.played + 1,
        correct: data.quiz.correct + (correct ? 1 : 0),
        bestStreak: Math.max(data.quiz.bestStreak, streakNow),
      }
      const { data: next } = evaluateBadges({ ...data, quiz })
      persist(next)
    },
    [data, evaluateBadges, persist]
  )

  const exportJSON = useCallback(() => JSON.stringify(data, null, 2), [data])

  const importData = useCallback(
    (raw: string): { ok: boolean; message: string } => {
      try {
        const parsed = JSON.parse(raw)
        if (!parsed || !Array.isArray(parsed.sightings)) return { ok: false, message: "That file does not look like a Southwing backup." }
        const next: AppData = { ...EMPTY, ...parsed, v: 1, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) } }
        persist(next)
        return { ok: true, message: `Imported ${next.sightings.length} sightings.` }
      } catch {
        return { ok: false, message: "Could not read that file as JSON." }
      }
    },
    [persist]
  )

  const loadDemo = useCallback(() => {
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
  }, [data, evaluateBadges, persist])

  const resetAll = useCallback(() => {
    persist({ ...EMPTY, settings: { ...DEFAULT_SETTINGS, ...data.settings } })
  }, [persist, data.settings])

  const value: StoreValue = {
    ready,
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

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error("useStore outside provider")
  return v
}

export const TOTAL_SPECIES = SPECIES.length
