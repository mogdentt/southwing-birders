import React, { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "../lib/store"
import { TopBar, useToast } from "../components/bits"
import { toEbirdCSV, downloadFile } from "../lib/csv"
import { IconDownload, IconUpload, IconTrash } from "../components/icons"

export default function Settings() {
  const { data, updateSettings, exportJSON, importData, loadDemo, resetAll } = useStore()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then((raw) => {
      const res = importData(raw)
      toast(res.message, res.ok)
    })
    e.target.value = ""
  }

  return (
    <div className="fade-in">
      <TopBar title="Settings" />

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
          placeholder="eBird API key"
          value={data.settings.ebirdKey}
          onChange={(e) => updateSettings({ ebirdKey: e.target.value.trim() })}
        />
      </div>

      <div className="card">
        <h3>Your data</h3>
        <p className="muted mt0" style={{ fontSize: 13 }}>
          Everything lives on this device. Export a backup before switching phones, or export CSV to import into your
          real eBird account.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn ghost small"
            onClick={() => {
              downloadFile(`southwing-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON(), "application/json")
              toast("Backup downloaded")
            }}
          >
            <IconDownload size={15} /> Backup (JSON)
          </button>
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
          <button className="btn ghost small" onClick={() => fileRef.current?.click()}>
            <IconUpload size={15} /> Restore backup
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImportFile} />
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
