import React, { useEffect } from "react"
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import { useStore } from "./lib/store"
import { IconHome, IconBook, IconMap, IconFeather, IconPlus } from "./components/icons"
import Home from "./pages/Home"
import Guide from "./pages/Guide"
import SpeciesDetail from "./pages/SpeciesDetail"
import Log from "./pages/Log"
import OutingPage from "./pages/Outing"
import MapPage from "./pages/MapPage"
import HotspotDetail from "./pages/HotspotDetail"
import MyBirds from "./pages/MyBirds"
import Quiz from "./pages/Quiz"
import Alerts from "./pages/Alerts"
import Settings from "./pages/Settings"
import About from "./pages/About"
import { fmtTime } from "./lib/util"

function ThemeEffect() {
  const { data } = useStore()
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const t = data.settings.theme
      const dark = t === "dark" || (t === "auto" && mq.matches)
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light")
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute("content", dark ? "#101613" : "#123B2D")
    }
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [data.settings.theme])
  return null
}

function OutingBar() {
  const { activeOuting, data } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  if (!activeOuting || loc.pathname === "/outing" || loc.pathname === "/log") return null
  const count = new Set(data.sightings.filter((s) => s.outingId === activeOuting.id).map((s) => s.speciesId)).size
  return (
    <div className="outing-bar" onClick={() => nav("/outing")} role="button">
      <div className="pulse" />
      <div className="info">
        <b>{activeOuting.name}</b>
        <span>
          Started {fmtTime(activeOuting.startISO)} · {count} species so far
        </span>
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>Open</span>
    </div>
  )
}

export default function App() {
  const { ready } = useStore()
  const loc = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  if (!ready) return null

  const onMap = loc.pathname.startsWith("/map")

  return (
    <>
      <ThemeEffect />
      <div className={onMap ? "" : "shell"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/guide/:id" element={<SpeciesDetail />} />
          <Route path="/log" element={<Log />} />
          <Route path="/outing" element={<OutingPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/hotspot/:id" element={<HotspotDetail />} />
          <Route path="/mybirds" element={<MyBirds />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>

      <OutingBar />

      <nav className="nav">
        <div className="nav-inner">
          <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")} end>
            <IconHome />
            Home
          </NavLink>
          <NavLink to="/guide" className={({ isActive }) => (isActive ? "active" : "")}>
            <IconBook />
            Guide
          </NavLink>
          <NavLink to="/log" className="fab-slot" aria-label="Log a bird">
            <span className="fab">
              <IconPlus />
            </span>
            <span className="fab-label">Log</span>
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => (isActive ? "active" : "")}>
            <IconMap />
            Map
          </NavLink>
          <NavLink to="/mybirds" className={({ isActive }) => (isActive ? "active" : "")}>
            <IconFeather />
            My Birds
          </NavLink>
        </div>
      </nav>
    </>
  )
}
