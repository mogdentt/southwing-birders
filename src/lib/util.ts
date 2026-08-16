export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

export function nowISO(): string {
  const d = new Date()
  d.setMilliseconds(0)
  return toLocalISO(d)
}

/** Local-time ISO without timezone suffix, e.g. 2026-08-16T07:32:00 */
export function toLocalISO(d: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" })
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`
  return fmtDate(iso)
}

/** Haversine distance in km */
export function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function greeting(name?: string): string {
  const h = new Date().getHours()
  const who = name ? `, ${name}` : ""
  if (h < 5) return `Up with the ruru${who}`
  if (h < 11) return `Mōrena${who}`
  if (h < 17) return `Kia ora${who}`
  if (h < 21) return `Good evening${who}`
  return `Night watch${who}`
}

/** Level system: points thresholds and names */
export const LEVELS: { name: string; at: number; note: string }[] = [
  { name: "Egg", at: 0, note: "Everyone starts somewhere warm" },
  { name: "Hatchling", at: 5, note: "Eyes open, world noisy" },
  { name: "Fledgling", at: 15, note: "First flights, some crashes" },
  { name: "Juvenile", at: 35, note: "Plumage still scruffy, skills growing" },
  { name: "Adult", at: 70, note: "You know your gulls now" },
  { name: "Kōtare", at: 120, note: "Patient, sharp-eyed, quick to strike" },
  { name: "Kārearea", at: 200, note: "Fast, fearless, respected" },
  { name: "Kea", at: 320, note: "Too clever for your own good" },
  { name: "Pouākai", at: 500, note: "The legendary eagle. Nothing escapes you" },
]

export function levelFor(points: number) {
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) if (points >= LEVELS[i].at) idx = i
  const cur = LEVELS[idx]
  const next = LEVELS[idx + 1]
  return {
    idx,
    name: cur.name,
    note: cur.note,
    next: next?.name,
    nextAt: next?.at,
    progress: next ? (points - cur.at) / (next.at - cur.at) : 1,
  }
}

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Simple deterministic hash for seeding */
export function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}
