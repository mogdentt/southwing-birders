import React, { useEffect, useId, useRef, useState } from "react"
import type { AppData } from "../types"
import { parseBackup } from "../lib/backup"
import { downloadFile } from "../lib/csv"
import { useStore } from "../lib/store"
import { IconDownload, IconUpload } from "./icons"

interface Preview {
  filename: string
  raw: string
  data: AppData
}

export function BackupPanel() {
  const { ready, data, exportJSON, importData, storageError } = useStore()
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const restoreRef = useRef<HTMLButtonElement>(null)
  const previewRef = useRef<HTMLHeadingElement>(null)
  const readId = useRef(0)
  const [reading, setReading] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)

  useEffect(() => () => { readId.current++ }, [])
  useEffect(() => { previewRef.current?.focus() }, [preview])
  // If current data changes while reviewing, require a fresh acknowledgement.
  useEffect(() => { setConfirmed(false) }, [preview, data])

  function downloadBackup() {
    try {
      downloadFile(`southwing-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON(), "application/json")
      setNotice({ text: "Backup download requested. Check that the file is saved in your Downloads before replacing data or leaving this device.", error: false })
    } catch {
      setNotice({ text: "Could not download the backup. Your data has not been changed. Check browser download permissions and available space, then try again.", error: true })
    }
  }

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    // Reset immediately so the same file can be retried after reading or validation fails.
    event.currentTarget.value = ""
    if (!file) return
    const request = ++readId.current
    setReading(true)
    setPreview(null)
    setNotice(null)
    let raw: string
    try {
      raw = await file.text()
    } catch {
      if (request === readId.current) {
        setReading(false)
        setNotice({ text: "Could not read that file. No data has been changed. Check that the file is available on this device, then choose it again.", error: true })
      }
      return
    }
    if (request !== readId.current) return
    try {
      setPreview({ filename: file.name, raw, data: parseBackup(raw) })
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Could not validate that backup. No data has been changed.", error: true })
    } finally {
      setReading(false)
    }
  }

  function cancelRestore() {
    readId.current++
    setReading(false)
    setPreview(null)
    setConfirmed(false)
    setNotice({ text: "Restore cancelled. No data has been changed.", error: false })
    restoreRef.current?.focus()
  }

  function confirmRestore() {
    if (!preview || !confirmed || !ready) return
    const result = importData(preview.raw)
    setNotice({ text: result.message, error: !result.ok })
    if (result.ok) {
      setPreview(null)
      setConfirmed(false)
      restoreRef.current?.focus()
    }
  }

  return (
    <section className="card" aria-labelledby={`${id}-title`} style={{ border: "1px solid var(--line)" }}>
      <h2 id={`${id}-title`}>Keep your birding data safe</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Your sightings live in this browser, not in a cloud account. Clearing browser history with site data,
        deleting site data, or losing this device can erase them. Download a backup regularly and before switching devices.
      </p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={!ready} onClick={downloadBackup}>
          <IconDownload size={17} /> Download backup
        </button>
        <button
          ref={restoreRef}
          type="button"
          className="btn ghost"
          disabled={!ready || reading}
          aria-controls={`${id}-preview`}
          aria-expanded={!!preview}
          onClick={() => fileRef.current?.click()}
        >
          <IconUpload size={17} /> Restore backup
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" aria-label="Choose a Southwing JSON backup" hidden onChange={chooseFile} />
      </div>
      <p className="tiny" style={{ marginBottom: 0 }}>
        Backups are unencrypted and include your settings, locations and eBird API key if saved. Keep them private in a safe place outside this browser.
      </p>
      {storageError && (
        <p style={{ color: "var(--red)", fontSize: 13 }}>
          Browser storage needs attention (see the warning above). A download includes only data currently loaded in this tab, not any saved data that could not be read.
        </p>
      )}
      {reading && (
        <div className="row mt16" style={{ gap: 8 }}>
          <span role="status">Reading and validating backup…</span>
          <button type="button" className="btn ghost small" onClick={cancelRestore}>Cancel</button>
        </div>
      )}
      {notice && <p role={notice.error ? "alert" : "status"} style={{ fontSize: 13, color: notice.error ? "var(--red)" : undefined }}>{notice.text}</p>}
      {preview && (
        <section id={`${id}-preview`} aria-labelledby={`${id}-preview-title`} className="mt16" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <h3 id={`${id}-preview-title`} ref={previewRef} tabIndex={-1}>Review backup before restoring</h3>
          <p className="muted" style={{ overflowWrap: "anywhere" }}>Validation passed: {preview.filename}</p>
          <ul style={{ paddingLeft: 22 }}>
            <li>{preview.data.sightings.length} sightings ({new Set(preview.data.sightings.map((s) => s.speciesId)).size} species)</li>
            <li>{preview.data.outings.length} outings</li>
            <li>{preview.data.quiz.played} quiz answers and {Object.keys(preview.data.unlockedBadges).length} unlocked badges</li>
            <li>Settings, including any saved eBird API key</li>
          </ul>
          <p style={{ color: "var(--red)" }}>
            <strong>Warning: all existing local data will be REPLACED, not merged.</strong>{" "}
            This replaces your current {data.sightings.length} sightings, {data.outings.length} outings, settings,
            quiz progress and badges. Missing sections in older backups use empty/default values.
            This cannot be undone without a backup of your current data.
          </p>
          <button type="button" className="btn ghost small" onClick={downloadBackup}>
            <IconDownload size={15} /> Download current backup first
          </button>
          <label className="row mt16" style={{ gap: 10, alignItems: "flex-start", fontSize: 13 }}>
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I understand that restoring will replace all existing local data.</span>
          </label>
          <div className="row mt16" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn ghost" onClick={cancelRestore}>Cancel restore</button>
            <button type="button" className="btn danger" disabled={!ready || !confirmed} onClick={confirmRestore}>
              Replace local data and restore
            </button>
          </div>
        </section>
      )}
    </section>
  )
}