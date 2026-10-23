import { SPECIES } from "../data/species"
import { HOTSPOTS } from "../data/hotspots"
import { hashCode } from "./util"
import type { Species } from "../types"

/**
 * Today's target bird: a deterministic daily pick, weighted toward birds
 * in season somewhere in NZ this month, with an occasional stretch goal.
 * This is inspiration across the country, not a local sighting prediction.
 */
export function dailyBird(date = new Date()): { species: Species; hotspotName: string } {
  const month = date.getMonth() + 1
  const seedStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  const seed = hashCode(seedStr)

  const inSeason = SPECIES.filter((s) => !s.months || s.months.includes(month))
  // mostly gettable birds, with rare ones appearing ~1 day in 7
  const stretchDay = seed % 7 === 0
  const pool = inSeason.filter((s) =>
    stretchDay ? s.rarity === "notable" || s.rarity === "rare" : s.rarity === "common" || s.rarity === "uncommon" || s.rarity === "notable"
  )
  const list = pool.length ? pool : inSeason
  const species = list[seed % list.length]
  // Use the curated hotspot targets, not stale or speculative reverse mappings.
  const places = HOTSPOTS.filter((h) => h.targets.includes(species.id))
  const hs = places[seed % Math.max(1, places.length)]
  const habitat: Record<Species["group"], string> = {
    "Bush & garden": "forest or garden habitat",
    "Wetland & lake": "wetland or lake habitat",
    "Estuary & shore": "estuary or shore habitat",
    "Coast & sea": "coastal or offshore habitat",
    "Open country": "open-country habitat",
  }
  const hotspotName = hs ? `${hs.name} · ${hs.region}` :
    `${habitat[species.group]} within its known range${species.range ? ` — ${species.range}` : "; check the species guide and local access"}`
  return { species, hotspotName }
}
