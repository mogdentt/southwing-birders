import React, { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { SPECIES } from "../data/species"
import type { BirdGroup, Rarity } from "../types"
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

  const list = useMemo(() => {
    const nq = normalise(q.trim())
    const month = new Date().getMonth() + 1
    return SPECIES.filter((sp) => {
      if (group !== "All" && sp.group !== group) return false
      if (seenF === "seen" && !lifeList.has(sp.id)) return false
      if (seenF === "needed" && lifeList.has(sp.id)) return false
      if (!nq) return true
      return (
        normalise(sp.name).includes(nq) ||
        (sp.maori && normalise(sp.maori).includes(nq)) ||
        normalise(sp.sci).includes(nq)
      )
    }).sort((a, b) => {
      // in-season and common first, then alphabetical
      const aIn = !a.months || a.months.includes(month) ? 0 : 1
      const bIn = !b.months || b.months.includes(month) ? 0 : 1
      if (aIn !== bIn) return aIn - bIn
      return a.name.localeCompare(b.name)
    })
  }, [q, group, seenF, lifeList])

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

      <div className="searchbar">
        <IconSearch />
        <input
          className="input"
          placeholder="Search names, te reo, scientific…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="chips">
        {GROUPS.map((g) => (
          <button key={g} className={`chip ${(g === "All" ? !params.get("group") : group === g) ? "on" : ""}`} onClick={() => setGroup(g)}>
            {g}
          </button>
        ))}
      </div>
      <div className="chips" style={{ paddingTop: 0 }}>
        <button className={`chip ${seenF === "all" ? "on" : ""}`} onClick={() => setSeen("all")}>
          Everything
        </button>
        <button className={`chip ${seenF === "needed" ? "on" : ""}`} onClick={() => setSeen("needed")}>
          Still need
        </button>
        <button className={`chip ${seenF === "seen" ? "on" : ""}`} onClick={() => setSeen("seen")}>
          Seen
        </button>
      </div>

      <div className="sp-grid">
        {list.map((sp) => (
          <div key={sp.id} className="sp-card" onClick={() => nav(`/guide/${sp.id}`)}>
            <div className="ph">
              <PhotoImg species={sp} />
            </div>
            {lifeList.has(sp.id) && (
              <span className="seenmark">
                <IconCheck size={14} />
              </span>
            )}
            <div className="body">
              <div className="n">{sp.name}</div>
              <div className="m">{sp.maori && sp.maori !== sp.name ? sp.maori : sp.sci}</div>
              <div className="pills">
                <RarityPill r={sp.rarity} />
                {sp.status === "Endemic" && <span className="pill endemic">Endemic</span>}
              </div>
            </div>
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
