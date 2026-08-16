import React from "react"
import { TopBar } from "../components/bits"
import { Logo } from "../components/icons"
import { TOTAL_SPECIES } from "../lib/store"

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
          A field guide, life list and birding log for Ōtautahi Christchurch. {TOTAL_SPECIES} species, 25 hotspots,
          zero excuses to stay inside.
        </p>
      </div>

      <div className="card">
        <h3>How it works</h3>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Your sightings live entirely on this device (in the browser's storage) and never leave it unless you export
          them. Install it to your phone's home screen and it works offline in the field; bird photos and map tiles you
          have already viewed are cached for the next trip.
        </p>
      </div>

      <div className="card">
        <h3>Sources and thanks</h3>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Bird photographs load from each species' Wikipedia article and remain the work of their photographers
          (tap "photo: Wikipedia" on any species for the article and credits). Live rare-bird data comes from eBird,
          run by the Cornell Lab of Ornithology, when you add a key. Species notes and hotspot craft were written for
          this app; conservation statuses follow the NZ Threat Classification System and change over time, so treat
          them as a guide. Hotspot coordinates are approximate parking or entrance spots.
        </p>
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
