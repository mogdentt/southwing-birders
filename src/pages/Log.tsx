import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { SPECIES, speciesById } from "../data/species"
import { HOTSPOTS, hotspotById } from "../data/hotspots"
import { useStore } from "../lib/store"
import { PhotoImg } from "../components/PhotoImg"
import { TopBar, SpeciesRow, useToast } from "../components/bits"
import { LiferModal } from "../components/LiferModal"
import { celebrateLifer, celebrateSmall } from "../lib/celebrate"
import { distKm, nowISO, toLocalISO } from "../lib/util"
import { IconSearch, IconCheck } from "../components/icons"
import type { Species } from "../types"

function normalise(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

export default function Log() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data, lifeList, addSighting, activeOuting } = useStore()

  const preset = params.get("species")
  const [species, setSpecies] = useState<Species | null>(preset ? speciesById.get(preset) ?? null : null)
  const [q, setQ] = useState("")
  const [count, setCount] = useState(1)
  const [hotspotId, setHotspotId] = useState<string | undefined>(activeOuting?.hotspotId)
  const [when, setWhen] = useState(() => nowISO().slice(0, 16))
  const [notes, setNotes] = useState("")
  const dateRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const locationChosen = useRef(Boolean(activeOuting?.hotspotId))
  const [liferOf, setLiferOf] = useState<{ sp: Species; badges: string[] } | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    let alive = true
    navigator.geolocation.getCurrentPosition(
      (p) => { if (alive) setPos({ lat: p.coords.latitude, lng: p.coords.longitude }) },
      () => {},
      { maximumAge: 120000, timeout: 4000 }
    )
    return () => { alive = false }
  }, [])

  // nearest hotspots first
  const rankedHotspots = useMemo(() => {
    const list = [...HOTSPOTS]
    if (pos) list.sort((a, b) => distKm(pos.lat, pos.lng, a.lat, a.lng) - distKm(pos.lat, pos.lng, b.lat, b.lng))
    else list.sort((a, b) => `${a.region} ${a.name}`.localeCompare(`${b.region} ${b.name}`, "en-NZ"))
    return list
  }, [pos])

  useEffect(() => {
    if (!locationChosen.current && !hotspotId && pos && rankedHotspots.length) {
      const nearest = rankedHotspots[0]
      if (distKm(pos.lat, pos.lng, nearest.lat, nearest.lng) < 3) {
        setHotspotId(nearest.id)
        locationChosen.current = true
      }
    }
  }, [pos, rankedHotspots, hotspotId])

  const recentSpecies = useMemo(() => {
    const seen: string[] = []
    for (const s of [...data.sightings].sort((a, b) => b.dateISO.localeCompare(a.dateISO))) {
      if (!seen.includes(s.speciesId)) seen.push(s.speciesId)
      if (seen.length >= 6) break
    }
    return seen.map((id) => speciesById.get(id)!).filter(Boolean)
  }, [data.sightings])

  const results = useMemo(() => {
    const nq = normalise(q.trim())
    const month = new Date().getMonth() + 1
    if (!nq) return []
    return SPECIES.filter(
      (sp) => normalise(sp.name).includes(nq) || (sp.maori && normalise(sp.maori).includes(nq)) || normalise(sp.sci).includes(nq)
    )
      .sort((a, b) => {
        const aIn = !a.months || a.months.includes(month) ? 0 : 1
        const bIn = !b.months || b.months.includes(month) ? 0 : 1
        if (aIn !== bIn) return aIn - bIn
        return a.name.localeCompare(b.name)
      })
      .slice(0, 12)
  }, [q])

  const suggestedHotspot = hotspotId ? hotspotById.get(hotspotId) : undefined
  const suggestions = useMemo(() => {
    const month = new Date().getMonth() + 1
    // Without a selected local patch, never suggest the nearest distant sanctuary
    // or every "common" species (which can include geographically restricted birds).
    const ids = suggestedHotspot?.targets ?? ["tauhou", "house-sparrow", "blackbird", "starling", "mallard", "tarapunga"]
    const pool = ids.map((id) => speciesById.get(id)!).filter(Boolean)
    return pool.filter((s) => !s.months || s.months.includes(month)).slice(0, 6)
  }, [suggestedHotspot])

  function save() {
    if (!species) return
    if (!dateRef.current?.reportValidity()) return
    const dateISO = when.length === 16 ? `${when}:00` : when
    const hotspot = hotspotId ? hotspotById.get(hotspotId) : undefined
    // A manually selected distant hotspot must not inherit the device's home GPS.
    const coords = hotspot && (!pos || distKm(pos.lat, pos.lng, hotspot.lat, hotspot.lng) >= 3) ? hotspot : pos
    const res = addSighting({
      speciesId: species.id,
      count,
      dateISO,
      hotspotId,
      lat: coords?.lat,
      lng: coords?.lng,
      notes: notes.trim() || undefined,
      outingId: activeOuting?.id,
    })
    if (res.isLifer) {
      celebrateLifer()
      setLiferOf({ sp: species, badges: res.newBadges.map((b) => b.name) })
    } else {
      if (res.newBadges.length) {
        celebrateSmall()
        toast(`Badge earned: ${res.newBadges.map((b) => b.name).join(", ")}`, true)
      } else {
        toast(`${species.name} logged`)
      }
      nav(activeOuting ? "/outing" : -1 as any)
    }
  }

  if (liferOf) {
    return (
      <LiferModal
        species={liferOf.sp}
        badges={liferOf.badges}
        onClose={() => {
          nav(activeOuting ? "/outing" : "/", { replace: true })
        }}
      />
    )
  }

  // ── step 1: pick the bird ──
  if (!species) {
    return (
      <div className="fade-in">
        <TopBar title="What did you see?" />
        <div className="searchbar">
          <IconSearch />
          <input
            autoFocus
            className="input"
            placeholder="Start typing a bird…"
            aria-label="Search for a bird to log"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {q.trim() ? (
          <div className="card" style={{ padding: 6 }}>
            {results.map((sp) => (
              <SpeciesRow key={sp.id} sp={sp} seen={lifeList.has(sp.id)} onClick={() => setSpecies(sp)} />
            ))}
            {results.length === 0 && <div className="empty" style={{ padding: 24 }}>Nothing matches that.</div>}
          </div>
        ) : (
          <>
            {recentSpecies.length > 0 && (
              <>
                <div className="section-title">
                  <h2>Recent</h2>
                </div>
                <div className="card" style={{ padding: 6 }}>
                  {recentSpecies.map((sp) => (
                    <SpeciesRow key={sp.id} sp={sp} seen={lifeList.has(sp.id)} onClick={() => setSpecies(sp)} />
                  ))}
                </div>
              </>
            )}
            <div className="section-title">
              <h2>{suggestedHotspot ? `Birds at ${suggestedHotspot.name}` : "Across Aotearoa"}</h2>
            </div>
            <p className="tiny">{suggestedHotspot ? "Seasonal suggestions, not guaranteed sightings." : "Familiar birds to start with, not a prediction for your location. Search for any other species."}</p>
            <div className="card" style={{ padding: 6 }}>
              {suggestions.map((sp) => (
                <SpeciesRow key={sp.id} sp={sp} seen={lifeList.has(sp.id)} onClick={() => setSpecies(sp)} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── step 2: details ──
  const isLifer = !lifeList.has(species.id)
  return (
    <div className="fade-in">
      <TopBar title="Log sighting" />

      <div className="card flush">
        <div className="row" style={{ gap: 0 }}>
          <div style={{ width: 92, height: 92, flex: "none" }}>
            <PhotoImg species={species} />
          </div>
          <div style={{ padding: "10px 14px", flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0 }}>{species.name}</h3>
            <div className="tiny">{species.maori && species.maori !== species.name ? species.maori : species.sci}</div>
            {isLifer && (
              <span className="pill notable" style={{ marginTop: 6 }}>
                This would be a lifer
              </span>
            )}
          </div>
          <button className="btn ghost small" style={{ margin: 12, flex: "none" }} onClick={() => setSpecies(null)}>
            Change
          </button>
        </div>
      </div>

      <div className="card">
        <label className="field">
          <span>How many?</span>
          <div className="stepper">
            <button onClick={() => setCount(Math.max(1, count - 1))} aria-label="Fewer">−</button>
            <b>{count}</b>
            <button onClick={() => setCount(count + 1)} aria-label="More">+</button>
            <button onClick={() => setCount(count + 10)} style={{ width: "auto", padding: "0 12px", fontSize: 14 }}>
              +10
            </button>
          </div>
        </label>

        <label className="field">
          <span>Where?</span>
          <select className="input" value={hotspotId ?? ""} onChange={(e) => { locationChosen.current = true; setHotspotId(e.target.value || undefined) }}>
            <option value="">{pos ? "No hotspot — current GPS location" : "Across Aotearoa — no location set"}</option>
            {rankedHotspots.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} · {h.region}
                {pos ? ` · ${distKm(pos.lat, pos.lng, h.lat, h.lng).toFixed(1)} km` : ""}
              </option>
            ))}
          </select>
          <div className="tiny mt8">{hotspotId ? "The selected hotspot is saved; a nearby GPS fix refines its position, otherwise the hotspot pin is used." : pos ? "Your current GPS position will be saved. For an earlier sighting elsewhere, choose its hotspot instead." : "No GPS fix. Choose a hotspot, or leave location unset; no city is assumed."}</div>
        </label>

        <label className="field">
          <span>When?</span>
          <input ref={dateRef} className="input" type="datetime-local" required value={when} max={toLocalISO(new Date()).slice(0, 16)} onChange={(e) => setWhen(e.target.value)} />
        </label>

        <label className="field" style={{ marginBottom: 0 }}>
          <span>Notes (optional)</span>
          <textarea
            className="input"
            rows={2}
            placeholder="Behaviour, plumage, who you were with…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      {activeOuting && (
        <div className="muted mb8" style={{ textAlign: "center", fontSize: 12.5 }}>
          Will be added to outing: <b>{activeOuting.name}</b>
        </div>
      )}

      <button className="btn big" onClick={save}>
        <IconCheck size={18} /> Save sighting
      </button>
    </div>
  )
}
