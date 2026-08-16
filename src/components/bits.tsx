import React, { createContext, useCallback, useContext, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { Species } from "../types"
import { RARITY_LABEL } from "../data/species"
import { PhotoImg } from "./PhotoImg"
import { IconCheck, IconBack } from "./icons"

export function RarityPill({ r }: { r: Species["rarity"] }) {
  return <span className={`pill ${r}`}>{RARITY_LABEL[r]}</span>
}

export function StatusPill({ s }: { s: Species["status"] }) {
  return <span className={`pill ${s === "Endemic" ? "endemic" : "status"}`}>{s}</span>
}

export function SpeciesRow({ sp, seen, sub, onClick }: { sp: Species; seen?: boolean; sub?: string; onClick?: () => void }) {
  const nav = useNavigate()
  return (
    <div className="sp-row" onClick={onClick ?? (() => nav(`/guide/${sp.id}`))}>
      <div className="ph">
        <PhotoImg species={sp} />
      </div>
      <div className="meta">
        <div className="n">
          {sp.name}
          {sp.maori && sp.maori !== sp.name ? <span className="tiny">{sp.maori}</span> : null}
        </div>
        <div className="m">{sub ?? sp.sci}</div>
      </div>
      {seen ? (
        <span className="tick">
          <IconCheck size={19} />
        </span>
      ) : (
        <RarityPill r={sp.rarity} />
      )}
    </div>
  )
}

export function TopBar({ title, back = true, children }: { title: string; back?: boolean; children?: React.ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="topbar">
      {back && (
        <button className="back" onClick={() => nav(-1)} aria-label="Back">
          <IconBack size={19} />
        </button>
      )}
      <h1>{title}</h1>
      {children}
    </div>
  )
}

/* ── Toasts ── */
interface Toast {
  id: number
  text: string
  gold?: boolean
}
const ToastCtx = createContext<(text: string, gold?: boolean) => void>(() => {})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string, gold?: boolean) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, gold }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.gold ? "gold" : ""}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
