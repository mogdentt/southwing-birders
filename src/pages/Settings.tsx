import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "../lib/store"
import { TopBar, useToast } from "../components/bits"
import { BackupPanel } from "../components/BackupPanel"
import { toEbirdCSV, downloadFile } from "../lib/csv"
import { IconDownload, IconTrash } from "../components/icons"

export default function Settings() {
  const { data, updateSettings, loadDemo, resetAll } = useStore()
  const toast = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  const [home, setHome] = useState({ lat: String(data.settings.homeLat), lng: String(data.settings.homeLng) })
  const [homeMessage, setHomeMessage] = useState("")
  useEffect(() => {
    setHome({ lat: String(data.settings.homeLat), lng: String(data.settings.homeLng) })
  }, [data.settings.homeLat, data.settings.homeLng])

  function saveHome() {
    const lat = Number(home.lat), lng = Number(home.lng)
    if (!home.lat.trim() || !home.lng.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setHomeMessage("Enter a valid latitude (−90 to 90) and longitude (−180 to 180). Your saved home has not changed.")
      return
    }
    updateSettings({ homeLat: lat, homeLng: lng })
    setHomeMessage("Home location saved for nearby eBird reports.")
  }

  return (
    <div className="fade-in">
      <TopBar title="Settings" />

      <BackupPanel />

      <div className="card">
        <h3>You</h3>
        <label className="field">
          <span>Name (for the morning greeting)</span>
          <input
            className="input"
            placeholder="e.g. Matt"
            value={data.settings.name}
            onChange={(e) => updateSettings({ name: e.target.value })}
          />
        </label>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Theme</span>
          <select className="input" value={data.settings.theme} onChange={(e) => updateSettings({ theme: e.target.value as any })}>
            <option value="auto">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark (dawn raids)</option>
          </select>
        </label>
      </div>

      <div className="card">
        <h3>eBird live data</h3>
        <p className="muted mt0" style={{ fontSize: 13 }}>
          A free key from{" "}
          <a href="https://ebird.org/api/keygen" target="_blank" rel="noreferrer">
            ebird.org/api/keygen
          </a>{" "}
          unlocks rare bird alerts and nearby sightings.
        </p>
        <input
          className="input"
          type="password"
          aria-label="eBird API key"
          autoComplete="off"
          spellCheck={false}
          placeholder="eBird API key"
          value={data.settings.ebirdKey}
          onChange={(e) => updateSettings({ ebirdKey: e.target.value.trim() })}
        />
      </div>

      <div className="card">
        <h3>Home location for nearby reports</h3>
        <p className="muted" style={{ fontSize: 13 }}>Use decimal degrees. Older backups retain the Christchurch default; choose your intended location here or use device location on Alerts. This does not restrict the guide or map.</p>
        <label className="field">
          <span>Latitude</span>
          <input className="input" type="number" step="any" min={-90} max={90} value={home.lat} onChange={(e) => setHome({ ...home, lat: e.target.value })} />
        </label>
        <label className="field">
          <span>Longitude</span>
          <input className="input" type="number" step="any" min={-180} max={180} value={home.lng} onChange={(e) => setHome({ ...home, lng: e.target.value })} />
        </label>
        <button className="btn ghost small" onClick={saveHome}>Save home location</button>
        {homeMessage && <p className="tiny" role="status">{homeMessage}</p>}
      </div>

      <div className="card">
        <h3>Your data</h3>
        <p className="muted mt0" style={{ fontSize: 13 }}>
          Everything lives on this device. Export a backup before switching phones, or export CSV to import into your
          real eBird account. GPS-only records leave province blank rather than guessing. Review location and taxonomy before uploading; eBird may use different names.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn ghost small"
            onClick={() => {
              if (!data.sightings.length) return toast("Nothing to export yet")
              downloadFile(`southwing-ebird-${new Date().toISOString().slice(0, 10)}.csv`, toEbirdCSV(data.sightings), "text/csv")
              toast("eBird CSV downloaded. Upload it at ebird.org/import")
            }}
          >
            <IconDownload size={15} /> eBird CSV
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Playground</h3>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn ghost small"
            onClick={() => {
              loadDemo()
              toast("Demo sightings added. Poke around, then Reset when ready")
            }}
          >
            Load demo data
          </button>
          {!confirmReset ? (
            <button className="btn danger small" onClick={() => setConfirmReset(true)}>
              <IconTrash size={14} /> Reset everything
            </button>
          ) : (
            <button
              className="btn danger small"
              onClick={() => {
                resetAll()
                setConfirmReset(false)
                toast("Fresh start. The birds are still out there.")
              }}
            >
              Tap again to confirm reset
            </button>
          )}
        </div>
      </div>

      <p className="tiny" style={{ textAlign: "center" }}>
        <Link to="/about">About Southwing</Link>
      </p>
    </div>
  )
}
