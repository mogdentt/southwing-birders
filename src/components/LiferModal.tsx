import React from "react"
import type { Species } from "../types"
import { PhotoImg } from "./PhotoImg"
import { RARITY_POINTS } from "../data/species"
import { useStore } from "../lib/store"

export function LiferModal({ species, onClose, badges }: { species: Species; onClose: () => void; badges: string[] }) {
  const { lifeList } = useStore()
  const nth = lifeList.size
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="lifer-modal" onClick={onClose}>
        <div className="lifer-card" onClick={(e) => e.stopPropagation()}>
          <div className="eyebrow">Lifer no. {nth}</div>
          <h2>{species.name}</h2>
          {species.maori && species.maori !== species.name ? <div className="muted">{species.maori}</div> : null}
          <div className="ph">
            <PhotoImg species={species} />
          </div>
          <div className="pts">+{RARITY_POINTS[species.rarity]} points</div>
          {badges.length > 0 && (
            <p className="muted mt8">
              Badge{badges.length > 1 ? "s" : ""} earned: <b>{badges.join(", ")}</b>
            </p>
          )}
          <button className="btn big mt16" onClick={onClose}>
            Sweet as
          </button>
        </div>
      </div>
    </>
  )
}
