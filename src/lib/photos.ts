import manifest from "../data/photos.json"
import type { Species } from "../types"

export interface PhotoSource {
  provider: string
  requestedTitle: string
  articleTitle: string | null
  articleUrl: string | null
  articleRevision: number | null
  wikidataId: string | null
  wikidataRevision: number | null
  articleTaxonNames: string[]
  articleEvidence: string
  discovery: string
  taxonEvidence: { field: string; term: string }[]
  review: { note: string; reviewedOn: string; evidenceUrls: string[] } | null
  checkedAt: string
  visuallyReviewed: boolean
  commonsPageId?: number
  commonsRevision?: number
  fileSha1?: string
  fileTimestamp?: string
  thumbnailWidth?: number
  thumbnailHeight?: number
  imageCheckedAt?: string
  network?: { status: number; contentType: string; bytes: number; sha256: string }
}

export interface LicensedPhoto {
  status: "verified"
  speciesId: string
  scientificName: string
  url: string
  fileUrl: string
  fileTitle: string
  artist: string
  attribution: string
  credit: string
  license: string
  licenseUrl: string
  changes: string
  source: PhotoSource
}

export interface UnavailablePhoto {
  status: "unavailable"
  speciesId: string
  scientificName: string
  reason: string
  candidateFile: string | null
  source: PhotoSource
}

export type PhotoRecord = LicensedPhoto | UnavailablePhoto
type SpeciesIdentity = Pick<Species, "id" | "sci">

/** Build-time reviewed metadata only. Old IndexedDB Wikipedia thumbnails are intentionally ignored. */
export const PHOTO_MANIFEST: Readonly<Record<string, PhotoRecord>> = manifest.photos as Record<string, PhotoRecord>

export function isSafePhotoUrl(value: string, kind: "image" | "file" | "license"): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false
    if (kind === "image") return ["upload.wikimedia.org", "thumb.wikimedia.org"].includes(url.hostname) && url.pathname.startsWith("/wikipedia/commons/")
    if (kind === "file") return url.hostname === "commons.wikimedia.org" && url.pathname.startsWith("/wiki/File:")
    return url.hostname === "creativecommons.org" && /^\/(licenses\/(by|by-sa)\/(1\.0|2\.0|2\.5|3\.0|4\.0)(\/[a-z-]+)?|publicdomain\/(zero|mark)\/1\.0)\/?$/.test(url.pathname)
  } catch { return false }
}

function verified(record?: PhotoRecord): LicensedPhoto | null {
  if (!record || record.status !== "verified" || !record.artist || !record.attribution || !record.license) return null
  return isSafePhotoUrl(record.url, "image") && isSafePhotoUrl(record.fileUrl, "file") && isSafePhotoUrl(record.licenseUrl, "license") ? record : null
}

/** Synchronous, ID-keyed lookup. Scientific-name drift fails closed until the manifest is reviewed. */
export function getSpeciesPhoto(species: SpeciesIdentity): LicensedPhoto | null {
  const record = Object.hasOwnProperty.call(PHOTO_MANIFEST, species.id) ? PHOTO_MANIFEST[species.id] : undefined
  return record?.scientificName === species.sci ? verified(record) : null
}

/** Full plain-text credits, file-page link and licence link for the detail page. */
export function getPhotoCredit(species: SpeciesIdentity): LicensedPhoto | null {
  return getSpeciesPhoto(species)
}

const titleKey = (title: string) => title.replace(/_/g, " ").trim().toLocaleLowerCase("en")
const byTitle = new Map<string, PhotoRecord[]>()
for (const photo of Object.values(PHOTO_MANIFEST)) {
  const key = titleKey(photo.source.requestedTitle)
  byTitle.set(key, [...(byTitle.get(key) ?? []), photo])
}

function lookup(input: string | Species): LicensedPhoto | null {
  if (typeof input !== "string") return getSpeciesPhoto(input)
  const entries = byTitle.get(titleKey(input))
  // Do not guess between species sharing an article, or accept an unknown/broader redirect.
  return entries?.length === 1 ? verified(entries[0]) : null
}

export interface WikiInfo {
  thumb: string | null
  pageUrl: string | null
  credit: LicensedPhoto | null
}

/** Backwards-compatible Promise APIs; these never fetch third-party metadata at runtime. */
export async function getWikiInfo(input: string | Species): Promise<WikiInfo> {
  const photo = lookup(input)
  return { thumb: photo?.url ?? null, pageUrl: pageUrlFor(typeof input === "string" ? input : input.wiki), credit: photo }
}

export async function getPhoto(input: string | Species): Promise<string | null> {
  return lookup(input)?.url ?? null
}

export function pageUrlFor(wikiTitle: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))}`
}

export function nzBirdsOnlineSearch(name: string): string {
  return `https://www.nzbirdsonline.org.nz/search?keyword=${encodeURIComponent(name)}`
}
