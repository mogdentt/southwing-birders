import type { BadgeDef, BadgeContext } from "../types"
import { speciesById } from "./species"
import { hotspotById } from "./hotspots"
import { RARITY_POINTS } from "./species"

const lifers = (ctx: BadgeContext) => ctx.lifeList.size

function lifersWhere(ctx: BadgeContext, pred: (id: string) => boolean): number {
  let n = 0
  for (const id of ctx.lifeList.keys()) if (pred(id)) n++
  return n
}

function haveAll(ctx: BadgeContext, ids: string[]) {
  const got = ids.filter((id) => ctx.lifeList.has(id)).length
  return { done: got === ids.length, progress: got, target: ids.length }
}

function hourOf(iso: string) {
  return new Date(iso).getHours()
}

export const BADGES: BadgeDef[] = [
  {
    id: "first-lifer",
    name: "First Feather",
    desc: "Log your first bird. Every list starts with one.",
    icon: "1",
    check: (c) => ({ done: lifers(c) >= 1, progress: Math.min(lifers(c), 1), target: 1 }),
  },
  {
    id: "ten-species",
    name: "Ten Up",
    desc: "Reach 10 species on your life list.",
    icon: "10",
    check: (c) => ({ done: lifers(c) >= 10, progress: Math.min(lifers(c), 10), target: 10 }),
  },
  {
    id: "twentyfive-species",
    name: "Quarter Century",
    desc: "Reach 25 species on your life list.",
    icon: "25",
    check: (c) => ({ done: lifers(c) >= 25, progress: Math.min(lifers(c), 25), target: 25 }),
  },
  {
    id: "fifty-species",
    name: "Half the Guide",
    desc: "Reach 50 species on your life list.",
    icon: "50",
    check: (c) => ({ done: lifers(c) >= 50, progress: Math.min(lifers(c), 50), target: 50 }),
  },
  {
    id: "seventyfive-species",
    name: "Deep Cuts",
    desc: "Reach 75 species. Now you are chasing the hard ones.",
    icon: "75",
    check: (c) => ({ done: lifers(c) >= 75, progress: Math.min(lifers(c), 75), target: 75 }),
  },
  {
    id: "century-sightings",
    name: "Century",
    desc: "Log 100 sightings in total.",
    icon: "C",
    check: (c) => ({ done: c.sightings.length >= 100, progress: Math.min(c.sightings.length, 100), target: 100 }),
  },
  {
    id: "streak-3",
    name: "Warming Up",
    desc: "Bird on 3 days in a row.",
    icon: "3d",
    check: (c) => ({ done: c.streak >= 3, progress: Math.min(c.streak, 3), target: 3 }),
  },
  {
    id: "streak-7",
    name: "The Full Week",
    desc: "Bird on 7 days in a row.",
    icon: "7d",
    check: (c) => ({ done: c.streak >= 7, progress: Math.min(c.streak, 7), target: 7 }),
  },
  {
    id: "streak-30",
    name: "Obsessed, Officially",
    desc: "Bird on 30 days in a row.",
    icon: "30d",
    check: (c) => ({ done: c.streak >= 30, progress: Math.min(c.streak, 30), target: 30 }),
  },
  {
    id: "dawn-chorus",
    name: "Dawn Chorus",
    desc: "Log a sighting before 7 in the morning.",
    icon: "AM",
    check: (c) => {
      const done = c.sightings.some((s) => hourOf(s.dateISO) < 7)
      return { done, progress: done ? 1 : 0, target: 1 }
    },
  },
  {
    id: "night-owl",
    name: "Night Shift",
    desc: "Log a sighting after 9 at night. Ruru hours.",
    icon: "PM",
    check: (c) => {
      const done = c.sightings.some((s) => hourOf(s.dateISO) >= 21)
      return { done, progress: done ? 1 : 0, target: 1 }
    },
  },
  {
    id: "endemic-ten",
    name: "True Local",
    desc: "See 10 endemic species, birds that exist nowhere but New Zealand.",
    icon: "NZ",
    check: (c) => {
      const n = lifersWhere(c, (id) => speciesById.get(id)?.status === "Endemic")
      return { done: n >= 10, progress: Math.min(n, 10), target: 10 }
    },
  },
  {
    id: "wet-feet",
    name: "Wet Feet",
    desc: "See 10 wetland and lake species.",
    icon: "W",
    check: (c) => {
      const n = lifersWhere(c, (id) => speciesById.get(id)?.group === "Wetland & lake")
      return { done: n >= 10, progress: Math.min(n, 10), target: 10 }
    },
  },
  {
    id: "long-haul",
    name: "Long Haul Club",
    desc: "See 3 Arctic migrants, birds that flew from the top of the world.",
    icon: "LH",
    check: (c) => {
      const n = lifersWhere(c, (id) => speciesById.get(id)?.status === "Migrant")
      return { done: n >= 3, progress: Math.min(n, 3), target: 3 }
    },
  },
  {
    id: "shag-pile",
    name: "Shag Pile",
    desc: "See all four local shags: pied, little, black and spotted.",
    icon: "S4",
    check: (c) => haveAll(c, ["karuhiruhi", "kawaupaka", "mapunga", "parekareka"]),
  },
  {
    id: "gull-friend",
    name: "Gull Friend",
    desc: "See all three gulls, and learn to love the difficult juveniles.",
    icon: "G3",
    check: (c) => haveAll(c, ["tarapunga", "tarapuka", "karoro"]),
  },
  {
    id: "tern-it-up",
    name: "Tern It Up",
    desc: "See Caspian, white-fronted and black-fronted terns.",
    icon: "T3",
    check: (c) => haveAll(c, ["taranui", "tara", "tarapirohe"]),
  },
  {
    id: "quality-tick",
    name: "Quality Tick",
    desc: "Add a notable or rarer species to your life list.",
    icon: "Q",
    check: (c) => {
      const done = [...c.lifeList.keys()].some((id) => {
        const sp = speciesById.get(id)
        return sp ? RARITY_POINTS[sp.rarity] >= 5 : false
      })
      return { done, progress: done ? 1 : 0, target: 1 }
    },
  },
  {
    id: "mega",
    name: "MEGA",
    desc: "Log a mega rarity. Phone a friend, then phone everyone.",
    icon: "M!",
    check: (c) => {
      const done = [...c.lifeList.keys()].some((id) => speciesById.get(id)?.rarity === "mega")
      return { done, progress: done ? 1 : 0, target: 1 }
    },
  },
  {
    id: "explorer",
    name: "Explorer",
    desc: "Log birds at 5 different hotspots.",
    icon: "E5",
    check: (c) => {
      const n = new Set(c.sightings.map((s) => s.hotspotId).filter(Boolean)).size
      return { done: n >= 5, progress: Math.min(n, 5), target: 5 }
    },
  },
  {
    id: "cartographer",
    name: "Cartographer",
    desc: "Log birds at 15 different hotspots. You know this city now.",
    icon: "E15",
    check: (c) => {
      const n = new Set(c.sightings.map((s) => s.hotspotId).filter(Boolean)).size
      return { done: n >= 15, progress: Math.min(n, 15), target: 15 }
    },
  },
  {
    id: "mudflat-regular",
    name: "Mudflat Regular",
    desc: "Log 15 sightings at estuary hotspots. The tide table is your calendar now.",
    icon: "MR",
    check: (c) => {
      const n = c.sightings.filter((s) => s.hotspotId && hotspotById.get(s.hotspotId)?.kind === "estuary").length
      return { done: n >= 15, progress: Math.min(n, 15), target: 15 }
    },
  },
  {
    id: "big-day",
    name: "Big Day",
    desc: "Log 15 or more species in a single day.",
    icon: "BD",
    check: (c) => {
      const byDay = new Map<string, Set<string>>()
      for (const s of c.sightings) {
        const day = s.dateISO.slice(0, 10)
        if (!byDay.has(day)) byDay.set(day, new Set())
        byDay.get(day)!.add(s.speciesId)
      }
      let best = 0
      for (const set of byDay.values()) best = Math.max(best, set.size)
      return { done: best >= 15, progress: Math.min(best, 15), target: 15 }
    },
  },
  {
    id: "five-outings",
    name: "Regular",
    desc: "Complete 5 outings.",
    icon: "O5",
    check: (c) => {
      const n = c.outings.filter((o) => o.endISO).length
      return { done: n >= 5, progress: Math.min(n, 5), target: 5 }
    },
  },
  {
    id: "field-eye",
    name: "Field Eye",
    desc: "Get a streak of 10 correct in the ID quiz.",
    icon: "FE",
    check: (c) => ({ done: c.quiz.bestStreak >= 10, progress: Math.min(c.quiz.bestStreak, 10), target: 10 }),
  },
]
