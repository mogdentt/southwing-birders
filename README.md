# Southwing

A field guide, life list and birding log for Ōtautahi Christchurch. Built to make a new birding habit stick: log fast in the field, watch your life list and streak grow, chase a daily target bird, earn badges, and pull live rare-bird alerts from eBird.

Live app: https://mogdentt.github.io/southwing-birders/

## What is inside

The guide covers 87 species realistically findable around greater Christchurch, from Hagley Park scaup to Kaitorete cirl buntings, each with te reo names, ID tips, seasonality, rarity, a field-worthy fact, and the hotspots to try. There are 25 curated hotspots with local craft (tides, seasons, where to stand), all on an interactive map.

Core loops, borrowed shamelessly from eBird and fitness apps:

- Two-tap logging with GPS, nearest-hotspot detection and smart "likely here now" suggestions
- Outings: start the clock at a hotspot, tally species as you go, get a summary card at the end (an eBird-style checklist)
- Life list with points weighted by rarity, levels from Egg to Pouākai, and a day streak
- 25 achievement badges (Shag Pile is real and earnable)
- A daily target bird chosen for the season, so there is always a reason to go out
- Photo ID quiz to sharpen your eye between trips
- Rare bird alerts and nearby sightings, live from the eBird API once you paste a free key into Settings
- Export your data as JSON backup or as eBird Record Format CSV, ready to upload to your real eBird account

Bird photos load from each species' Wikipedia article (freely licensed, credited, cached for offline). Your data never leaves the device unless you export it.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the production build
```

Deployment is automatic: every push to `main` builds and publishes to GitHub Pages via the workflow in `.github/workflows/deploy.yml`.

## Phone use today

Southwing is a PWA. Open the live URL on your phone, choose "Add to Home Screen", and it installs like an app, works offline, and caches photos and map tiles you have viewed. This is the recommended way to use it in the field right now.

## Turning it into a real mobile app later

The app was built to make the Capacitor path easy: hash routing, relative asset paths, no server. When the time comes:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init southwing nz.southwing.app --web-dir=dist
npm run build
npx cap add ios      # or android
npx cap sync
npx cap open ios     # opens Xcode / Android Studio
```

Everything (IndexedDB storage, geolocation, fetch to Wikipedia and eBird) works inside the Capacitor webview unchanged. Native niceties to add at that point: haptics on lifer, push notifications for rare bird alerts, and a home-screen widget for the streak.

## Stack

Vite, React 18, TypeScript, React Router (hash), Leaflet with OpenStreetMap tiles, localforage (IndexedDB), canvas-confetti, vite-plugin-pwa (Workbox). No backend, no accounts, no tracking.

## Data notes

Species notes, hotspot craft and coordinates were written for this app; coordinates are approximate entrances or viewing spots, not survey marks. Conservation statuses follow the NZ Threat Classification System and drift over time. Respect nesting areas, especially braided riverbeds and Kaitorete shingle in spring.
