import React, { useEffect, useMemo, useState } from "react"
import { useStore } from "../lib/store"
import { TopBar } from "../components/bits"
import { notableCanterbury, recentNearby, type EbirdObs } from "../lib/ebird"
import { SPECIES } from "../data/species"
import { IconBell, IconExternal } from "../components/icons"

type State = { status: "idle" | "loading" | "ok" | "error"; notable: EbirdObs[]; nearby: EbirdObs[]; error?: string }

export default function Alerts() {
  const { data, updateSettings, lifeList } = useStore()
  const [keyInput, setKeyInput] = useState("")
  const [st, setSt] = useState<State>({ status: "idle", notable: [], nearby: [] })
  const key = data.settings.ebirdKey

  const sciToLocal = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of SPECIES) m.set(s.sci.toLowerCase().split(" ").slice(0, 2).join(" "), s.id)
    return m
  }, [])

  useEffect(() => {
    if (!key) return
    let alive = true
    setSt((s) => ({ ...s, status: "loading" }))
    Promise.all([
      notableCanterbury(key).catch((e) => {
        throw e
      }),
      recentNearby(key, data.settings.homeLat, data.settings.homeLng).catch(() => [] as EbirdObs[]),
    ])
      .then(([notable, nearby]) => {
        if (alive) setSt({ status: "ok", notable, nearby })
      })
      .catch((e: Error) => {
        if (alive)
          setSt({
            status: "error",
            notable: [],
            nearby: [],
            error:
              e.message === "bad-key"
                ? "eBird rejected that key. Double-check it in Settings."
                : "Could not reach eBird right now. Try again in a bit.",
          })
      })
    return () => {
      alive = false
    }
  }, [key, data.settings.homeLat, data.settings.homeLng])

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
            With a free eBird API key, Southwing shows rare birds reported across Canterbury and everything seen near
            you in the last week, live from real birders.
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
            <input className="input" placeholder="Your eBird API key" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
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

      {st.status === "loading" && (
        <div className="empty">
          <h3>Checking the wires…</h3>
        </div>
      )}
      {st.status === "error" && (
        <div className="card" style={{ background: "var(--red-soft)", border: "none" }}>
          <b style={{ color: "var(--red)", fontSize: 14 }}>{st.error}</b>
        </div>
      )}

      {st.status === "ok" && (
        <>
          <div className="section-title">
            <h2>Notable in Canterbury</h2>
            <span className="tiny">last 14 days</span>
          </div>
          <div className="card" style={{ padding: "4px 16px" }}>
            {st.notable.length === 0 && <p className="muted">Quiet out there. No notable reports.</p>}
            {st.notable.slice(0, 30).map((o, i) => (
              <ObsRow key={i} obs={o} highlight={needsIt(o)} />
            ))}
          </div>

          <div className="section-title">
            <h2>Near you</h2>
            <span className="tiny">25 km · last 7 days</span>
          </div>
          <div className="card" style={{ padding: "4px 16px" }}>
            {st.nearby.length === 0 && <p className="muted">No recent reports close by. Go create some.</p>}
            {st.nearby.slice(0, 40).map((o, i) => (
              <ObsRow key={i} obs={o} highlight={false} />
            ))}
          </div>
          <p className="tiny" style={{ textAlign: "center" }}>
            Live data from eBird (Cornell Lab of Ornithology), reported by real birders.
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
        {highlight && <em>you need this</em>}
      </div>
      <div className="w">
        {obs.locName} · {obs.obsDt}
        {" · "}
        <a href={`https://www.google.com/maps/search/?api=1&query=${obs.lat},${obs.lng}`} target="_blank" rel="noreferrer">
          map <IconExternal size={10} />
        </a>
      </div>
    </div>
  )
}
