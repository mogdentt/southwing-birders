import React, { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useStore, TOTAL_SPECIES } from "../lib/store"
import { dailyBird } from "../lib/daily"
import { greeting, levelFor, timeAgo } from "../lib/util"
import { speciesById } from "../data/species"
import { hotspotById } from "../data/hotspots"
import { PhotoImg } from "../components/PhotoImg"
import { SpeciesRow } from "../components/bits"
import { BackupPanel } from "../components/BackupPanel"
import { Logo, IconFlame, IconTarget, IconQuiz, IconBell, IconTrophy, IconBinoculars, IconSettings } from "../components/icons"

export default function Home() {
  const { data, lifeList, points, streak } = useStore()
  const nav = useNavigate()
  const daily = useMemo(() => dailyBird(), [])
  const level = levelFor(points)
  const recent = useMemo(
    () => [...data.sightings].sort((a, b) => b.dateISO.localeCompare(a.dateISO)).slice(0, 5),
    [data.sightings]
  )
  const dailySeen = lifeList.has(daily.species.id)
  const empty = data.sightings.length === 0

  return (
    <div className="fade-in">
      <div className="topbar">
        <div className="brandmark">
          <Logo />
          <div className="t">
            <b>Southwing</b>
            <span>Birding Aotearoa New Zealand</span>
          </div>
        </div>
        <button className="back" onClick={() => nav("/settings")} aria-label="Settings">
          <IconSettings size={18} />
        </button>
      </div>

      <div className="hero">
        <div className="hi">{greeting(data.settings.name || undefined)}</div>
        <div className="sub">
          {empty
            ? `Explore ${TOTAL_SPECIES} species across Aotearoa New Zealand.`
            : `Level ${level.idx + 1} · ${level.name}. ${level.note}.`}
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <b>
              {lifeList.size}
              <span style={{ fontSize: 13, opacity: 0.7 }}>/{TOTAL_SPECIES}</span>
            </b>
            <span>Life list</span>
          </div>
          <div className="hero-stat">
            <b>{points}</b>
            <span>Points</span>
          </div>
          <div className="hero-stat">
            <b className="streak-flame">
              {streak}
              <IconFlame size={15} />
            </b>
            <span>Day streak</span>
          </div>
        </div>
      </div>

      <BackupPanel />

      {empty && (
        <div className="card">
          <h2>Kia ora, new birder</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            Southwing is your field guide, notebook and life list for Aotearoa New Zealand. Find a bird, tap the big green
            button, and the obsession takes care of itself.
          </p>
          <div className="row mt16" style={{ gap: 8 }}>
            <Link to="/guide" className="btn" style={{ flex: 1 }}>
              <IconBinoculars size={17} /> Browse the guide
            </Link>
            <Link to="/map" className="btn ghost" style={{ flex: 1 }}>
              Find a hotspot
            </Link>
          </div>
        </div>
      )}

      <div className="section-title">
        <h2>Today's target</h2>
        <span className="tiny">changes daily</span>
      </div>
      <div className="card flush card-link" onClick={() => nav(`/guide/${daily.species.id}`)}>
        <div className="row" style={{ gap: 0 }}>
          <div style={{ width: 116, height: 116, flex: "none" }}>
            <PhotoImg species={daily.species} />
          </div>
          <div style={{ padding: "12px 14px", minWidth: 0 }}>
            <div className="row" style={{ gap: 6, marginBottom: 3 }}>
              <IconTarget size={15} className="tick" />
              <span className="tiny" style={{ fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {dailySeen ? "Seen before. Find it again" : "Would be a lifer"}
              </span>
            </div>
            <h3 style={{ margin: 0 }}>{daily.species.name}</h3>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
              Explore: {daily.hotspotName}
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>Quick draws</h2>
      </div>
      <div className="stat-tiles" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className="stat-tile card-link" onClick={() => nav("/quiz")} style={{ textAlign: "center" }}>
          <IconQuiz size={22} className="tick" />
          <span style={{ display: "block", marginTop: 5, fontWeight: 700, fontSize: 12.5, color: "var(--ink)" }}>ID Quiz</span>
        </div>
        <div className="stat-tile card-link" onClick={() => nav("/alerts")} style={{ textAlign: "center" }}>
          <IconBell size={22} className="tick" />
          <span style={{ display: "block", marginTop: 5, fontWeight: 700, fontSize: 12.5, color: "var(--ink)" }}>Rare alerts</span>
        </div>
        <div className="stat-tile card-link" onClick={() => nav("/mybirds")} style={{ textAlign: "center" }}>
          <IconTrophy size={22} className="tick" />
          <span style={{ display: "block", marginTop: 5, fontWeight: 700, fontSize: 12.5, color: "var(--ink)" }}>Badges</span>
        </div>
      </div>

      {recent.length > 0 && (
        <>
          <div className="section-title">
            <h2>Recent sightings</h2>
            <Link to="/mybirds">see all</Link>
          </div>
          <div className="card" style={{ padding: 6 }}>
            {recent.map((s) => {
              const sp = speciesById.get(s.speciesId)
              if (!sp) return null
              const where = s.hotspotId ? hotspotById.get(s.hotspotId)?.name : undefined
              return (
                <SpeciesRow
                  key={s.id}
                  sp={sp}
                  seen
                  sub={`${where ?? "Somewhere out there"} · ${timeAgo(s.dateISO)}`}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
