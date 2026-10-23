import type { AppData, Outing, Settings, Sighting } from "../types"

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  name: "",
  theme: "auto",
  ebirdKey: "",
  homeLat: -43.5321,
  homeLng: 172.6362,
})

/** Fresh defaults; neither validation nor a caller can mutate another backup's defaults. */
export function createEmptyData(): AppData {
  return {
    v: 1,
    sightings: [],
    outings: [],
    settings: { ...DEFAULT_SETTINGS },
    quiz: { played: 0, correct: 0, bestStreak: 0 },
    unlockedBadges: {},
  }
}

function invalid(path: string, expected: string): never {
  throw new Error(`${path} ${expected}. No data has been changed.`)
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid(path, "must be an object")
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return invalid(path, "must be a plain object")
  return value as Record<string, unknown>
}

function text(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") invalid(path, "must be text")
}

function number(value: unknown, path: string, min = 0, max = Infinity): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    invalid(path, max === Infinity ? "must be a finite, non-negative number" : `must be a finite number between ${min} and ${max}`)
  }
}

/** Accept local datetimes, date-only records and timezone offsets, without normalising them. */
function date(value: unknown, path: string) {
  text(value, path)
  const match = /^(\d{4}|[+-]\d{6})-(\d{2})-(\d{2})(?:[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:[Zz]|[+-](\d{2}):?(\d{2}))?)?$/.exec(value)
  if (!match) invalid(path, "must be a valid ISO date or date and time")
  const [, y, m, d, h = "0", min = "0", sec = "0", fraction = "0", offsetH = "0", offsetM = "0"] = match
  const year = Number(y)
  const month = Number(m)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  // Date.parse alone silently rolls dates such as 30 February into the next month.
  if (
    month < 1 || month > 12 || Number(d) < 1 || Number(d) > days[month - 1] ||
    Number(h) > 24 || Number(min) > 59 || Number(sec) > 59 ||
    (Number(h) === 24 && (Number(min) !== 0 || Number(sec) !== 0 || /[1-9]/.test(fraction))) ||
    Number(offsetH) > 23 || Number(offsetM) > 59 || !Number.isFinite(Date.parse(value))
  ) invalid(path, "must be a valid calendar date and time")
}

function optionalText(record: Record<string, unknown>, key: string, path: string) {
  // Existing IndexedDB records can contain undefined optional fields, unlike JSON files.
  if (record[key] !== undefined) text(record[key], `${path}.${key}`)
}

function array<T>(value: unknown, path: string, validate: (item: unknown, path: string) => T): T[] {
  if (!Array.isArray(value)) return invalid(path, "must be a list")
  return Array.from(value, (item, i) => validate(item, `${path}[${i}]`))
}

function sighting(value: unknown, path: string): Sighting {
  const record = object(value, path)
  text(record.id, `${path}.id`)
  text(record.speciesId, `${path}.speciesId`)
  number(record.count, `${path}.count`)
  date(record.dateISO, `${path}.dateISO`)
  for (const key of ["hotspotId", "notes", "outingId"]) optionalText(record, key, path)
  if (record.lat !== undefined) number(record.lat, `${path}.lat`, -90, 90)
  if (record.lng !== undefined) number(record.lng, `${path}.lng`, -180, 180)
  return { ...record } as unknown as Sighting
}

function outing(value: unknown, path: string): Outing {
  const record = object(value, path)
  text(record.id, `${path}.id`)
  text(record.name, `${path}.name`)
  date(record.startISO, `${path}.startISO`)
  if (record.endISO !== undefined) date(record.endISO, `${path}.endISO`)
  optionalText(record, "hotspotId", path)
  return { ...record } as unknown as Outing
}

/**
 * Validate known fields without catalog lookups, ID rewriting, deduplication or dropping
 * extension fields. Missing legacy sections/fields get defaults; present invalid values
 * never do. This is also used for IndexedDB reads, not only imported JSON.
 */
export function validateBackup(value: unknown): AppData {
  const source = object(value, "Backup")
  if (Object.prototype.hasOwnProperty.call(source, "v") && source.v !== 1) {
    invalid("Backup version", "is unsupported; only version 1 or an older unversioned backup can be restored")
  }
  const defaults = createEmptyData()
  const sightings = array(source.sightings, "sightings", sighting)
  const outings = source.outings === undefined ? [] : array(source.outings, "outings", outing)
  const settings = { ...defaults.settings, ...(source.settings === undefined ? {} : object(source.settings, "settings")) }
  text(settings.name, "settings.name")
  text(settings.ebirdKey, "settings.ebirdKey")
  if (!["auto", "light", "dark"].includes(settings.theme)) invalid("settings.theme", "must be auto, light or dark")
  number(settings.homeLat, "settings.homeLat", -90, 90)
  number(settings.homeLng, "settings.homeLng", -180, 180)
  const quiz = { ...defaults.quiz, ...(source.quiz === undefined ? {} : object(source.quiz, "quiz")) }
  for (const key of ["played", "correct", "bestStreak"] as const) number(quiz[key], `quiz.${key}`)
  const unlockedBadges = source.unlockedBadges === undefined ? {} : object(source.unlockedBadges, "unlockedBadges")
  for (const [id, unlocked] of Object.entries(unlockedBadges)) date(unlocked, `unlockedBadges.${id}`)

  return {
    ...source,
    v: 1,
    sightings,
    outings,
    settings,
    quiz,
    unlockedBadges: { ...unlockedBadges } as Record<string, string>,
  }
}

/** Parse a backup without accessing storage or changing application state. */
export function parseBackup(raw: string): AppData {
  let value: unknown
  try {
    value = JSON.parse(raw.replace(/^\uFEFF/, ""))
  } catch {
    throw new Error("Could not read that file as JSON. Choose a Southwing JSON backup. No data has been changed.")
  }
  return validateBackup(value)
}