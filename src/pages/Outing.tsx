import React, { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useStore } from "../lib/store"
import { HOTSPOTS, hotspotById } from "../data/hotspots"
import { speciesById, RARITY_POINTS } from "../data/species"
import { TopBar, useToast } from "../components/bits"
import { celebrateSmall } from "../lib/celebrate"
import { distKm, fmtDate, fmtTime, fmtDateShort } from "../lib/util"
import { IconPlus, IconStop, IconClock, IconTrash } from "../components/icons"

function useElapsed(startISO?: string) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [])
  if (!startISO) return ""
  const mins = Math.max(0, Math.floor((Date.now() - new Date(startISO).getTime()) / 60000))
  const h = Math.floor(mins / 60)
  return h ? `${h}h ${mins % 60}m` : `${mins}m`
}

export default function OutingPage() {
  const { data, activeOuting, startOuting, endOuting, deleteSighting } = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const [hotspotId, setHotspotId] = useState<string>("")
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [summary, setSummary] = useState<null | { name: string; species: number; lifers: number; pts: number; time: string }>(null)
  const elapsed = useElapsed(activeOuting?.startISO)

  useEffect(() => {
    if (activeOuting || !navigator.geolocation) return
    let alive = true
    navigator.geolocation.getCurrentPosition(
      (p) => { if (alive) setPos({ lat: p.coords.latitude, lng: p.coords.longitude }) },
      () => {},
      { maximumAge: 120000, timeout: 4000 }
    )
    return () => { alive = false }
  }, [activeOuting])

  const ranked = useMemo(() => {
    const list = [...HOTSPOTS]
    if (pos) list.sort((a, b) => distKm(pos.lat, pos.lng, a.lat, a.lng) - distKm(pos.lat, pos.lng, b.lat, b.lng))
    else list.sort((a, b) => `${a.region} ${a.name}`.localeCompare(`${b.region} ${b.name}`, "en-NZ"))
    return list
  }, [pos])

  const outingSightings = useMemo(
    () =>
      activeOuting
        ? data.sightings.filter((s) => s.outingId === activeOuting.id).sort((a, b) => b.dateISO.localeCompare(a.dateISO))
        : [],
    [data.sightings, activeOuting]
  )

  const pastOutings = useMemo(
    () => data.outings.filter((o) => o.endISO).sort((a, b) => b.startISO.localeCompare(a.startISO)).slice(0, 10),
    [data.outings]
  )

  function begin() {
    const h = hotspotId ? hotspotById.get(hotspotId) : undefined
    const hour = new Date().getHours()
    const part = hour < 11 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"
    const name = h ? `${part} at ${h.name}` : `${part} wander`
    startOuting(name, hotspotId || undefined)
    toast("Outing started. Go find them.")
  }

  function finish() {
    if (!activeOuting) return
    const speciesSet = new Set(outingSightings.map((s) => s.speciesId))
    // lifers earned during this outing: first-ever sighting is within the outing
    let lifers = 0
    let pts = 0
    for (const spId of speciesSet) {
      const all = data.sightings.filter((s) => s.speciesId === spId).sort((a, b) => a.dateISO.localeCompare(b.dateISO))
      if (all.length && all[0].outingId === activeOuting.id) {
        lifers++
        const sp = speciesById.get(spId)
        if (sp) pts += RARITY_POINTS[sp.rarity]
      }
    }
    setSummary({ name: activeOuting.name, species: speciesSet.size, lifers, pts, time: elapsed })
    endOuting(activeOuting.id)
    celebrateSmall()
  }

  if (summary) {
    return (
      <div className="lifer-modal" style={{ position: "fixed" }}>
        <div className="overlay" onClick={() => setSummary(null)} />
        <div className="lifer-card" style={{ zIndex: 101 }}>
          <div className="eyebrow">Outing complete</div>
          <h2>{summary.name}</h2>
          <div className="hero-stats" style={{ marginTop: 18 }}>
            <div className="hero-stat" style={{ background: "var(--card-2)" }}>
              <b>{summary.species}</b>
              <span style={{ color: "var(--ink-2)" }}>Species</span>
            </div>
            <div className="hero-stat" style={{ background: "var(--card-2)" }}>
              <b>{summary.lifers}</b>
              <span style={{ color: "var(--ink-2)" }}>Lifers</span>
            </div>
            <div className="hero-stat" style={{ background: "var(--card-2)" }}>
              <b>{summary.time || "—"}</b>
              <span style={{ color: "var(--ink-2)" }}>Out there</span>
            </div>
          </div>
          {summary.pts > 0 && <div className="pts mt16">+{summary.pts} points from lifers</div>}
          <button className="btn big mt16" onClick={() => nav("/", { replace: true })}>
            Done
          </button>
        </div>
      </div>
    )
  }

  if (!activeOuting) {
    return (
      <div className="fade-in">
        <TopBar title="Outings" />
        <div className="card">
          <h2>Start an outing</h2>
          <p className="muted" style={{ marginTop: 2 }}>
            An outing groups everything you log until you finish, like an eBird checklist. Timer runs, tally builds,
            summary at the end.
          </p>
          <label className="field mt8">
            <span>Where are you headed?</span>
            <select className="input" value={hotspotId} onChange={(e) => setHotspotId(e.target.value)}>
              <option value="">Across Aotearoa — just wandering</option>
              {ranked.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} · {h.region}
                  {pos ? ` · ${distKm(pos.lat, pos.lng, h.lat, h.lng).toFixed(1)} km` : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="tiny">{pos ? "Places are sorted by straight-line distance, not road or ferry travel time." : "No GPS fix; choose anywhere in Aotearoa. No home region is assumed."}</p>
          {hotspotId && <p className="muted">{hotspotById.get(hotspotId)?.tips} <Link to={`/hotspot/${hotspotId}`}>Read the access guide</Link></p>}
          <button className="btn big" onClick={begin}>
            <IconClock size={17} /> Start the clock
          </button>
        </div>

        {pastOutings.length > 0 && (
          <>
            <div className="section-title">
              <h2>Past outings</h2>
            </div>
            <div className="card" style={{ padding: "6px 16px" }}>
              {pastOutings.map((o) => {
                const n = new Set(data.sightings.filter((s) => s.outingId === o.id).map((s) => s.speciesId)).size
                return (
                  <div key={o.id} className="life-row">
                    <div className="meta">
                      <div className="n">{o.name}</div>
                      <div className="w">
                        {fmtDate(o.startISO)} · {fmtTime(o.startISO)}
                      </div>
                    </div>
                    <span className="pill status">{n} species</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  const speciesCount = new Set(outingSightings.map((s) => s.speciesId)).size
  return (
    <div className="fade-in">
      <TopBar title={activeOuting.name} back={false} />

      <div className="hero" style={{ padding: 16 }}>
        <div className="hero-stats" style={{ marginTop: 0 }}>
          <div className="hero-stat">
            <b>{elapsed || "0m"}</b>
            <span>On the clock</span>
          </div>
          <div className="hero-stat">
            <b>{speciesCount}</b>
            <span>Species</span>
          </div>
          <div className="hero-stat">
            <b>{outingSightings.reduce((a, s) => a + s.count, 0)}</b>
            <span>Birds</span>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <button className="btn" style={{ flex: 1.6 }} onClick={() => nav("/log")}>
          <IconPlus size={17} /> Add bird
        </button>
        <button className="btn danger" style={{ flex: 1 }} onClick={finish}>
          <IconStop size={16} /> Finish
        </button>
      </div>

      <div className="card" style={{ padding: "6px 16px" }}>
        {outingSightings.length === 0 && (
          <div className="empty" style={{ padding: 28 }}>
            <h3>Nothing yet</h3>
            <p>Eyes up, ears open. Tap Add bird when something moves.</p>
          </div>
        )}
        {outingSightings.map((s) => {
          const sp = speciesById.get(s.speciesId)
          if (!sp) return null
          return (
            <div key={s.id} className="life-row">
              <div className="meta">
                <div className="n">
                  {sp.name} {s.count > 1 ? <span className="tiny">× {s.count}</span> : null}
                </div>
                <div className="w">{fmtTime(s.dateISO)}{s.notes ? ` · ${s.notes}` : ""}</div>
              </div>
              <button
                className="back"
                style={{ width: 30, height: 30 }}
                onClick={() => deleteSighting(s.id)}
                aria-label="Remove"
              >
                <IconTrash size={14} />
              </button>
            </div>
          )
        })}
      </div>
      <div className="tiny" style={{ textAlign: "center" }}>
        Started {fmtDateShort(activeOuting.startISO)} {fmtTime(activeOuting.startISO)}
      </div>
    </div>
  )
}
