import React, { useEffect, useState } from "react"
import type { Species } from "../types"
import { getSpeciesPhoto, type LicensedPhoto } from "../lib/photos"
import { GroupSilhouette } from "./icons"

export function PhotoImg({ species, className, quiz = false, onReady }: { species: Species; className?: string; quiz?: boolean; onReady?: (ready: boolean) => void }) {
  const photo = getSpeciesPhoto(species)
  // A keyed child resets all load/error/fit state immediately, before effects can run.
  // An old image's load/error event can never alter a newly selected species.
  return <PhotoFrame key={`${species.id}:${photo?.url ?? "none"}`} species={species} photo={photo} className={className} quiz={quiz} onReady={onReady} />
}

function PhotoFrame({ species, photo, className, quiz, onReady }: { species: Species; photo: LicensedPhoto | null; className?: string; quiz: boolean; onReady?: (ready: boolean) => void }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [fit, setFit] = useState<"cover" | "contain">("cover")

  useEffect(() => { onReady?.(loaded && !failed) }, [loaded, failed, onReady])

  useEffect(() => {
    if (!failed) return
    const retry = () => {
      setFailed(false)
      setLoaded(false)
      setFit("cover")
      setAttempt(n => n + 1)
    }
    window.addEventListener("online", retry)
    return () => window.removeEventListener("online", retry)
  }, [failed])

  const loading = Boolean(photo && !failed && !loaded)
  const author = photo && photo.artist !== photo.attribution ? `${photo.artist}; ${photo.attribution}` : photo?.artist
  const creditText = photo ? `${author} · ${photo.license}` : ""
  return (
    <div className={`photo ${loading ? "loading" : ""} ${className ?? ""}`}>
      {photo && !failed ? (
        <>
          <img
            key={attempt}
            src={photo.url}
            // The same component is used in the quiz: neither alt nor credit reveals the answer.
            alt={quiz ? "Bird photograph to identify" : species.name}
            loading="lazy"
            decoding="async"
            className={fit === "contain" ? "contain" : undefined}
            onLoad={(e) => {
              const im = e.currentTarget
              const ratio = im.naturalWidth / Math.max(1, im.naturalHeight)
              setFit(ratio > 1.85 || ratio < 0.7 ? "contain" : "cover")
              setLoaded(true)
            }}
            onError={() => setFailed(true)}
          />
          <a
            href={photo.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Photo credit: ${creditText}. ${photo.changes}`}
            title={`${creditText}. ${photo.changes}`}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            style={{ position: "absolute", bottom: 3, left: 3, maxWidth: "calc(100% - 6px)", boxSizing: "border-box", padding: "2px 5px", borderRadius: 4, background: "rgba(0, 0, 0, 0.82)", color: "#fff", fontSize: 10, lineHeight: 1.4, textDecoration: "underline", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", zIndex: 1 }}
          >
            {creditText}
          </a>
        </>
      ) : (
        <div className="fallback" role="img" aria-label="Bird photograph unavailable">
          <GroupSilhouette group={species.group} />
        </div>
      )}
    </div>
  )
}
