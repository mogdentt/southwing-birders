import React, { useEffect, useState } from "react"
import type { Species } from "../types"
import { getPhoto } from "../lib/photos"
import { GroupSilhouette } from "./icons"

const urlCache = new Map<string, string | null>()

export function PhotoImg({ species, className }: { species: Species; className?: string }) {
  const cached = urlCache.get(species.id)
  const [url, setUrl] = useState<string | null | undefined>(cached)
  const [fit, setFit] = useState<"cover" | "contain">("cover")

  useEffect(() => {
    let alive = true
    setFit("cover")
    if (urlCache.has(species.id)) {
      setUrl(urlCache.get(species.id))
      return
    }
    setUrl(undefined)
    getPhoto(species.wiki).then((u) => {
      urlCache.set(species.id, u)
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [species.id, species.wiki])

  const loading = url === undefined
  return (
    <div className={`photo ${loading ? "loading" : ""} ${className ?? ""}`}>
      {url ? (
        <img
          src={url}
          alt={species.name}
          loading="lazy"
          className={fit === "contain" ? "contain" : undefined}
          onLoad={(e) => {
            const im = e.currentTarget
            const ratio = im.naturalWidth / Math.max(1, im.naturalHeight)
            // extreme panoramas or tall portraits get letterboxed instead of
            // centre-cropped, so the bird is always actually in frame
            if (ratio > 1.85 || ratio < 0.7) setFit("contain")
          }}
          onError={() => {
            urlCache.set(species.id, null)
            setUrl(null)
          }}
        />
      ) : !loading ? (
        <div className="fallback">
          <GroupSilhouette group={species.group} />
        </div>
      ) : null}
    </div>
  )
}
