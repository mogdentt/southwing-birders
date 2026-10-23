import type { Sighting } from "../types"
import { speciesById } from "../data/species"
import { hotspotById } from "../data/hotspots"

/**
 * Export sightings in eBird Record Format (extended), ready for
 * https://ebird.org/import/upload.form — so everything you log in
 * Southwing can feed your real eBird account.
 */
export function toEbirdCSV(sightings: Sighting[]): string {
  const rows: string[] = []
  for (const s of sightings) {
    const sp = speciesById.get(s.speciesId)
    if (!sp) continue
    const [genus, ...rest] = sp.sci.split(" ")
    const speciesEpithet = rest.join(" ")
    const hs = s.hotspotId ? hotspotById.get(s.hotspotId) : undefined
    const lat = s.lat ?? hs?.lat ?? ""
    const lng = s.lng ?? hs?.lng ?? ""
    const d = new Date(s.dateISO)
    const date = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    const cells = [
      sp.name, // Common Name
      genus, // Genus
      speciesEpithet, // Species
      String(s.count || "X"), // Number
      s.notes ?? "", // Species Comments
      hs?.name ?? "Across Aotearoa", // Unknown location: do not invent a city
      String(lat), // Latitude
      String(lng), // Longitude
      date, // Observation date MM/DD/YYYY
      time, // Start time
      hs?.region ?? "", // State/Province: known hotspot only, never guess from GPS
      "NZ", // Country code
      "incidental", // Protocol
      "1", // Number of observers
      "", // Duration
      "N", // All observations reported?
      "", // Distance
      "", // Area
      "Logged with Southwing", // Checklist comments
    ]
    rows.push(cells.map(csvCell).join(","))
  }
  return rows.join("\r\n")
}

function csvCell(v: string): string {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
