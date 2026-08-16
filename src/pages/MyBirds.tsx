import React, { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useStore, TOTAL_SPECIES } from "../lib/store"
import { SPECIES, speciesById, RARITY_POINTS } from "../data/species"
import { hotspotById } from "../data/hotspots"
import { BADGES } from "../data/badges"
import { PhotoImg } from "../components/PhotoImg"
import { levelFor, fmtDateShort, MONTH_NAMES } from "../lib/util"
import type { BadgeContext, BirdGroup } from "../types"
import { IconFeather } from "../components/icons"

type Tab = "life" | "stats" | "badges"
const GROUPS: BirdGroup[] = ["Bush & garden", "Wetland & lake", "Estuary & shore", "Coast & sea", "Open country"]

export default function MyBirds() {
  const { data, lifeList, points, streak } = useStore()
  const [tab, setTab] = useState<Tab>("life")
  const nav = useNavigate()
  const level = levelFor(points)

  const lifeRows = useMemo(() => {
    const rows = [...lifeList.entries()].map(([id, first]) => ({ sp: speciesById.get(id)!, first }))
    rows.sort((a, b) => a.first.dateISO.localeCompare(b.first.dateISO))
    return rows
  }, [lifeList])

  const badgeCtx: BadgeContext = useMemo(
    () => ({ sightings: data.sightings, outings: data.outings, lifeList, quiz: data.quiz, streak, points }),
    [data, lifeList, streak, points]
  )

  const monthly = useMemo(() => {
    const now = new Date()
    const buckets: { label: string; n: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const n = data.sightings.filter((s) => s.dateISO.startsWith(key)).length
      buckets.push({ label: MONTH_NAMES[d.getMonth()][0], n })
    }
    return buckets
  }, [data.sightings])

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.n))
  const hotspotsVisited = new Set(data.sightings.map((s) => s.hotspotId).filter(Boolean)).size
  const unlockedCount = Object.keys(data.unlockedBadges).length

  return (
    <div className="fade-in">
      <div className="topbar">
        <h1>My birds</h1>
        <span className="tiny">
          Level {level.idx + 1} · {level.name}
        </span>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="spread mb8">
          <b style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>
            {lifeList.size} of {TOTAL_SPECIES} species
          </b>
          <span className="tiny">{Math.round((lifeList.size / TOTAL_SPECIES) * 100)}%</span>
        </div>
        <div className="progress">
          <div style={{ width: `${(lifeList.size / TOTAL_SPECIES) * 100}%` }} />
        </div>
        <div className="spread mt8">
          <span className="tiny">
            {points} points · next level {level.next ? `${level.next} at ${level.nextAt}` : "maxed out"}
          </span>
          <span className="tiny">
            {unlockedCount}/{BADGES.length} badges
          </span>
        </div>
        <div className="progress gold mt8" style={{ height: 5 }}>
          <div style={{ width: `${level.progress * 100}%` }} />
        </div>
      </div>

      <div className="chips" style={{ marginTop: 4 }}>
        {(["life", "stats", "badges"] as Tab[]).map((t) => (
          <button key={t} className={`chip ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
            {t === "life" ? "Life list" : t === "stats" ? "Stats" : "Badges"}
          </button>
        ))}
      </div>

      {tab === "life" && (
        <div className="card" style={{ padding: "8px 14px" }}>
          {lifeRows.length === 0 && (
            <div className="empty">
              <IconFeather />
              <h3>Your life list is empty</h3>
              <p>The first bird you log becomes lifer number one. It could be a sparrow. It still counts.</p>
              <button className="btn" onClick={() => nav("/log")}>
                Log your first bird
              </button>
            </div>
          )}
          {[...lifeRows].reverse().map(({ sp, first }, i) => (
            <div key={sp.id} className="life-row" onClick={() => nav(`/guide/${sp.id}`)} style={{ cursor: "pointer" }}>
              <span className="num">{lifeRows.length - i}</span>
              <div className="ph">
                <PhotoImg species={sp} />
              </div>
              <div className="meta">
                <div className="n">{sp.name}</div>
                <div className="w">
                  {fmtDateShort(first.dateISO)}
                  {first.hotspotId ? ` · ${hotspotById.get(first.hotspotId)?.name}` : ""}
                </div>
              </div>
              <span className="pts">+{RARITY_POINTS[sp.rarity]}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "stats" && (
        <>
          <div className="stat-tiles">
            <div className="stat-tile">
              <b>{data.sightings.length}</b>
              <span>TOTAL SIGHTINGS</span>
            </div>
            <div className="stat-tile">
              <b>{hotspotsVisited}</b>
              <span>HOTSPOTS BIRDED</span>
            </div>
            <div className="stat-tile">
              <b>{data.outings.filter((o) => o.endISO).length}</b>
              <span>OUTINGS DONE</span>
            </div>
            <div className="stat-tile">
              <b>{streak}</b>
              <span>DAY STREAK</span>
            </div>
          </div>

          <div className="card">
            <h3>Sightings, last 12 months</h3>
            <div className="bars" role="img" aria-label="Monthly sighting counts">
              {monthly.map((m, i) => (
                <div className="bar" key={i}>
                  <div style={{ height: `${(m.n / maxMonthly) * 100}%`, opacity: m.n ? 1 : 0.25 }} title={`${m.n}`} />
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Coverage by habitat</h3>
            {GROUPS.map((g) => {
              const total = SPECIES.filter((s) => s.group === g).length
              const seen = [...lifeList.keys()].filter((id) => speciesById.get(id)?.group === g).length
              return (
                <div key={g} style={{ marginTop: 10 }}>
                  <div className="spread" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{g}</span>
                    <span className="tiny">
                      {seen}/{total}
                    </span>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <div style={{ width: `${(seen / total) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === "badges" && (
        <div className="badge-grid">
          {BADGES.map((b) => {
            const res = b.check(badgeCtx)
            const unlocked = !!data.unlockedBadges[b.id] || res.done
            return (
              <div key={b.id} className={`badge ${unlocked ? "" : "locked"}`}>
                <div className="disc">{b.icon}</div>
                <div className="n">{b.name}</div>
                <div className="d">{b.desc}</div>
                {!unlocked && (
                  <div className="p">
                    {res.progress}/{res.target}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
