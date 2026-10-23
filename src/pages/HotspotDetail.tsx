import React, { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { hotspotById, HOTSPOT_VISITOR_LINKS } from "../data/hotspots"
import { speciesById } from "../data/species"
import { useStore } from "../lib/store"
import { TopBar, SpeciesRow } from "../components/bits"
import { fmtDateShort } from "../lib/util"
import { IconClock, IconExternal } from "../components/icons"

export default function HotspotDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, lifeList, startOuting, activeOuting } = useStore()
  const h = id ? hotspotById.get(id) : undefined

  const myHere = useMemo(
    () => (h ? data.sightings.filter((s) => s.hotspotId === h.id) : []),
    [data.sightings, h]
  )
  const mySpeciesHere = new Set(myHere.map((s) => s.speciesId)).size

  if (!h) return <div className="empty">Unknown spot.</div>

  const targets = h.targets.map((tid) => speciesById.get(tid)!).filter(Boolean)
  const needed = targets.filter((sp) => !lifeList.has(sp.id))

  function begin() {
    if (activeOuting) {
      nav("/outing")
      return
    }
    const hour = new Date().getHours()
    const part = hour < 11 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"
    startOuting(`${part} at ${h!.name}`, h!.id)
    nav("/outing")
  }

  return (
    <div className="fade-in">
      <TopBar title={h.name} />

      <div className="hero" style={{ padding: 18 }}>
        <div className="hi" style={{ fontSize: 21 }}>
          {h.name}
        </div>
        {h.maori && h.maori !== h.name ? <div className="sub">{h.maori}</div> : null}
        <div className="sub">{h.region} · {h.kind}</div>
        <div className="hero-stats">
          <div className="hero-stat">
            <b>{targets.length}</b>
            <span>Target species</span>
          </div>
          <div className="hero-stat">
            <b>{needed.length}</b>
            <span>Would be lifers</span>
          </div>
          <div className="hero-stat">
            <b>{mySpeciesHere}</b>
            <span>Your species here</span>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <button className="btn" style={{ flex: 1.4 }} onClick={begin}>
          <IconClock size={16} /> {activeOuting ? "Outing running" : "Start outing here"}
        </button>
        <a
          className="btn ghost"
          style={{ flex: 1 }}
          href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          <IconExternal size={15} /> Directions
        </a>
      </div>

      <div className="card">
        <h3>The spot</h3>
        <p className="muted mt0" style={{ marginBottom: 0 }}>{h.blurb}</p>
      </div>

      <div className="card fact-card">
        <h3>Access & field craft</h3>
        <p className="mt0" style={{ marginBottom: 0, fontSize: 14 }}>{h.tips}</p>
        {HOTSPOT_VISITOR_LINKS[h.id] && <p className="mb0"><a href={HOTSPOT_VISITOR_LINKS[h.id]} target="_blank" rel="noreferrer">Visitor information & current access <IconExternal size={13} /></a></p>}
      </div>

      <div className="card">
        <h3>Visit with care</h3>
        <p className="muted mt0" style={{ marginBottom: 0 }}>Pins are approximate access or viewing points, not nest locations or a guarantee of entry. Check current land-manager notices, tides and weather. Book transport or permits where required; directions do not establish public access. Stay on open tracks, respect private land and nesting fences, keep your distance and avoid playback, feeding or disturbing birds.</p>
      </div>

      <div className="section-title">
        <h2>Birds to look for</h2>
      </div>
      <p className="tiny">A selection of possible birds, not guaranteed sightings. Season, tide and habitat matter.</p>
      <div className="card" style={{ padding: 6 }}>
        {targets.map((sp) => (
          <SpeciesRow key={sp.id} sp={sp} seen={lifeList.has(sp.id)} />
        ))}
      </div>

      {myHere.length > 0 && (
        <>
          <div className="section-title">
            <h2>Your history here</h2>
          </div>
          <div className="card" style={{ padding: "6px 16px" }}>
            {[...myHere]
              .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
              .slice(0, 12)
              .map((s) => {
                const sp = speciesById.get(s.speciesId)
                return sp ? (
                  <div key={s.id} className="life-row">
                    <div className="meta">
                      <div className="n">
                        {sp.name} {s.count > 1 ? <span className="tiny">× {s.count}</span> : null}
                      </div>
                      <div className="w">{fmtDateShort(s.dateISO)}</div>
                    </div>
                  </div>
                ) : null
              })}
          </div>
        </>
      )}
    </div>
  )
}
