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

async function ebirdGet(path: string, key: string): Promise<EbirdObs[]> {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-ebirdapitoken": key } })
  if (res.status === 403) throw new Error("bad-key")
  if (!res.ok) throw new Error(`ebird-${res.status}`)
  return res.json()
}

/** Recent observations within `km` of a point (last `days` days) */
export function recentNearby(key: string, lat: number, lng: number, km = 25, days = 7): Promise<EbirdObs[]> {
  return ebirdGet(
    `/data/obs/geo/recent?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&dist=${km}&back=${days}&maxResults=120`,
    key
  )
}

/** Notable (locally rare) observations for Canterbury */
export function notableCanterbury(key: string, days = 14): Promise<EbirdObs[]> {
  return ebirdGet(`/data/obs/NZ-CAN/recent/notable?back=${days}&detail=simple&maxResults=80`, key)
}

export function ebirdChecklistUrl(): string {
  return "https://ebird.org/submit"
}
