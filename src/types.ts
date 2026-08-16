export type BirdGroup =
  | 'Bush & garden'
  | 'Wetland & lake'
  | 'Estuary & shore'
  | 'Coast & sea'
  | 'Open country'

export type BirdStatus = 'Endemic' | 'Native' | 'Migrant' | 'Introduced'

export type Rarity = 'common' | 'uncommon' | 'notable' | 'rare' | 'mega'

export interface Species {
  id: string
  name: string
  maori?: string
  sci: string
  group: BirdGroup
  status: BirdStatus
  threat?: string // NZ Threat Classification, where notable
  rarity: Rarity
  sizeCm: number
  months?: number[] // months (1-12) when present/likely, omitted = year-round
  hotspots: string[] // hotspot ids where this bird is a good bet
  desc: string
  idTips: string
  fact: string
  wiki: string // Wikipedia page title for photo + link
}

export interface Hotspot {
  id: string
  name: string
  maori?: string
  lat: number
  lng: number
  kind: 'wetland' | 'estuary' | 'park' | 'forest' | 'coast' | 'river' | 'lake'
  blurb: string
  tips: string
  targets: string[] // species ids
}

export interface Sighting {
  id: string
  speciesId: string
  count: number
  dateISO: string // date+time of the observation
  hotspotId?: string
  lat?: number
  lng?: number
  notes?: string
  outingId?: string
}

export interface Outing {
  id: string
  name: string
  hotspotId?: string
  startISO: string
  endISO?: string
}

export interface QuizStats {
  played: number
  correct: number
  bestStreak: number
}

export interface Settings {
  name: string
  theme: 'auto' | 'light' | 'dark'
  ebirdKey: string
  homeLat: number
  homeLng: number
}

export interface AppData {
  v: number
  sightings: Sighting[]
  outings: Outing[]
  settings: Settings
  quiz: QuizStats
  unlockedBadges: Record<string, string> // badgeId -> dateISO unlocked
}

export interface BadgeDef {
  id: string
  name: string
  desc: string
  icon: string // emoji-free inline symbol key
  check: (ctx: BadgeContext) => { done: boolean; progress: number; target: number }
}

export interface BadgeContext {
  sightings: Sighting[]
  outings: Outing[]
  lifeList: Map<string, Sighting> // speciesId -> first sighting
  quiz: QuizStats
  streak: number
  points: number
}
