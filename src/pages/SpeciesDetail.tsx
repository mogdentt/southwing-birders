import React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { speciesById, RARITY_POINTS, RARITY_LABEL } from "../data/species"
import { HOTSPOTS, hotspotById } from "../data/hotspots"
import { useStore } from "../lib/store"
import { PhotoImg } from "../components/PhotoImg"
import { TopBar, RarityPill, StatusPill } from "../components/bits"
import { getPhotoCredit, pageUrlFor, nzBirdsOnlineSearch } from "../lib/photos"
import { fmtDate, MONTH_NAMES } from "../lib/util"
import { IconPlus, IconExternal, IconCheck } from "../components/icons"

export default function SpeciesDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { lifeList, data } = useStore()
  const sp = id ? speciesById.get(id) : undefined
  if (!sp) return <div className="empty">That bird flew off.</div>

  const photo = getPhotoCredit(sp)
  const places = HOTSPOTS.filter((h) => h.targets.includes(sp.id) || sp.hotspots.includes(h.id))
  const first = lifeList.get(sp.id)
  const count = data.sightings.filter((s) => s.speciesId === sp.id).length
  const month = new Date().getMonth() + 1
  const inSeason = !sp.months || sp.months.includes(month)

  return (
    <div className="fade-in">
      <TopBar title={sp.name} />

      <div className="detail-hero">
        <PhotoImg species={sp} />
      </div>
      {photo ? <p className="tiny photo-attribution">
        Photo: <a href={photo.fileUrl} target="_blank" rel="noreferrer">{photo.artist}</a>
        {photo.attribution !== photo.artist ? ` · ${photo.attribution}` : ""}{" · "}
        <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a>. {photo.changes}
      </p> : <p className="tiny">No verified photo is available for this entry. A silhouette is shown rather than an uncertain match.</p>}

      <div className="detail-title spread" style={{ alignItems: "flex-start" }}>
        <div>
          <h1>{sp.name}</h1>
          {sp.maori && sp.maori !== sp.name ? <div className="maori">{sp.maori}</div> : null}
          <div className="sci">{sp.sci}</div>
        </div>
        <button className="btn" onClick={() => nav(`/log?species=${sp.id}`)}>
          <IconPlus size={16} /> Log
        </button>
      </div>

      <div className="row mt8" style={{ flexWrap: "wrap", gap: 6 }}>
        <RarityPill r={sp.rarity} />
        <StatusPill s={sp.status} />
        {sp.threat && <span className="pill status">{sp.threat}</span>}
        {!inSeason && <span className="pill status">Out of season now</span>}
      </div>

      {first ? (
        <div className="card mt16" style={{ background: "var(--green-soft)", border: "none" }}>
          <div className="row">
            <IconCheck size={18} className="tick" />
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 14 }}>On your life list</b>
              <div className="tiny">
                First seen {fmtDate(first.dateISO)}
                {first.hotspotId ? ` at ${hotspotById.get(first.hotspotId)?.name}` : ""} · logged {count} time{count > 1 ? "s" : ""}
              </div>
            </div>
            <b style={{ color: "var(--green)", fontFamily: "var(--font-display)" }}>+{RARITY_POINTS[sp.rarity]}</b>
          </div>
        </div>
      ) : (
        <div className="card mt16" style={{ background: "var(--gold-soft)", border: "none" }}>
          <div className="spread">
            <div>
              <b style={{ fontSize: 14 }}>Not on your list yet</b>
              <div className="tiny">
                {RARITY_LABEL[sp.rarity]} · worth {RARITY_POINTS[sp.rarity]} point{RARITY_POINTS[sp.rarity] > 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card mt16">
        <div className="kv">
          <div>
            <b>{sp.sizeCm} cm</b>
            <span>LENGTH</span>
          </div>
          <div>
            <b>{sp.group}</b>
            <span>HABITAT</span>
          </div>
          <div>
            <b>{sp.months ? sp.months.map((m) => MONTH_NAMES[m - 1]).join(" ") : "See range"}</b>
            <span>TYPICAL SEASON</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>The bird</h3>
        <p className="muted mt0" style={{ marginBottom: 0 }}>{sp.desc}</p>
      </div>

      <div className="card">
        <h3>Range in Aotearoa</h3>
        <p className="muted mt0">{sp.range ?? "Check the linked species account for current distribution."}</p>
        <p className="tiny" style={{ marginBottom: 0 }}>A broad range, not a sighting guarantee or permission to enter. Seasonal visitors can occur outside the listed months. Rarity labels are game-scoring categories, not national abundance or conservation assessments.</p>
      </div>

      <div className="card">
        <h3>How to pick it</h3>
        <p className="muted mt0" style={{ marginBottom: 0 }}>{sp.idTips}</p>
      </div>

      <div className="card fact-card">
        <h3>Worth knowing</h3>
        <p className="mt0" style={{ marginBottom: 0, fontSize: 14 }}>{sp.fact}</p>
      </div>

      <div className="card">
        <h3>Where to find one</h3>
        <div style={{ marginTop: 8 }}>
          {places.length === 0 && <p className="muted">No public hotspot is recommended for this entry yet. Check its range and source account; some island and conservation sites require permits or are closed to visitors.</p>}
          {places.map((h) => {
            return (
              <Link key={h.id} to={`/hotspot/${h.id}`} className="row" style={{ padding: "8px 0", borderBottom: "1px solid color-mix(in srgb, var(--line) 45%, transparent)" }}>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{h.name}</span>
                <span className="tiny">{h.region} · {h.kind}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <a className="btn ghost" style={{ flex: 1 }} href={sp.nzbo ?? nzBirdsOnlineSearch(sp.name)} target="_blank" rel="noreferrer">
          <IconExternal size={15} /> NZ Birds Online
        </a>
        <a className="btn ghost" style={{ flex: 1 }} href={pageUrlFor(sp.wiki)} target="_blank" rel="noreferrer">
          <IconExternal size={15} /> Wikipedia
        </a>
      </div>
    </div>
  )
}
