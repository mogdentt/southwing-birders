/**
 * Live data from the real eBird API (optional — needs a free key from
 * https://ebird.org/api/keygen, pasted into Settings).
 */

export interface EbirdObs {
  speciesCode: string
  comName: string
  sciName: string
  locName: string
  obsDt: string
  howMany?: number
  lat: number
  lng: number
  obsReviewed: boolean
  locationPrivate: boolean
}

const BASE = "https://api.ebird.org/v2"

// ISO 3166-2 subdivision codes used by eBird, not district/city abbreviations.
// Stewart Island/Rakiura belongs to Southland (NZ-STL), not a separate region.
export const EBIRD_REGIONS = [
  { name: "Auckland", code: "NZ-AUK" },
  { name: "Bay of Plenty", code: "NZ-BOP" },
  { name: "Canterbury", code: "NZ-CAN" },
  { name: "Chatham Islands", code: "NZ-CIT" },
  { name: "Gisborne", code: "NZ-GIS" },
  { name: "Hawke's Bay", code: "NZ-HKB" },
  { name: "Manawatū-Whanganui", code: "NZ-MWT" },
  { name: "Marlborough", code: "NZ-MBH" },
  { name: "Nelson", code: "NZ-NSN" },
  { name: "Northland", code: "NZ-NTL" },
  { name: "Otago", code: "NZ-OTA" },
  { name: "Southland", code: "NZ-STL" },
  { name: "Taranaki", code: "NZ-TKI" },
  { name: "Tasman", code: "NZ-TAS" },
  { name: "Waikato", code: "NZ-WKO" },
  { name: "Wellington", code: "NZ-WGN" },
  { name: "West Coast", code: "NZ-WTC" },
] as const

async function ebirdGet(path: string, key: string, signal?: AbortSignal): Promise<EbirdObs[]> {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-ebirdapitoken": key }, signal })
  if (res.status === 401 || res.status === 403) throw new Error("bad-key")
  if (!res.ok) throw new Error(`ebird-${res.status}`)
  const observations: EbirdObs[] = await res.json()
  // Do not publish map links for observations whose location is marked private.
  return observations.filter((obs) => !obs.locationPrivate)
}

/** Recent observations within `km` of a point (last `days` days) */
export async function recentNearby(key: string, lat: number, lng: number, km = 25, days = 7, signal?: AbortSignal): Promise<EbirdObs[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error("invalid-location")
  if (!Number.isFinite(km) || km <= 0 || km > 50 || !Number.isInteger(days) || days < 1 || days > 30) throw new Error("invalid-query")
  return ebirdGet(
    `/data/obs/geo/recent?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&dist=${km}&back=${days}&maxResults=120`,
    key, signal
  )
}

/** Notable observations across NZ or a selected ISO subdivision. */
export async function notableRegion(key: string, region = "NZ", days = 14, signal?: AbortSignal): Promise<EbirdObs[]> {
  if (region !== "NZ" && !EBIRD_REGIONS.some((r) => r.code === region)) throw new Error("invalid-region")
  if (!Number.isInteger(days) || days < 1 || days > 30) throw new Error("invalid-query")
  return ebirdGet(`/data/obs/${region}/recent/notable?back=${days}&detail=simple&maxResults=80`, key, signal)
}

/** Backwards-compatible helper for existing imports. New UI uses notableRegion. */
export function notableCanterbury(key: string, days = 14): Promise<EbirdObs[]> {
  return notableRegion(key, "NZ-CAN", days)
}

export function ebirdChecklistUrl(): string {
  return "https://ebird.org/submit"
}
