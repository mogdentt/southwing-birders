import React from "react"
import { TopBar } from "../components/bits"
import { Logo } from "../components/icons"
import { TOTAL_SPECIES } from "../lib/store"
import { HOTSPOTS } from "../data/hotspots"

export default function About() {
  return (
    <div className="fade-in">
      <TopBar title="About" />

      <div className="card" style={{ textAlign: "center", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <Logo size={56} />
        </div>
        <h2 style={{ marginBottom: 2 }}>Southwing</h2>
        <p className="muted" style={{ marginTop: 2 }}>
          A field guide, life list and birding log for Aotearoa New Zealand. {TOTAL_SPECIES} bird entries and {HOTSPOTS.length} curated hotspots, from Northland to Rakiura and the Chathams.
        </p>
      </div>

      <div className="card">
        <h3>How it works</h3>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Your sightings live entirely on this device (in the browser's storage) and never leave it unless you export
          them. Install it to your phone's home screen and it works offline in the field; bird photos and map tiles you
          have already viewed are cached for the next trip. Browser storage is not a backup: use Download backup on the home page before clearing site data or switching devices. Keep backups private; they include your saved settings and any eBird API key.
        </p>
      </div>

      <div className="card">
        <h3>Sources and thanks</h3>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Photographs are pinned to species-specific Wikimedia Commons files with author and licence credits. Tap a credit for the original source; the detail page also links the licence. File descriptions and taxonomy were checked, but this is not independent visual identification of every image. Photos may show different ages or regional forms.
        </p>
        <p className="muted" style={{ fontSize: 13.5 }}>Original species notes draw on <a href="https://www.nzbirdsonline.org.nz/" target="_blank" rel="noreferrer">NZ Birds Online</a> and <a href="https://www.doc.govt.nz/nature/native-animals/birds/" target="_blank" rel="noreferrer">DOC</a>; individual references appear in the guide. Live reports come from eBird (Cornell Lab of Ornithology) when you add a key. Hotspot coordinates are approximate entrances or viewing areas, not nest locations.</p>
      </div>

      <div className="card">
        <h3>Coverage and identification</h3>
        <p className="muted" style={{ fontSize: 13.5 }}>The catalogue includes common birds, migrants, regional specialists and selected vagrants, including offshore and subantarctic birds. It is not an exhaustive official checklist. Some legacy entries are subspecies; taxonomy differs between authorities. Rarity labels award game points, not conservation status or nationally measured abundance. Check range and access advice rather than assuming every bird occurs nearby. Difficult identifications need more than one photograph.</p>
      </div>

      <div className="card">
        <h3>Field notes</h3>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Respect the birds: keep distance from nests and roosts, keep dogs out of wader zones, and stick to tracks in
          breeding season. Log honestly. The streak is with yourself.
        </p>
      </div>

      <p className="tiny" style={{ textAlign: "center" }}>
        Southwing v0.1 · made in the nest at q-lab
      </p>
    </div>
  )
}
