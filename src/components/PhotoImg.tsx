import React, { useEffect, useState } from "react"
import type { Species } from "../types"
import { getPhoto } from "../lib/photos"
import { GroupSilhouette } from "./icons"

const urlCache = new Map<string, string | null>()

export function PhotoImg({ species, className }: { species: Species; className?: string }) {
  const cached = urlCache.get(species.id)
  const [url, setUrl] = useState<string | null | undefined>(cached)

  useEffect(() => {
    let alive = true
    if (urlCache.has(species.id)) {
      setUrl(urlCache.get(species.id))
      return
    }
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
