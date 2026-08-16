import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import L from "leaflet"
import { HOTSPOTS } from "../data/hotspots"
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

export default function MapPage() {
  const nav = useNavigate()
  const { data } = useStore()
  const mapRef = useRef<L.Map | null>(null)
  const divRef = useRef<HTMLDivElement | null>(null)
  const [selected, setSelected] = useState<Hotspot | null>(null)

  const visited = useMemo(() => new Set(data.sightings.map((s) => s.hotspotId).filter(Boolean)), [data.sightings])

  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const map = L.map(divRef.current, { zoomControl: false, attributionControl: true })
    map.fitBounds(L.latLngBounds(HOTSPOTS.map((h) => [h.lat, h.lng] as [number, number])).pad(0.06))
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    L.control.zoom({ position: "topright" }).addTo(map)

    for (const h of HOTSPOTS) {
      const icon = L.divIcon({
        className: `hotspot-marker ${visited.has(h.id) ? "visited" : ""}`,
        html: `<div><span>${KIND_GLYPH[h.kind]}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 28],
      })
      L.marker([h.lat, h.lng], { icon }).addTo(map).on("click", () => setSelected(h))
    }

    // user location dot, if allowed
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          L.circleMarker([p.coords.latitude, p.coords.longitude], {
            radius: 7,
            color: "#fff",
            weight: 2.5,
            fillColor: "#2C7A8C",
            fillOpacity: 1,
          }).addTo(map)
        },
        () => {},
        { maximumAge: 300000, timeout: 5000 }
      )
    }

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className="map-wrap">
        <div ref={divRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {selected && (
        <div className="map-sheet">
          <div className="spread">
            <div>
              <h2 style={{ marginBottom: 0 }}>{selected.name}</h2>
              {selected.maori && selected.maori !== selected.name ? (
                <div className="tiny">{selected.maori}</div>
              ) : null}
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
              Hotspot guide
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
        </div>
      )}
    </>
  )
}
