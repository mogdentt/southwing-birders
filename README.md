# Southwing

A field guide, life list and birding log for Aotearoa New Zealand. Log birds in the field, build a life list, follow a daily target, earn badges and browse live reports from eBird.

Live app: https://mogdentt.github.io/southwing-birders/

## What is inside

The guide contains **230 catalogue taxa: 87 original entries plus 143 national additions**, with identification tips, natural-history notes, ranges, seasonal guidance and Māori names where sourced. It represents native and endemic birds, established introductions, migrants and documented vagrants. It is a curated guide, **not an exhaustive official NZ checklist**; some entries represent subspecies rather than whole species.

There are **60 hotspots: 25 original Canterbury places plus 35 national additions**, covering all 16 main regions and the Chatham Islands. Rakiura / Stewart Island is included under Southland. Species ranges also cover the NZ subantarctic islands and Kermadecs; a range is not necessarily a recommended visitor spot or permission to enter.

- Quick logging with GPS, nearest-hotspot detection and seasonal suggestions
- Outings with species tallies and a summary; life-list points, levels, streaks and 25 badges
- Search by English, Māori or scientific name and range; filter by habitat, origin and life-list status, with in-season birds sorted first
- Daily targets and a photo-identification quiz
- Regional hotspot map and lists, with access advice and target birds
- eBird notable reports nationally or by region, plus nearby reports around a chosen location
- JSON backup/restore and eBird Record Format CSV export

All 230 entries have **pinned, freely licensed, taxon-specific photographs with checked metadata and provenance**, rather than a changing Wikipedia lead image. This is **not independent visual identification of every photograph**. Credits and licence links accompany images; see [docs/photo-sources.md](docs/photo-sources.md) for reviewed exceptions and limitations.

## Running it

Use **Node.js 22.12 or newer; Node.js 24 LTS is recommended**.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the production build
```

### Checks and photo maintenance

```bash
npm test               # offline Vitest regression suite
npm run build          # build the app before browser checks
npm run test:browser   # isolated browser regression checks against that build
npm run photos:check   # read-only live verification of pinned photo metadata/bytes
npm run photos:sync    # refresh the photo manifest; retains existing pins unless overridden
npm audit              # current dependency advisories
```

Browser checks need a production build and a Chromium browser: install Playwright's browser with `npx playwright install chromium`, or select an installed browser with `BROWSER_CHANNEL` or `BROWSER_EXECUTABLE`. On Windows the script can fall back to installed Edge. It starts its own loopback-only preview on an available port and closes the browser and server afterwards. It uses fresh, isolated profiles and synthetic backups, credentials and locations; external requests are mocked or blocked. It does not use personal browser data or prove real-network, all-photo visual or installed-PWA offline behaviour.

Photo checks and synchronization contact Wikimedia and download images. They are separate from offline unit tests; review manifest changes before publishing. The source policy and maintenance details are in [docs/photo-sources.md](docs/photo-sources.md).

GitHub Actions runs pull-request checks. Pushes to `main` build and publish to GitHub Pages through [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

The dependency audit on **23 October 2026** reported **0 vulnerabilities** after compatible Vite 6, Vitest 4, React Router 7 and Sharp upgrades. Advisory results can change; this is not a blanket security guarantee.

## Phone and offline use

Southwing is a PWA. Open the live URL and choose **Add to Home Screen** where supported. Once the app shell is cached, the guide and local log can work offline. Previously loaded photos and map tiles may be available from bounded browser caches; this does not preload every image or map area. Uncached or failed images show silhouettes. Live eBird reports need a connection.

## Your data and backwards compatibility

Sightings are stored locally in this browser using IndexedDB/localforage, with no cloud account or automatic upload to eBird. Photos, maps and other external resources make normal web requests; enabled eBird queries send the API key and requested region/location to eBird. The old Christchurch home coordinates remain a compatible default, but nearby alerts do not silently use that default without a location choice.

**The `AppData` v1 JSON field names, field shapes and storage key `southwing-data-v1` are unchanged.** Its six fields remain `v` (exported as `1`), `sightings`, `outings`, `settings`, `quiz` and `unlockedBadges`. Nested `Sighting`, `Outing`, `Settings` and `QuizStats` shapes are unchanged; see [src/types.ts](src/types.ts). Catalogue `range`, `nzbo` and hotspot `region` metadata do not change saved data.

- Original species and hotspot IDs remain stable. Unknown IDs and extra fields are preserved on JSON import/export, not dropped, renamed or deduplicated.
- Legacy v1 and partial unversioned backups are accepted with a valid `sightings` array. Missing sections and missing settings/quiz fields receive defaults; present malformed values do not. Unsupported explicit versions and malformed backups are rejected without replacing current data.
- Choosing a backup only validates it and shows a preview. Replacement requires an explicit acknowledgement and confirmation; cancelling leaves current data unchanged.
- The stable `cattle-egret` ID now has the corrected scientific name **Ardea coromanda**, not **Ardea ibis**. Sightings reference `speciesId`, not scientific-name metadata, so no stored-data migration is required. CSV exports use the corrected name too.

<warning>
Restoring replaces all local data rather than merging it and cannot be undone without a current backup. Download the current JSON backup first and verify that it was saved before confirming replacement. Keep regular copies outside this browser: clearing site data or losing the device can erase the local log.
</warning>

**JSON backups are unencrypted and include locations, notes, settings and any saved private eBird API key. Keep them private.** A storage warning means a download contains only data successfully loaded in the current tab, not unreadable saved records.

CSV is an export for eBird, **not a complete backup**. It omits unknown species IDs, uses known hotspot regions, and leaves the region blank for GPS-only or unknown locations rather than inventing Canterbury. Review taxonomy and location fields before uploading to eBird.

## Sources and limits

- [docs/species-sources.md](docs/species-sources.md): NZ Birds Online references, taxonomy, coverage and field meanings. The legacy `korora` entry intentionally remains white-flippered-only (*Eudyptula minor albosignata*); wider NZ little-penguin coverage is a documented gap.
- [docs/hotspot-sources.md](docs/hotspot-sources.md): site-specific evidence and access conditions. National species–place associations come from hotspot `targets`, combined with retained legacy species hotspot arrays; not every species has a recommended public location.
- [docs/photo-sources.md](docs/photo-sources.md): pinned Commons files, attribution, licences, taxon evidence and verification limits. NZ Birds Online photographs are not copied.

Rarity labels are unchanged **game scores, not national abundance or conservation assessments**. Older Canterbury-based scores can remain high for birds common elsewhere. Ranges, seasons and targets are broad guidance, not sighting guarantees or current conservation classifications. Respect private land, closures, biosecurity and nesting birds; follow site-manager advice and never seek nests, feed birds or use playback to obtain a sighting.

## Optional native app workflow

Hash routing and relative assets support a future Capacitor wrapper. This is an optional development route, not a published native app:

```bash
npm install @capacitor/core @capacitor/android @capacitor/ios
npm install --save-dev @capacitor/cli
npx cap init southwing nz.southwing.app --web-dir=dist
npm run build
npx cap add android
npx cap sync
npx cap open android
```

Android requires Android Studio; use `ios` instead of `android` on macOS with Xcode. Native permissions, storage, external requests and offline behaviour need platform-specific testing. A native wrapper has separate storage: transfer a private JSON backup rather than assuming browser data appears automatically.

## Stack

Vite 6, React 18, TypeScript, React Router 7 (hash routing), Leaflet/OpenStreetMap, localforage, canvas-confetti and vite-plugin-pwa/Workbox; Vitest 4 and Playwright for checks, Sharp for icon generation. No application backend, Southwing accounts or tracking.
