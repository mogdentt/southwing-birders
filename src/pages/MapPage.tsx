import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import L from "leaflet"
import { HOTSPOTS, HOTSPOT_REGIONS } from "../data/hotspots"
import { useStore } from "../lib/store"
import type { Hotspot } from "../types"
import { IconX } from "../components/icons"

const KIND_GLYPH: Record<Hotspot["kind"], string> = {
  wetland: "W",
  estuary: "E",
  park: "P",
  forest: "F",
  coast: "C",
  river: "R",
  lake: "L",
}

// Leaflet only: draw the Chathams east of mainland NZ across the antimeridian.
// Stored coordinates, GPS, exports and directions always retain standard longitude.
const mapLng = (lng: number) => lng < -170 ? lng + 360 : lng
const point = (h: { lat: number; lng: number }): [number, number] => [h.lat, mapLng(h.lng)]
const normalise = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

export default function MapPage() {
  const nav = useNavigate()
  const { data } = useStore()
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const divRef = useRef<HTMLDivElement | null>(null)
  const [selected, setSelected] = useState<Hotspot | null>(null)
  const [region, setRegion] = useState("")
  const [query, setQuery] = useState("")
  const [view, setView] = useState<"map" | "list">("map")
  const [location, setLocation] = useState<[number, number] | null>(null)
  const [locationMessage, setLocationMessage] = useState("Explore any region; location is optional.")

  const visited = useMemo(() => new Set(data.sightings.map((s) => s.hotspotId).filter(Boolean)), [data.sightings])
  const filtered = useMemo(() => {
    const q = normalise(query.trim())
    return HOTSPOTS.filter((h) => (!region || h.region === region) &&
      (!q || normalise(`${h.name} ${h.maori ?? ""} ${h.region ?? ""} ${h.kind} ${h.blurb}`).includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, "en-NZ"))
  }, [region, query])

  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const map = L.map(divRef.current, { zoomControl: false, attributionControl: true }).setView([-41, 174], 5)
    mapRef.current = map
    markersRef.current = L.layerGroup().addTo(map)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    L.control.zoom({ position: "topright" }).addTo(map)

    let alive = true
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (!alive) return
          const coords: [number, number] = [p.coords.latitude, mapLng(p.coords.longitude)]
          setLocation(coords)
          setLocationMessage("Location available. Use My location to centre the map.")
          L.circleMarker(coords, {
            radius: 7,
            color: "#fff",
            weight: 2.5,
            fillColor: "#2C7A8C",
            fillOpacity: 1,
          }).addTo(map)
        },
        () => { if (alive) setLocationMessage("Location unavailable. Search or choose any region instead.") },
        { maximumAge: 300000, timeout: 5000 }
      )
    }

    const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    resize.observe(divRef.current)
    return () => {
      alive = false
      resize.disconnect()
      map.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    const layer = markersRef.current
    if (!layer) return
    layer.clearLayers()
    for (const h of filtered) {
      const icon = L.divIcon({
        className: `hotspot-marker ${visited.has(h.id) ? "visited" : ""}`,
        html: `<div><span>${KIND_GLYPH[h.kind]}</span></div>`,
        iconSize: [30, 30], iconAnchor: [15, 28],
      })
      const marker = L.marker(point(h), { icon, title: `${h.name}, ${h.region}`, alt: h.name })
        .addTo(layer).on("click", () => setSelected(h))
      // Div icons do not inherit Leaflet's image alt text.
      marker.getElement()?.setAttribute("aria-label", `${h.name}, ${h.region}`)
    }
  }, [filtered, visited])

  // Only filter/search changes reset the viewport, never selection or store renders.
  useEffect(() => {
    if (filtered.length) mapRef.current?.fitBounds(L.latLngBounds(filtered.map(point)), { padding: [28, 28], maxZoom: 13, animate: false })
    setSelected((current) => current && filtered.some((h) => h.id === current.id) ? current : null)
  }, [filtered])

  return (
    <>
      <div className="map-wrap" style={{ display: "flex", flexDirection: "column", background: "var(--paper)" }}>
        <header className="card" style={{ flex: "none", margin: 0, padding: "10px 14px", borderRadius: 0, zIndex: 1 }}>
          <div className="spread" style={{ gap: 8, marginBottom: 8 }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>Birding Aotearoa</h1>
            <div className="row" style={{ gap: 4 }} aria-label="Hotspot view">
              <button className={`chip ${view === "map" ? "on" : ""}`} aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button>
              <button className={`chip ${view === "list" ? "on" : ""}`} aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
            </div>
          </div>
          <input className="input" type="search" aria-label="Search hotspots" placeholder="Search places, regions, habitats…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="row mt8" style={{ gap: 8, flexWrap: "wrap" }}>
            <select className="input" style={{ flex: "1 1 180px", minWidth: 0 }} aria-label="Hotspot region" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">All Aotearoa New Zealand</option>
              {HOTSPOT_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {(region || query) && <button className="btn ghost small" onClick={() => { setRegion(""); setQuery("") }}>Reset</button>}
            {location && view === "map" && <button className="btn ghost small" onClick={() => mapRef.current?.setView(location, 11)}>My location</button>}
          </div>
          <div className="tiny mt8" role="status">{filtered.length} of {HOTSPOTS.length} hotspots · {locationMessage}</div>
        </header>
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <div ref={divRef} role="region" aria-label="Hotspot map; the List view provides the same places as links" aria-hidden={view !== "map"} style={{ width: "100%", height: "100%", visibility: view === "map" ? "visible" : "hidden" }} />
          {view === "list" && <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "12px 16px 32px" }}>
            <p className="tiny">Representative public birding places, not an exhaustive directory. Read access advice before travelling.</p>
            {filtered.map((h) => <Link key={h.id} to={`/hotspot/${h.id}`} className="card" style={{ display: "block" }}>
              <h2 style={{ fontSize: 17 }}>{h.name}</h2>
              <div className="tiny">{h.region} · {h.kind}{visited.has(h.id) ? " · Visited" : ""}</div>
              <p className="muted" style={{ marginBottom: 0 }}>{h.blurb}</p>
            </Link>)}
          </div>}
          {!filtered.length && <div className="card" role="status" style={{ position: "absolute", top: view === "list" ? 70 : 12, left: 16, right: 60, zIndex: 500 }}>No places match. Try another region or reset the search.</div>}
        </div>
      </div>

      {selected && view === "map" && (
        <section className="map-sheet" aria-label="Selected hotspot" style={{ maxHeight: "44dvh", overflowY: "auto" }}>
          <div className="spread">
            <div>
              <h2 style={{ marginBottom: 0 }}>{selected.name}</h2>
              {selected.maori && selected.maori !== selected.name ? (
                <div className="tiny">{selected.maori}</div>
              ) : null}
              <div className="tiny">{selected.region} · {selected.kind}</div>
            </div>
            <button className="back" onClick={() => setSelected(null)} aria-label="Close">
              <IconX size={16} />
            </button>
          </div>
          <p className="muted" style={{ margin: "8px 0 12px", fontSize: 13 }}>
            {selected.blurb}
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => nav(`/hotspot/${selected.id}`)}>
              Guide & access
            </button>
            <a
              className="btn ghost"
              style={{ flex: 1 }}
              href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Directions
            </a>
          </div>
        </section>
      )}
    </>
  )
}
