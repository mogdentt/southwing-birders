import { describe, expect, it } from "vitest"
import { createEmptyData, DEFAULT_SETTINGS, parseBackup, validateBackup } from "../src/lib/backup"

function completeBackup() {
  return {
    ...createEmptyData(),
    sightings: [{
      id: "original-sighting-id",
      speciesId: "future-species-not-in-this-catalogue",
      count: 0,
      dateISO: "2024-02-29T07:15:00+13:00",
      hotspotId: "future-hotspot",
      outingId: "original-outing-id",
      lat: -46.4,
      lng: 168.3,
      notes: "Keep this note exactly.\nKākā & tūī",
      futureField: { tags: ["retain me"] },
    }],
    outings: [{
      id: "original-outing-id",
      name: "Morning walk",
      hotspotId: "future-hotspot",
      startISO: "2024-02-29T07:00",
      endISO: "2024-02-29T08:00:00.125Z",
      futureField: "retain me too",
    }],
    settings: { ...DEFAULT_SETTINGS, ebirdKey: "synthetic-test-key", futureSetting: true },
    quiz: { played: 3, correct: 2, bestStreak: 2, futureQuizField: "kept" },
    unlockedBadges: { "future-badge": "2024-02-29T08:00:00" },
    futureSection: { kept: true },
  }
}

describe("Southwing v1 backups", () => {
  it("keeps the original six-field default schema and settings", () => {
    expect(createEmptyData()).toEqual({
      v: 1,
      sightings: [],
      outings: [],
      settings: { name: "", theme: "auto", ebirdKey: "", homeLat: -43.5321, homeLng: 172.6362 },
      quiz: { played: 0, correct: 0, bestStreak: 0 },
      unlockedBadges: {},
    })
  })

  it("round-trips a complete v1 backup, all IDs, unknown catalog values and extension fields", () => {
    const original = completeBackup()
    const json = JSON.stringify(original, null, 2)
    expect(parseBackup(json)).toEqual(original)
    expect(JSON.stringify(parseBackup(json), null, 2)).toBe(json)
  })

  it("defaults missing sections in older unversioned backups", () => {
    const sightings = completeBackup().sightings
    expect(parseBackup(JSON.stringify({ sightings }))).toEqual({ ...createEmptyData(), sightings })
  })

  it("defaults partial settings and quiz without discarding their provided fields", () => {
    const restored = parseBackup(JSON.stringify({ sightings: [], settings: { name: "Aroha" }, quiz: { played: 4 } }))
    expect(restored.settings).toEqual({ ...DEFAULT_SETTINGS, name: "Aroha" })
    expect(restored.quiz).toEqual({ played: 4, correct: 0, bestStreak: 0 })
  })

  it("uses independent defaults on every call", () => {
    const first = parseBackup('{"sightings":[]}')
    first.settings.name = "Changed"
    first.quiz.played = 9
    first.outings.push(completeBackup().outings[0])
    first.unlockedBadges.changed = "2024-02-29"
    expect(parseBackup('{"sightings":[]}')).toEqual(createEmptyData())
  })

  it("does not mutate the input, even after validation fails", () => {
    const original = completeBackup()
    const before = JSON.stringify(original)
    validateBackup(original)
    expect(JSON.stringify(original)).toBe(before)
    const bad = { ...original, settings: { ...original.settings, homeLat: Infinity } }
    expect(() => validateBackup(bad)).toThrow("settings.homeLat")
    expect(JSON.stringify(original)).toBe(before)
    expect(bad.settings.homeLat).toBe(Infinity)
  })

  it("supports optional undefined fields stored directly in IndexedDB", () => {
    const stored = { ...createEmptyData(), sightings: [{ ...completeBackup().sightings[0], lat: undefined, lng: undefined, notes: undefined }] }
    expect(validateBackup(stored)).toEqual(stored)
  })

  it("preserves zero and fractional counts, duplicate IDs, unlinked outings and empty text", () => {
    const sighting = { ...completeBackup().sightings[0], notes: "", count: 0.5, outingId: "missing-outing" }
    const stored = { ...createEmptyData(), sightings: [sighting, sighting], outings: [{ id: "", name: "", startISO: "2024-01-01" }] }
    expect(validateBackup(stored)).toEqual(stored)
  })

  it("accepts a UTF-8 BOM", () => {
    expect(parseBackup('\uFEFF{"sightings":[]}')).toEqual(createEmptyData())
  })

  it("keeps extension keys as data without changing object prototypes", () => {
    const restored = parseBackup('{"sightings":[],"__proto__":{"polluted":true},"settings":{"__proto__":{"polluted":true}}}')
    expect(Object.getPrototypeOf(restored)).toBe(Object.prototype)
    expect(Object.getPrototypeOf(restored.settings)).toBe(Object.prototype)
    expect(Object.prototype).not.toHaveProperty("polluted")
    expect(JSON.parse(JSON.stringify(restored)).__proto__).toEqual({ polluted: true })
  })

  it.each([0, 2, -1, "1", null, true, {}, [], undefined].map((v) => [v]))("rejects explicit unsupported version %j", (v) => {
    expect(() => validateBackup({ sightings: [], v })).toThrow(/version.*unsupported/)
  })

  it.each([undefined, null, [], "text", 3, {}, { sightings: {} }, { sightings: null }, { sightings: [null] }].map((value) => [value]))(
    "rejects an invalid root or sightings structure: %j", (value) => {
      expect(() => validateBackup(value)).toThrow(/No data has been changed/)
    }
  )

  it.each(["outings", "settings", "quiz", "unlockedBadges"])("rejects invalid %s rather than defaulting it", (key) => {
    for (const value of [null, false, "bad", 7]) {
      expect(() => validateBackup({ sightings: [], [key]: value })).toThrow(key)
    }
    const wrongContainer = key === "outings" ? {} : []
    expect(() => validateBackup({ sightings: [], [key]: wrongContainer })).toThrow(key)
  })

  it.each([
    ["id", 7], ["speciesId", null], ["count", "3"], ["count", -1],
    ["count", NaN], ["count", Infinity], ["count", -Infinity],
    ["dateISO", false], ["notes", []], ["hotspotId", 1], ["outingId", {}],
    ["lat", NaN], ["lat", Infinity], ["lat", -91], ["lat", "-46"],
    ["lng", -Infinity], ["lng", 181], ["lng", null],
  ])("rejects invalid sighting field %s = %j", (key, value) => {
    const backup = completeBackup()
    expect(() => validateBackup({ ...backup, sightings: [{ ...backup.sightings[0], [key as string]: value }] })).toThrow(`sightings[0].${key}`)
  })

  it.each(["id", "speciesId", "dateISO", "count"])("requires sighting field %s", (key) => {
    const { [key]: omitted, ...record } = completeBackup().sightings[0] as Record<string, unknown>
    expect(() => validateBackup({ sightings: [record] })).toThrow(`sightings[0].${key}`)
  })

  it.each([
    ["id", 1], ["name", null], ["hotspotId", false], ["startISO", "2024-02-30"], ["endISO", "invalid"],
  ])("rejects invalid outing field %s = %j", (key, value) => {
    expect(() => validateBackup({ sightings: [], outings: [{ ...completeBackup().outings[0], [key as string]: value }] })).toThrow(`outings[0].${key}`)
  })

  it.each([
    ["name", []], ["ebirdKey", 123], ["theme", "sepia"], ["theme", null],
    ["homeLat", NaN], ["homeLat", 91], ["homeLng", Infinity], ["homeLng", -181],
  ])("rejects invalid settings field %s = %j", (key, value) => {
    expect(() => validateBackup({ sightings: [], settings: { [key as string]: value } })).toThrow(`settings.${key}`)
  })

  it.each(["played", "correct", "bestStreak"])("rejects invalid quiz field %s", (key) => {
    for (const value of [-1, NaN, Infinity, "1", null, false]) {
      expect(() => validateBackup({ sightings: [], quiz: { [key]: value } })).toThrow(`quiz.${key}`)
    }
  })

  it.each([false, 3, null, "", "2023-02-29", "2024-04-31T12:00:00", "2024-01-01T25:00:00"])("rejects bad badge dates: %j", (value) => {
    expect(() => validateBackup({ sightings: [], unlockedBadges: { badge: value } })).toThrow("unlockedBadges.badge")
  })

  it.each([
    "not-a-date", "", "2023-02-29", "2024-02-30", "2024-13-01", "2024-00-01", "2024-01-00",
    "2024-04-31T12:00", "2024-01-01T24:01", "2024-01-01T24:00:00.001Z",
    "2024-01-01T12:60", "2024-01-01T12:00:60", "2024-01-01T12:00+24:00",
  ])("rejects malformed or rolled-over dates: %s", (value) => {
    expect(() => validateBackup({ sightings: [{ ...completeBackup().sightings[0], dateISO: value }] })).toThrow("dateISO")
  })

  it.each([
    "2024-02-29", "2024-02-29T07:15", "2024-02-29T07:15:00", "2024-02-29T07:15:00.123Z",
    "2024-02-29T07:15:00+13:00", "2024-02-29T07:15:00-0530", "2024-02-29T24:00:00Z",
  ])("preserves valid date spelling exactly: %s", (value) => {
    expect(validateBackup({ sightings: [{ ...completeBackup().sightings[0], dateISO: value }] }).sightings[0].dateISO).toBe(value)
  })

  it("rejects numeric overflow in JSON and gives a helpful JSON error", () => {
    expect(() => parseBackup('{"sightings":[],"quiz":{"played":1e400}}')).toThrow("quiz.played")
    expect(() => parseBackup("{broken")).toThrow(/JSON.*No data has been changed/)
  })
})