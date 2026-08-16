import { SPECIES } from "../data/species"
import { hotspotById } from "../data/hotspots"
import { hashCode } from "./util"
import type { Species } from "../types"

/**
 * Today's target bird: a deterministic daily pick, weighted toward birds
 * actually findable this month, with an occasional stretch goal.
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
  const hs = species.hotspots[seed % Math.max(1, species.hotspots.length)]
  const hotspotName = hotspotById.get(hs)?.name ?? "your local patch"
  return { species, hotspotName }
}
