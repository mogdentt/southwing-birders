import localforage from "localforage"

/**
 * Bird photos come from each species' Wikipedia article via the REST summary
 * endpoint (CORS-enabled, freely licensed images). Thumbnail URLs are cached
 * in IndexedDB so repeat visits and offline use are instant.
 */

const cache = localforage.createInstance({ name: "southwing-photos" })
const inflight = new Map<string, Promise<string | null>>()

export interface WikiInfo {
  thumb: string | null
  pageUrl: string | null
}

export async function getPhoto(wikiTitle: string): Promise<string | null> {
  const info = await getWikiInfo(wikiTitle)
  return info.thumb
}

export async function getWikiInfo(wikiTitle: string): Promise<WikiInfo> {
  const key = `wiki:${wikiTitle}`
  const stored = await cache.getItem<WikiInfo>(key)
  if (stored) return stored

  if (inflight.has(key)) {
    const thumb = await inflight.get(key)!
    return { thumb, pageUrl: pageUrlFor(wikiTitle) }
  }

  const p = (async (): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
        { headers: { Accept: "application/json" } }
      )
      if (!res.ok) return null
      const json = await res.json()
      let thumb: string | null = json?.thumbnail?.source ?? null
      // ask for a bigger rendition than the default tiny thumb
      if (thumb) thumb = thumb.replace(/\/(\d+)px-/, "/640px-")
      const info: WikiInfo = { thumb, pageUrl: json?.content_urls?.desktop?.page ?? pageUrlFor(wikiTitle) }
      await cache.setItem(key, info)
      return thumb
    } catch {
      return null
    }
  })()

  inflight.set(key, p)
  const thumb = await p
  inflight.delete(key)
  return { thumb, pageUrl: pageUrlFor(wikiTitle) }
}

export function pageUrlFor(wikiTitle: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))}`
}

export function nzBirdsOnlineSearch(name: string): string {
  return `https://www.nzbirdsonline.org.nz/search?keyword=${encodeURIComponent(name)}`
}
