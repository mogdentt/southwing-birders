import React, { useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "../lib/store"
import { TopBar } from "../components/bits"
import { EBIRD_REGIONS, notableRegion, recentNearby, type EbirdObs } from "../lib/ebird"
import { SPECIES } from "../data/species"
import { IconBell, IconExternal } from "../components/icons"

type State = { status: "idle" | "loading" | "ok"; notable: EbirdObs[]; nearby: EbirdObs[]; notableError?: string; nearbyError?: string }
type Position = { lat: number; lng: number }

const requestError = (reason: unknown) => reason instanceof Error && reason.message === "bad-key"
  ? "eBird rejected that key. Double-check it in Settings."
  : "Could not reach eBird. Check your connection and try Refresh."

export default function Alerts() {
  const { data, updateSettings, lifeList } = useStore()
  const [keyInput, setKeyInput] = useState("")
  const [st, setSt] = useState<State>({ status: "idle", notable: [], nearby: [] })
  const [region, setRegion] = useState("NZ")
  const [refresh, setRefresh] = useState(0)
  const { homeLat, homeLng } = data.settings
  const validHome = Number.isFinite(homeLat) && Number.isFinite(homeLng) && Math.abs(homeLat) <= 90 && Math.abs(homeLng) <= 180
  // Older backups contain a Christchurch default, not necessarily the user's home.
  const legacyHome = homeLat === -43.5321 && homeLng === 172.6362
  const [nearSource, setNearSource] = useState<"none" | "home" | "gps">(() => validHome && !legacyHome ? "home" : "none")
  const [gps, setGps] = useState<Position | null>(null)
  const [gpsMessage, setGpsMessage] = useState("")
  const [locating, setLocating] = useState(false)
  const locationRequest = useRef(0)
  const key = data.settings.ebirdKey
  const regionName = EBIRD_REGIONS.find((r) => r.code === region)?.name ?? "Aotearoa New Zealand"
  const nearbyPoint = useMemo(() => nearSource === "gps" ? gps : nearSource === "home" && validHome ? { lat: homeLat, lng: homeLng } : null, [nearSource, gps, validHome, homeLat, homeLng])

  useEffect(() => () => { locationRequest.current++ }, [])

  function locate() {
    if (!navigator.geolocation) { setGpsMessage("Location is not supported. Choose your saved home or update it in Settings."); return }
    const request = ++locationRequest.current
    setLocating(true)
    setGpsMessage("Finding your location…")
    navigator.geolocation.getCurrentPosition((p) => {
      if (request !== locationRequest.current) return
      setGps({ lat: p.coords.latitude, lng: p.coords.longitude })
      setNearSource("gps")
      setLocating(false)
      setGpsMessage("Using your current device location; your saved home has not changed.")
    }, () => {
      if (request !== locationRequest.current) return
      setLocating(false)
      setGpsMessage("Location unavailable. Choose your saved home, or update it in Settings; no fallback city is used.")
    }, { maximumAge: 120000, timeout: 6000 })
  }

  const sciToLocal = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of SPECIES) m.set(s.sci.toLowerCase().split(" ").slice(0, 2).join(" "), s.id)
    return m
  }, [])

  useEffect(() => {
    if (!key) { setSt({ status: "idle", notable: [], nearby: [] }); return }
    const controller = new AbortController()
    setSt({ status: "loading", notable: [], nearby: [] })
    Promise.allSettled([
      notableRegion(key, region, 14, controller.signal),
      nearbyPoint ? recentNearby(key, nearbyPoint.lat, nearbyPoint.lng, 25, 7, controller.signal) : Promise.resolve([] as EbirdObs[]),
    ]).then(([notable, nearby]) => {
      if (controller.signal.aborted) return
      setSt({
        status: "ok",
        notable: notable.status === "fulfilled" ? notable.value : [],
        nearby: nearby.status === "fulfilled" ? nearby.value : [],
        notableError: notable.status === "rejected" ? requestError(notable.reason) : undefined,
        nearbyError: nearby.status === "rejected" ? requestError(nearby.reason) : undefined,
      })
    })
    return () => controller.abort()
  }, [key, region, nearbyPoint, refresh])

  function needsIt(obs: EbirdObs): boolean {
    const localId = sciToLocal.get(obs.sciName.toLowerCase().split(" ").slice(0, 2).join(" "))
    return localId ? !lifeList.has(localId) : true
  }

  if (!key) {
    return (
      <div className="fade-in">
        <TopBar title="Rare bird alerts" />
        <div className="empty">
          <IconBell />
          <h3>Plug into the eBird firehose</h3>
          <p>
            With a free eBird API key, Southwing shows notable reports across Aotearoa New Zealand or a selected region,
            plus recent reports near your chosen home or device location. Coverage depends on what birders report.
          </p>
        </div>
        <div className="card">
          <ol style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.9 }}>
            <li>
              Create a free account at{" "}
              <a href="https://ebird.org" target="_blank" rel="noreferrer">
                ebird.org
              </a>
            </li>
            <li>
              Request a key at{" "}
              <a href="https://ebird.org/api/keygen" target="_blank" rel="noreferrer">
                ebird.org/api/keygen
              </a>
            </li>
            <li>Paste it below</li>
          </ol>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-label="eBird API key" placeholder="Your eBird API key" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
            <button className="btn" disabled={!keyInput.trim()} onClick={() => updateSettings({ ebirdKey: keyInput.trim() })}>
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <TopBar title="Rare bird alerts" />

      <div className="card">
        <label className="field">
          <span>Notable reports in</span>
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="NZ">All Aotearoa New Zealand</option>
            {EBIRD_REGIONS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Nearby reports centred on</span>
          <select className="input" value={nearSource} onChange={(e) => setNearSource(e.target.value as "none" | "home" | "gps")}>
            <option value="none">Choose a location — no default city</option>
            {validHome && <option value="home">Saved home ({homeLat.toFixed(3)}, {homeLng.toFixed(3)}){legacyHome ? " — verify the Christchurch default is intended" : ""}</option>}
            {gps && <option value="gps">Current device location</option>}
          </select>
        </label>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn ghost small" onClick={locate} disabled={locating}>Use my location</button>
          <button className="btn ghost small" onClick={() => setRefresh((r) => r + 1)} disabled={st.status === "loading"}>Refresh</button>
        </div>
        <p className="tiny" role="status">{gpsMessage || "Region selection only changes this page. Saved home can be edited in Settings."}</p>
      </div>
      <p className="tiny">Reports may be unreviewed and do not grant access. Respect private land, closures and nesting birds; private locations are omitted. Rakiura is included in Southland.</p>
      {st.status === "loading" && (
        <div className="empty" role="status">
          <h3>Checking the wires…</h3>
        </div>
      )}
      {st.status === "ok" && (
        <>
          <div className="section-title">
            <h2>Notable in {regionName}</h2>
            <span className="tiny">last 14 days</span>
          </div>
          <div className="card" style={{ padding: "4px 16px" }}>
            {st.notableError ? <p role="alert">{st.notableError}</p> : st.notable.length === 0 && <p className="muted">No public notable reports returned for this region.</p>}
            {st.notable.slice(0, 30).map((o, i) => (
              <ObsRow key={i} obs={o} highlight={needsIt(o)} />
            ))}
          </div>

          <div className="section-title">
            <h2>{nearSource === "home" ? "Near saved home" : "Near your location"}</h2>
            <span className="tiny">25 km · last 7 days</span>
          </div>
          <div className="card" style={{ padding: "4px 16px" }}>
            {!nearbyPoint ? <p className="muted">Choose a location above to request nearby reports.</p> : st.nearbyError ? <p role="alert">{st.nearbyError}</p> : st.nearby.length === 0 && <p className="muted">No recent public reports returned within 25 km.</p>}
            {st.nearby.slice(0, 40).map((o, i) => (
              <ObsRow key={i} obs={o} highlight={false} />
            ))}
          </div>
          <p className="tiny" style={{ textAlign: "center" }}>
            Live data from eBird (Cornell Lab of Ornithology). Showing up to 30 notable and 40 nearby reports, not an exhaustive list.
          </p>
        </>
      )}
    </div>
  )
}

function ObsRow({ obs, highlight }: { obs: EbirdObs; highlight: boolean }) {
  return (
    <div className="obs-row">
      <div className="n">
        <span>
          {obs.comName}
          {obs.howMany ? <span className="tiny"> × {obs.howMany}</span> : null}
        </span>
        {highlight && <em>not on your list</em>}
      </div>
      <div className="w">
        {obs.locName} · {obs.obsDt}
        {!obs.locationPrivate && Number.isFinite(obs.lat) && Number.isFinite(obs.lng) && <>{" · "}<a href={`https://www.google.com/maps/search/?api=1&query=${obs.lat},${obs.lng}`} target="_blank" rel="noreferrer">
          map <IconExternal size={10} />
        </a></>}
      </div>
    </div>
  )
}
