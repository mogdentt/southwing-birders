import { describe, expect, it } from "vitest"
import { RARITY_LABEL, RARITY_POINTS, SPECIES, speciesById } from "../src/data/species"
import { NATIONAL_SPECIES } from "../src/data/species-national"
import { HOTSPOTS, hotspotById } from "../src/data/hotspots"
import { parseBackup } from "../src/lib/backup"

// Frozen literals extracted from `git show main:src/data/species.ts` using the
// TypeScript AST, NOT eval/import of historical code. Tests need neither git nor
// a particular checkout/branch at runtime. There were 87 original species.
const ORIGINAL_SPECIES = [
  ["piwakawaka", "Rhipidura fuliginosa", "common"],
  ["korimako", "Anthornis melanura", "common"],
  ["tui", "Prosthemadera novaeseelandiae", "notable"],
  ["kereru", "Hemiphaga novaeseelandiae", "common"],
  ["riroriro", "Gerygone igata", "common"],
  ["tauhou", "Zosterops lateralis", "common"],
  ["pipiwharauroa", "Chrysococcyx lucidus", "uncommon"],
  ["ruru", "Ninox novaeseelandiae", "uncommon"],
  ["karearea", "Falco novaeseelandiae", "rare"],
  ["kahu", "Circus approximans", "common"],
  ["pipipi", "Mohoua novaeseelandiae", "notable"],
  ["miromiro", "Petroica macrocephala", "notable"],
  ["titipounamu", "Acanthisitta chloris", "rare"],
  ["matata", "Poodytes punctatus", "rare"],
  ["warou", "Hirundo neoxena", "common"],
  ["pihoihoi", "Anthus novaeseelandiae", "uncommon"],
  ["pukeko", "Porphyrio melanotus", "common"],
  ["putangitangi", "Tadorna variegata", "common"],
  ["mallard", "Anas platyrhynchos", "common"],
  ["parera", "Anas superciliosa", "rare"],
  ["tete", "Anas gracilis", "uncommon"],
  ["kuruwhengi", "Spatula rhynchotis", "uncommon"],
  ["papango", "Aythya novaeseelandiae", "common"],
  ["black-swan", "Cygnus atratus", "common"],
  ["canada-goose", "Branta canadensis", "common"],
  ["greylag-goose", "Anser anser", "uncommon"],
  ["mute-swan", "Cygnus olor", "rare"],
  ["coot", "Fulica atra australis", "uncommon"],
  ["puteketeke", "Podiceps cristatus australis", "notable"],
  ["white-faced-heron", "Egretta novaehollandiae", "common"],
  ["kotuku", "Ardea alba modesta", "rare"],
  ["royal-spoonbill", "Platalea regia", "uncommon"],
  ["matuku", "Botaurus poiciloptilus", "rare"],
  ["cattle-egret", "Ardea ibis", "rare"],
  ["little-egret", "Egretta garzetta", "rare"],
  ["reef-heron", "Egretta sacra", "rare"],
  ["kotare", "Todiramphus sanctus", "common"],
  ["marsh-crake", "Zapornia pusilla", "rare"],
  ["spotless-crake", "Zapornia tabuensis", "rare"],
  ["glossy-ibis", "Plegadis falcinellus", "mega"],
  ["sipo", "Haematopus finschi", "common"],
  ["voc", "Haematopus unicolor", "uncommon"],
  ["poaka", "Himantopus leucocephalus", "common"],
  ["kaki", "Himantopus novaezelandiae", "mega"],
  ["pohowera", "Anarhynchus bicinctus", "uncommon"],
  ["black-fronted-dotterel", "Elseyornis melanops", "notable"],
  ["ngutuparore", "Anarhynchus frontalis", "notable"],
  ["spur-winged-plover", "Vanellus miles novaehollandiae", "common"],
  ["kuaka", "Limosa lapponica", "uncommon"],
  ["huahou", "Calidris canutus", "notable"],
  ["turnstone", "Arenaria interpres", "notable"],
  ["pacific-golden-plover", "Pluvialis fulva", "rare"],
  ["sharp-tailed-sandpiper", "Calidris acuminata", "rare"],
  ["whimbrel", "Numenius phaeopus", "rare"],
  ["taranui", "Hydroprogne caspia", "uncommon"],
  ["tara", "Sterna striata", "common"],
  ["tarapirohe", "Chlidonias albostriatus", "notable"],
  ["tarapuka", "Chroicocephalus bulleri", "notable"],
  ["tarapunga", "Chroicocephalus novaehollandiae scopulinus", "common"],
  ["karoro", "Larus dominicanus", "common"],
  ["karuhiruhi", "Phalacrocorax varius", "uncommon"],
  ["kawaupaka", "Microcarbo melanoleucos", "common"],
  ["mapunga", "Phalacrocorax carbo", "uncommon"],
  ["parekareka", "Phalacrocorax punctatus", "uncommon"],
  ["takapu", "Morus serrator", "uncommon"],
  ["titi", "Ardenna grisea", "notable"],
  ["huttons-shearwater", "Puffinus huttoni", "notable"],
  ["pakaha", "Puffinus gavia", "uncommon"],
  ["korora", "Eudyptula minor albosignata", "notable"],
  ["house-sparrow", "Passer domesticus", "common"],
  ["blackbird", "Turdus merula", "common"],
  ["song-thrush", "Turdus philomelos", "common"],
  ["starling", "Sturnus vulgaris", "common"],
  ["chaffinch", "Fringilla coelebs", "common"],
  ["goldfinch", "Carduelis carduelis", "common"],
  ["greenfinch", "Chloris chloris", "common"],
  ["redpoll", "Acanthis flammea", "common"],
  ["yellowhammer", "Emberiza citrinella", "common"],
  ["cirl-bunting", "Emberiza cirlus", "notable"],
  ["dunnock", "Prunella modularis", "common"],
  ["skylark", "Alauda arvensis", "common"],
  ["magpie", "Gymnorhina tibicen", "common"],
  ["rook", "Corvus frugilegus", "mega"],
  ["little-owl", "Athene noctua", "uncommon"],
  ["california-quail", "Callipepla californica", "common"],
  ["pheasant", "Phasianus colchicus", "uncommon"],
  ["rock-pigeon", "Columba livia", "common"],
] as const

// Same static extraction from main:src/data/hotspots.ts. Coordinates are part of
// the legacy location contract; do not silently relocate old sightings.
const ORIGINAL_HOTSPOTS = [
  ["travis", -43.4855, 172.6905],
  ["estuary", -43.5525, 172.733],
  ["bromley", -43.5285, 172.702],
  ["charlesworth", -43.5525, 172.7085],
  ["mccormacks", -43.559, 172.729],
  ["hagley", -43.531, 172.62],
  ["riccarton", -43.529, 172.5985],
  ["styx", -43.462, 172.606],
  ["brooklands", -43.427, 172.702],
  ["waimak", -43.39, 172.701],
  ["groynes", -43.442, 172.588],
  ["otukaikino", -43.43, 172.601],
  ["horseshoe", -43.493, 172.681],
  ["halswell", -43.592, 172.562],
  ["victoria", -43.598, 172.628],
  ["kennedys", -43.627, 172.599],
  ["godley", -43.586, 172.802],
  ["taylors", -43.585, 172.78],
  ["whitewash", -43.579, 172.772],
  ["sumnerbeach", -43.569, 172.759],
  ["quail", -43.628, 172.688],
  ["waihora", -43.756, 172.489],
  ["wairewa", -43.796, 172.735],
  ["kaitorete", -43.818, 172.66],
  ["ashley", -43.278, 172.718],
] as const

const GROUPS = ["Bush & garden", "Wetland & lake", "Estuary & shore", "Coast & sea", "Open country"]
const STATUSES = ["Endemic", "Native", "Migrant", "Introduced"]
const RARITIES = ["common", "uncommon", "notable", "rare", "mega"]

function nonempty(value: unknown, label: string) {
  expect(typeof value, label).toBe("string")
  expect((value as string).trim().length, label).toBeGreaterThan(0)
}

function unique(values: string[], label: string) {
  expect(values.filter((value, index) => values.indexOf(value) !== index), label).toEqual([])
}

describe("nationwide catalogue integrity", () => {
  it("contains 230 distinct species and complete lookup indexes", () => {
    expect(SPECIES).toHaveLength(230)
    for (const key of ["id", "name", "sci"] as const) {
      unique(SPECIES.map((s) => s[key].trim().normalize("NFC").toLowerCase()), `duplicate species ${key}`)
    }
    unique(HOTSPOTS.map((h) => h.id), "duplicate hotspot ID")
    expect(speciesById.size).toBe(SPECIES.length)
    expect(hotspotById.size).toBe(HOTSPOTS.length)
    for (const s of SPECIES) expect(speciesById.get(s.id)).toBe(s)
    for (const h of HOTSPOTS) expect(hotspotById.get(h.id)).toBe(h)
  })

  it.each(SPECIES)("$id has every required field and valid optional metadata", (s) => {
    for (const key of ["id", "name", "sci", "desc", "idTips", "fact", "wiki", "range"] as const) {
      nonempty(s[key], `${s.id}.${key}`)
    }
    expect(s.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(s.sci).toMatch(/^[A-Z][a-z]+ [a-z]+(?: [a-z]+)?$/)
    expect(GROUPS).toContain(s.group)
    expect(STATUSES).toContain(s.status)
    expect(RARITIES).toContain(s.rarity)
    expect(Number.isFinite(s.sizeCm)).toBe(true)
    expect(s.sizeCm).toBeGreaterThan(0)
    expect(Array.isArray(s.hotspots)).toBe(true)
    unique(s.hotspots, `${s.id} repeats a hotspot`)
    for (const id of s.hotspots) expect(hotspotById.has(id), `${s.id} -> ${id}`).toBe(true)
    for (const key of ["maori", "threat"] as const) if (s[key] !== undefined) nonempty(s[key], `${s.id}.${key}`)
    if (s.months !== undefined) {
      expect(Array.isArray(s.months)).toBe(true)
      expect(s.months.length).toBeGreaterThan(0)
      expect(new Set(s.months).size).toBe(s.months.length)
      for (const month of s.months) {
        expect(Number.isInteger(month)).toBe(true)
        expect(month).toBeGreaterThanOrEqual(1)
        expect(month).toBeLessThanOrEqual(12)
      }
    }
    if (s.nzbo !== undefined) {
      const url = new URL(s.nzbo)
      expect(url.protocol).toBe("https:")
      expect(url.hostname).toBe("www.nzbirdsonline.org.nz")
      expect(url.pathname).toMatch(/^\/species\/[a-z0-9-]+$/)
    }
  })

  it("adds 143 species with meaningful ranges without reusing original IDs", () => {
    const oldIds = new Set<string>(ORIGINAL_SPECIES.map(([id]) => id))
    expect(ORIGINAL_SPECIES).toHaveLength(87)
    expect(NATIONAL_SPECIES).toHaveLength(143)
    expect(SPECIES.filter((s) => !oldIds.has(s.id))).toEqual(NATIONAL_SPECIES)
    for (const s of NATIONAL_SPECIES) {
      expect(oldIds.has(s.id), s.id).toBe(false)
      expect(s.range?.trim().length, `${s.id} range`).toBeGreaterThan(25)
      expect(s.range, s.id).not.toMatch(/^(?:unknown|todo|tbd|n\/a)$/i)
    }
  })

  it.each(ORIGINAL_SPECIES)("preserves original species ID and score: %s", (id, sci, rarity) => {
    const current = speciesById.get(id)
    expect(current, id).toBeDefined()
    expect(current?.rarity).toBe(rarity)
    // The only intentional name correction: NZ cattle egrets are the eastern
    // taxon. Saved v1 sightings reference speciesId, never a scientific name.
    expect(current?.sci).toBe(id === "cattle-egret" ? "Ardea coromanda" : sci)
  })

  it("keeps rarity points/labels and cattle-egret backup IDs unchanged", () => {
    expect(RARITY_POINTS).toEqual({ common: 1, uncommon: 2, notable: 5, rare: 10, mega: 25 })
    expect(RARITY_LABEL).toEqual({ common: "Common", uncommon: "Uncommon", notable: "Notable", rare: "Rare", mega: "Mega" })
    const sighting = { id: "legacy-egret", speciesId: "cattle-egret", count: 2, dateISO: "2024-06-01T10:30", hotspotId: "waihora" }
    const restored = parseBackup(JSON.stringify({ v: 1, sightings: [sighting] }))
    expect(restored.v).toBe(1)
    expect(restored.sightings).toEqual([sighting])
    expect(speciesById.get(restored.sightings[0].speciesId)?.sci).toBe("Ardea coromanda")
  })

  it.each(ORIGINAL_HOTSPOTS)("preserves original hotspot %s and coordinates", (id, lat, lng) => {
    expect(hotspotById.get(id)).toMatchObject({ id, lat, lng, region: "Canterbury" })
  })

  it.each(HOTSPOTS)("$id has complete access information and valid target references", (h) => {
    for (const key of ["id", "name", "region", "blurb", "tips"] as const) nonempty(h[key], `${h.id}.${key}`)
    expect(h.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(["wetland", "estuary", "park", "forest", "coast", "river", "lake"]).toContain(h.kind)
    expect(Array.isArray(h.targets)).toBe(true)
    expect(h.targets.length).toBeGreaterThan(0)
    unique(h.targets, `${h.id} repeats a target`)
    for (const id of h.targets) expect(speciesById.has(id), `${h.id} -> ${id}`).toBe(true)
  })
})