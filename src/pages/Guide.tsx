import React, { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { SPECIES } from "../data/species"
import type { BirdGroup, BirdStatus } from "../types"
import { useStore, TOTAL_SPECIES } from "../lib/store"
import { PhotoImg } from "../components/PhotoImg"
import { RarityPill } from "../components/bits"
import { IconSearch, IconCheck } from "../components/icons"

const GROUPS: (BirdGroup | "All")[] = ["All", "Bush & garden", "Wetland & lake", "Estuary & shore", "Coast & sea", "Open country"]

type SeenFilter = "all" | "seen" | "needed"

function normalise(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

export default function Guide() {
  const { lifeList } = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState("")
  const group = (params.get("group") as BirdGroup | "All") || "All"
  const seenF = (params.get("seen") as SeenFilter) || "all"
  const status = (params.get("status") as BirdStatus | "") || ""

  const list = useMemo(() => {
    const nq = normalise(q.trim())
    const month = new Date().getMonth() + 1
    return SPECIES.filter((sp) => {
      if (group !== "All" && sp.group !== group) return false
      if (status && sp.status !== status) return false
      if (seenF === "seen" && !lifeList.has(sp.id)) return false
      if (seenF === "needed" && lifeList.has(sp.id)) return false
      if (!nq) return true
      return (
        normalise(sp.name).includes(nq) ||
        (sp.maori && normalise(sp.maori).includes(nq)) ||
        normalise(sp.sci).includes(nq) ||
        normalise(sp.range ?? "").includes(nq) ||
        normalise(sp.status).includes(nq)
      )
    }).sort((a, b) => {
      // in-season and common first, then alphabetical
      const aIn = !a.months || a.months.includes(month) ? 0 : 1
      const bIn = !b.months || b.months.includes(month) ? 0 : 1
      if (aIn !== bIn) return aIn - bIn
      return a.name.localeCompare(b.name)
    })
  }, [q, group, seenF, status, lifeList])

  const setGroup = (g: string) => {
    const p = new URLSearchParams(params)
    if (g === "All") p.delete("group")
    else p.set("group", g)
    setParams(p, { replace: true })
  }
  const setSeen = (s: SeenFilter) => {
    const p = new URLSearchParams(params)
    if (s === "all") p.delete("seen")
    else p.set("seen", s)
    setParams(p, { replace: true })
  }

  return (
    <div className="fade-in">
      <div className="topbar">
        <h1>Field guide</h1>
        <span className="tiny">
          {lifeList.size}/{TOTAL_SPECIES} seen
        </span>
      </div>

      <p className="muted">A practical guide to birds across Aotearoa New Zealand, including regional and island specialists. Not an exhaustive checklist of every rare vagrant: check each bird's range and access advice before planning a trip.</p>
      <div className="searchbar">
        <IconSearch />
        <input
          className="input"
          placeholder="Search names, te reo, range…"
          aria-label="Search species names, scientific names, status or range"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <label className="field">
        <span>Origin / status</span>
        <select className="input" value={status} onChange={(e) => {
          const p = new URLSearchParams(params)
          if (e.target.value) p.set("status", e.target.value)
          else p.delete("status")
          setParams(p, { replace: true })
        }}>
          <option value="">All statuses</option>
          {["Endemic", "Native", "Migrant", "Introduced"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <div className="chips">
        {GROUPS.map((g) => (
          <button key={g} className={`chip ${(g === "All" ? !params.get("group") : group === g) ? "on" : ""}`} aria-pressed={group === g} onClick={() => setGroup(g)}>
            {g}
          </button>
        ))}
      </div>
      <div className="chips" style={{ paddingTop: 0 }}>
        <button className={`chip ${seenF === "all" ? "on" : ""}`} aria-pressed={seenF === "all"} onClick={() => setSeen("all")}>
          Everything
        </button>
        <button className={`chip ${seenF === "needed" ? "on" : ""}`} aria-pressed={seenF === "needed"} onClick={() => setSeen("needed")}>
          Still need
        </button>
        <button className={`chip ${seenF === "seen" ? "on" : ""}`} aria-pressed={seenF === "seen"} onClick={() => setSeen("seen")}>
          Seen
        </button>
      </div>

      <p className="tiny" role="status">{list.length} species match</p>
      <div className="sp-grid">
        {list.map((sp) => (
          <div key={sp.id} className="sp-card">
            <div className="ph">
              <PhotoImg species={sp} />
            </div>
            {lifeList.has(sp.id) && (
              <span className="seenmark">
                <IconCheck size={14} />
              </span>
            )}
            <button className="body species-card-button" aria-label={`View ${sp.name}`} onClick={() => nav(`/guide/${sp.id}`)}>
              <div className="n">{sp.name}</div>
              <div className="m">{sp.maori && sp.maori !== sp.name ? sp.maori : sp.sci}</div>
              <div className="pills">
                <RarityPill r={sp.rarity} />
                {sp.status === "Endemic" && <span className="pill endemic">Endemic</span>}
              </div>
            </button>
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <div className="empty">
          <h3>No birds match</h3>
          <p>Try a different search or filter. The bird is out there.</p>
        </div>
      )}
    </div>
  )
}
