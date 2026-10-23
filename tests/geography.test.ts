import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HOTSPOTS, HOTSPOT_REGIONS } from "../src/data/hotspots"
import { speciesById } from "../src/data/species"
import { toEbirdCSV } from "../src/lib/csv"
import { dailyBird } from "../src/lib/daily"
import { EBIRD_REGIONS, notableCanterbury, notableRegion, recentNearby, type EbirdObs } from "../src/lib/ebird"
import type { Sighting } from "../src/types"

// Independent expectations: deriving these from HOTSPOTS would hide missing regions.
const REGION_CODES = {
  Auckland: "NZ-AUK", "Bay of Plenty": "NZ-BOP", Canterbury: "NZ-CAN",
  "Chatham Islands": "NZ-CIT", Gisborne: "NZ-GIS", "Hawke's Bay": "NZ-HKB",
  "Manawatū-Whanganui": "NZ-MWT", Marlborough: "NZ-MBH", Nelson: "NZ-NSN",
  Northland: "NZ-NTL", Otago: "NZ-OTA", Southland: "NZ-STL", Taranaki: "NZ-TKI",
  Tasman: "NZ-TAS", Waikato: "NZ-WKO", Wellington: "NZ-WGN", "West Coast": "NZ-WTC",
}

describe("NZ geography", () => {
  it("covers all 17 regions including the Chatham Islands", () => {
    const regions = Object.keys(REGION_CODES).sort()
    expect([...new Set(HOTSPOTS.map((h) => h.region))].sort()).toEqual(regions)
    expect([...HOTSPOT_REGIONS].sort()).toEqual(regions)
    expect(Object.fromEntries(EBIRD_REGIONS.map((r) => [r.name, r.code]))).toEqual(REGION_CODES)
    expect(EBIRD_REGIONS).toHaveLength(17)
    expect(new Set(EBIRD_REGIONS.map((r) => r.code)).size).toBe(17)
    expect(HOTSPOTS.find((h) => h.id === "ulva-island")?.region).toBe("Southland")
  })

  it.each(HOTSPOTS)("$id stores valid NZ coordinates, not wrapped map longitudes", (h) => {
    expect(Number.isFinite(h.lat)).toBe(true)
    expect(Number.isFinite(h.lng)).toBe(true)
    expect(h.lat).toBeGreaterThanOrEqual(-53)
    expect(h.lat).toBeLessThanOrEqual(-29)
    expect(h.lng).toBeGreaterThanOrEqual(-180)
    expect(h.lng).toBeLessThanOrEqual(180)
    if (h.region === "Chatham Islands") {
      expect(h.lat).toBeGreaterThan(-45)
      expect(h.lat).toBeLessThan(-43)
      expect(h.lng).toBeGreaterThan(-178)
      expect(h.lng).toBeLessThan(-175)
    } else {
      expect(h.lng).toBeGreaterThanOrEqual(165)
      expect(h.lng).toBeLessThanOrEqual(179)
    }
  })
})

// Minimal CSV reader for assertions: supports quoted commas, escaped quotes and
// embedded newlines, so the test does not confuse a location/comment with a column.
function csvRows(csv: string): string[][] {
  if (!csv) return []
  const rows: string[][] = []
  let row: string[] = [], cell = "", quoted = false
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') { cell += '"'; i++ }
      else quoted = !quoted
    } else if (ch === "," && !quoted) { row.push(cell); cell = "" }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && csv[i + 1] === "\n") i++
      rows.push([...row, cell]); row = []; cell = ""
    } else cell += ch
  }
  expect(quoted, "balanced CSV quoting").toBe(false)
  rows.push([...row, cell])
  return rows
}

const sighting = (patch: Partial<Sighting> = {}): Sighting => ({
  id: "synthetic-sighting", speciesId: "tui", count: 2, dateISO: "2026-01-15T08:05:00", ...patch,
})

describe("eBird CSV locations", () => {
  it("does not invent Canterbury, Christchurch or coordinates for unknown locations", () => {
    for (const patch of [{}, { hotspotId: "unknown-hotspot" }, { lat: -36.9, lng: 174.7 }]) {
      const [row] = csvRows(toEbirdCSV([sighting(patch)]))
      expect(row).toHaveLength(19)
      expect(row.slice(0, 6)).toEqual(["Tūī", "Prosthemadera", "novaeseelandiae", "2", "", "Across Aotearoa"])
      expect(row.slice(6, 8)).toEqual("lat" in patch ? ["-36.9", "174.7"] : ["", ""])
      expect(row.slice(8, 12)).toEqual(["01/15/2026", "08:05", "", "NZ"])
      expect(row.slice(12)).toEqual(["incidental", "1", "", "N", "", "", "Logged with Southwing"])
    }
  })

  it.each([
    ["ambury", "Ambury Regional Park", "Auckland", -36.9451, 174.7614],
    ["travis", "Travis Wetland", "Canterbury", -43.4855, 172.6905],
    ["ulva-island", "Ulva Island / Te Wharawhara, Rakiura", "Southland", -46.9254, 168.1308],
    ["waitangi-chatham", "Waitangi Foreshore, Chatham Island", "Chatham Islands", -43.9516, -176.5597],
  ] as const)("exports the known region and standard coordinates of %s", (hotspotId, name, region, lat, lng) => {
    const [row] = csvRows(toEbirdCSV([sighting({ hotspotId })]))
    expect(row).toHaveLength(19)
    expect(row.slice(5, 8)).toEqual([name, String(lat), String(lng)])
    expect(row.slice(10, 12)).toEqual([region, "NZ"])
  })

  it("prefers recorded coordinates, preserves quoted notes, skips unknown species and uses CRLF rows", () => {
    const notes = 'Kākā, tūī and "two" others\nBy the water'
    const csv = toEbirdCSV([
      sighting({ hotspotId: "ambury", lat: -36.95, lng: 174.75, notes }),
      sighting({ speciesId: "unknown-species" }),
      sighting({ speciesId: "cattle-egret", count: 0 }),
    ])
    const rows = csvRows(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0][4]).toBe(notes)
    expect(rows[0].slice(6, 8)).toEqual(["-36.95", "174.75"])
    expect(rows[0][10]).toBe("Auckland")
    expect(rows[1].slice(1, 4)).toEqual(["Ardea", "coromanda", "X"])
    expect(csv).toContain("\r\n")
    expect(toEbirdCSV([])).toBe("")
  })
})

const publicObservation: EbirdObs = {
  speciesCode: "tui1", comName: "Tui", sciName: "Prosthemadera novaeseelandiae",
  locName: "Synthetic public place", obsDt: "2026-01-15 08:05", howMany: 2,
  lat: -36.9451, lng: 174.7614, obsReviewed: false, locationPrivate: false,
}

describe("eBird requests (fetch is always mocked)", () => {
  const fetchMock = vi.fn<typeof fetch>()
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(new Response(JSON.stringify([publicObservation]), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it("defaults to national notable reports, never Canterbury or nearby Christchurch", async () => {
    expect(await notableRegion("synthetic-key")).toEqual([publicObservation])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ebird.org/v2/data/obs/NZ/recent/notable?back=14&detail=simple&maxResults=80",
      { headers: { "x-ebirdapitoken": "synthetic-key" }, signal: undefined }
    )
  })

  it.each(Object.entries(REGION_CODES))("requests the explicitly selected %s region", async (_name, code) => {
    const controller = new AbortController()
    await notableRegion("synthetic-key", code, 9, controller.signal)
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.ebird.org/v2/data/obs/${code}/recent/notable?back=9&detail=simple&maxResults=80`,
      { headers: { "x-ebirdapitoken": "synthetic-key" }, signal: controller.signal }
    )
  })

  it("retains the explicit Canterbury compatibility helper", async () => {
    await notableCanterbury("synthetic-key", 3)
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.ebird.org/v2/data/obs/NZ-CAN/recent/notable?back=3&detail=simple&maxResults=80")
  })

  it("passes nearby coordinates, distance, days, token and abort signal without wrapping Chatham longitude", async () => {
    const controller = new AbortController()
    await recentNearby("synthetic-key", -43.95162, -176.55973, 10, 4, controller.signal)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ebird.org/v2/data/obs/geo/recent?lat=-43.9516&lng=-176.5597&dist=10&back=4&maxResults=120",
      { headers: { "x-ebirdapitoken": "synthetic-key" }, signal: controller.signal }
    )
  })

  it("uses 25 km and seven days only around an explicitly supplied point", async () => {
    await recentNearby("synthetic-key", -36.9451, 174.7614)
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.ebird.org/v2/data/obs/geo/recent?lat=-36.9451&lng=174.7614&dist=25&back=7&maxResults=120")
  })

  it.each(["notable", "nearby"])("filters private locations from %s, preserving public unreviewed reports", async (kind) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([
      { ...publicObservation, locationPrivate: true, locName: "Private location must not leak" }, publicObservation,
    ])))
    const results = kind === "notable" ? await notableRegion("synthetic-key") : await recentNearby("synthetic-key", -36.9, 174.7)
    expect(results).toEqual([publicObservation])
  })

  it.each([
    [NaN, 174], [Infinity, 174], [-Infinity, 174], [-91, 174], [91, 174],
    [-43, NaN], [-43, Infinity], [-43, -Infinity], [-43, 181], [-43, -181], [-43, 183.4403],
  ])("rejects invalid coordinates (%s, %s) before fetching", async (lat, lng) => {
    await expect(recentNearby("synthetic-key", lat, lng)).rejects.toThrow("invalid-location")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([0, -1, 51, NaN, Infinity])("rejects invalid nearby distance %s", async (km) => {
    await expect(recentNearby("synthetic-key", -36.9, 174.7, km)).rejects.toThrow("invalid-query")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([0, -1, 31, 1.5, NaN, Infinity])("rejects invalid day window %s in both endpoints", async (days) => {
    await expect(notableRegion("synthetic-key", "NZ", days)).rejects.toThrow("invalid-query")
    await expect(recentNearby("synthetic-key", -36.9, 174.7, 25, days)).rejects.toThrow("invalid-query")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(["", "Auckland", "NZ-CHC", "NZ-STI", "AU", "NZ/../../geo"])("rejects invalid region %s before fetching", async (region) => {
    await expect(notableRegion("synthetic-key", region)).rejects.toThrow("invalid-region")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([[401, "bad-key"], [403, "bad-key"], [429, "ebird-429"], [500, "ebird-500"]] as const)("reports HTTP %s without exposing the key", async (status, error) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status }))
    await expect(notableRegion("synthetic-key")).rejects.toThrow(error)
  })

  it.each(["notable", "nearby"])("propagates cancellation for %s instead of swallowing it", async (kind) => {
    const controller = new AbortController()
    const aborted = new DOMException("Test cancellation", "AbortError")
    fetchMock.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(aborted), { once: true })
    }))
    const request = kind === "notable"
      ? notableRegion("synthetic-key", "NZ", 14, controller.signal)
      : recentNearby("synthetic-key", -36.9, 174.7, 25, 7, controller.signal)
    const rejection = expect(request).rejects.toBe(aborted)
    controller.abort()
    await rejection
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("propagates network failures", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Synthetic network failure"))
    await expect(notableRegion("synthetic-key")).rejects.toThrow("Synthetic network failure")
  })
})

describe("daily target geography", () => {
  it("is deterministic for a local calendar day and does not mutate the supplied date", () => {
    const morning = new Date(2026, 9, 23, 0, 1)
    const before = morning.getTime()
    expect(dailyBird(morning)).toEqual(dailyBird(new Date(2026, 9, 23, 23, 59)))
    expect(dailyBird(morning)).toEqual(dailyBird(morning))
    expect(morning.getTime()).toBe(before)
  })

  it("uses in-season birds with curated targets or a range-qualified habitat, never a fallback city", () => {
    const picked = new Set<string>()
    let fallbackCount = 0
    const regions = new Set<string | undefined>()
    for (let day = 1; day <= 366; day++) {
      const date = new Date(2028, 0, day, 12)
      const { species, hotspotName } = dailyBird(date)
      picked.add(species.id)
      expect(speciesById.get(species.id)).toBe(species)
      expect(species.months === undefined || species.months.includes(date.getMonth() + 1)).toBe(true)
      const target = HOTSPOTS.find((h) => `${h.name} · ${h.region}` === hotspotName)
      if (target) {
        expect(target.targets, `${species.id} at ${target.id}`).toContain(species.id)
        regions.add(target.region)
      } else {
        fallbackCount++
        expect(hotspotName).toContain("within its known range")
        expect(hotspotName).not.toMatch(/Christchurch|Ōtautahi|guaranteed|anywhere near you/i)
        if (species.range) expect(hotspotName).toContain(species.range)
      }
    }
    expect(fallbackCount).toBeGreaterThan(0)
    expect(picked.size).toBeGreaterThan(20)
    expect(regions.has("Auckland")).toBe(true)
    expect(regions.size).toBeGreaterThan(1)
  })
})