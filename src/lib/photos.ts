import localforage from "localforage"

/**
 * Bird photos come from each species' Wikipedia article via the MediaWiki
 * Action API (the CORS-safe `origin=*` endpoint, designed for browser use).
 * Requests are batched (up to 50 titles per call) and results are cached in
 * IndexedDB so repeat visits and offline use are instant.
 */

const cache = localforage.createInstance({ name: "southwing-photos" })

export interface WikiInfo {
  thumb: string | null
  pageUrl: string | null
}

interface Waiter {
  resolve: (thumb: string | null) => void
  promise: Promise<string | null>
}

const pending = new Map<string, Waiter>()
let flushTimer: number | undefined

function enqueue(title: string): Promise<string | null> {
  const existing = pending.get(title)
  if (existing) return existing.promise
  let resolve!: (t: string | null) => void
  const promise = new Promise<string | null>((r) => {
    resolve = r
  })
  pending.set(title, { resolve, promise })
  if (flushTimer === undefined) flushTimer = window.setTimeout(flush, 40)
  return promise
}

async function flush(): Promise<void> {
  flushTimer = undefined
  const batch = Array.from(pending.entries()).slice(0, 50)
  for (const [t] of batch) pending.delete(t)
  if (pending.size > 0) flushTimer = window.setTimeout(flush, 40)

  const titles = batch.map(([t]) => t)
  const results = new Map<string, string | null>()
  try {
    const url =
      "https://en.wikipedia.org/w/api.php" +
      "?action=query&format=json&formatversion=2&origin=*&redirects=1" +
      "&prop=pageimages&piprop=thumbnail&pithumbsize=640" +
      "&titles=" +
      encodeURIComponent(titles.join("|"))
    const res = await fetch(url)
    if (res.ok) {
      const json = await res.json()
      const q = json?.query
      const normalized = new Map<string, string>()
      for (const n of q?.normalized ?? []) normalized.set(n.from, n.to)
      const redirects = new Map<string, string>()
      for (const r of q?.redirects ?? []) redirects.set(r.from, r.to)
      const thumbs = new Map<string, string | null>()
      for (const p of q?.pages ?? []) thumbs.set(p.title, p?.thumbnail?.source ?? null)
      for (const t of titles) {
        let final = normalized.get(t) ?? t
        for (let hop = 0; hop < 3 && redirects.has(final); hop++) final = redirects.get(final)!
        results.set(t, thumbs.get(final) ?? null)
      }
    }
  } catch {
    // offline or blocked: resolve everyone with null, but cache nothing
  }

  for (const [title, waiter] of batch) {
    if (results.has(title)) {
      // definitive answer from the API (photo URL, or confirmed no image)
      const info: WikiInfo = { thumb: results.get(title) ?? null, pageUrl: pageUrlFor(title) }
      void cache.setItem(`wiki2:${title}`, info)
      waiter.resolve(info.thumb)
    } else {
      waiter.resolve(null)
    }
  }
}

export async function getWikiInfo(wikiTitle: string): Promise<WikiInfo> {
  const stored = await cache.getItem<WikiInfo>(`wiki2:${wikiTitle}`)
  if (stored) return stored
  const thumb = await enqueue(wikiTitle)
  return { thumb, pageUrl: pageUrlFor(wikiTitle) }
}

export async function getPhoto(wikiTitle: string): Promise<string | null> {
  const info = await getWikiInfo(wikiTitle)
  return info.thumb
}

export function pageUrlFor(wikiTitle: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))}`
}

export function nzBirdsOnlineSearch(name: string): string {
  return `https://www.nzbirdsonline.org.nz/search?keyword=${encodeURIComponent(name)}`
}
