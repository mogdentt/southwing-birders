# Licensed species photographs

## Snapshot and scope

The 2026-10-23 manifest covers **230 unchanged species IDs and 230 licensed photographs**, including the national catalogue. All 230 displayed image URLs were fetched successfully over HTTPS; response MIME type, image signature, byte count and SHA-256 are recorded. Each has Commons author/attribution, a supported free licence and licence URL, a Commons file-page link, taxon evidence, Wikipedia/Wikidata/Commons revision IDs and check dates. Adding the reviewed Eastern cattle egret preserved the other **229 pinned files, URLs, attribution, licences and image hashes**; refresh timestamps and provenance revisions may change.

**This is a metadata/provenance review, not an independent visual identification of all 230 birds.** The manifest explicitly records `visuallyReviewed: false`. The new cattle-egret thumbnail was inspected for live-bird composition (one bird on grass, no livestock), not independently identified by plumage. File descriptions and contributor identifications can be mistaken. Some photographs show captive birds, chicks, breeding plumage or non-NZ populations of the same species; they are not a complete field-identification reference. The tāiko photo depicts a downy chick and is excluded from the photo quiz. No NZ Birds Online photographs are copied: that site is used only for taxonomic/range evidence.

The cattle-egret scientific name was corrected from `Ardea ibis` to `Ardea coromanda` in the catalogue. Its stable `cattle-egret` ID is unchanged. Saved sightings reference that ID and do not store the scientific name, so this catalogue correction requires no backup-schema change or stored-data migration.

## Files

- [Pinned manifest](../src/data/photos.json): versioned, keyed by stable `species.id`; missing images have reasons, not guessed URLs.
- [Reviewed overrides](../src/data/photo-overrides.json): exact Commons titles, dated reasons and evidence links for every approved filename/taxon mismatch and special case.
- [Synchronizer](../scripts/sync-photos.mjs): Node 20+ and the project's existing TypeScript package; no API key or additional dependency.
- [Runtime accessors](../src/lib/photos.ts): synchronous manifest lookup plus legacy Promise wrappers; no Wikipedia/Commons metadata requests or old IndexedDB-photo reads.
- [Shared photo component](../src/components/PhotoImg.tsx): visible author/attribution and licence link to the Commons source, also used by guide and quiz.
- [Tests](../tests/photos.test.ts): catalogue/hash coverage, taxonomy exceptions, licences, URLs, attribution safety and rendering.

## Reproduce and maintain

From the project root, run `node scripts/sync-photos.mjs --audit` for metadata review without writes or image downloads. Run `npm run photos:sync` to generate/refresh the artifact. Run `npm run photos:check` (the synchronizer's `--check` mode) for a read-only verification of catalogue/override hashes, pinned file identity, attribution/licence, current taxon evidence, original-file SHA-1 and downloaded-thumbnail SHA-256. This does not silently adopt a new Wikipedia lead. Existing pins are retained unless an explicit override changes them; newly discovered candidates must satisfy the same evidence/licence checks before publishing, with explicit reviews for mismatches.

Generation writes the JSON only after all accepted image downloads succeed. A network error aborts without replacing the manifest; it is not evidence that a taxon has no photo. Transient 429/5xx responses receive bounded retries respecting `Retry-After`; a long cooldown aborts rather than retrying early. Wikimedia can change its thumbnail-rendering bytes without changing the original; investigate a check failure before regenerating. Dates/revisions necessarily change on refresh, so reproducibility means documented inputs, pinned file selection and repeatable checks, not an eternal byte-identical live API response.

Run `npm test` for the full Vitest suite, including photo coverage, provenance, licence safety and normal/quiz accessibility regressions. Live Commons/image verification is separate from these offline unit tests.

## Selection and licensing policy

1. Parse the two species source files with TypeScript's AST, extracting literal IDs, scientific names, names and Wikipedia titles without executing app code.
2. Query the [English Wikipedia Action API](https://en.wikipedia.org/w/api.php) with `prop=pageimages|pageprops|extracts|revisions`, **`piprop=name&pilicense=free`**, and redirects. This is candidate discovery, never sufficient species or copyright evidence.
3. Query the article's Wikidata item with `props=claims|info` for **P225 (taxon name)** and the entity revision ID. Require the exact catalogue name or the first sentence's exact scientific name. Where names, genera, taxonomic rank or scope differ, require an explicit file-specific review. Record whether the evidence is P225, first sentence, or reviewed equivalence. Only identification terms are retained, not article text.
4. Query [Commons imageinfo](https://commons.wikimedia.org/w/api.php) for `url|extmetadata|sha1|timestamp|mime` and description-page revision. Compare the file title/description with the exact taxon. Filename mismatches require a dated review, not fuzzy name guessing. Commons categories are additional evidence only when explicitly enabled in a reviewed override (Foveaux shag). Known illustration/specimen categories are rejected.
5. Accept **CC BY, CC BY-SA (supported versions/jurisdictions), CC0, or explicitly marked public domain** with matching licence URL and nonempty attribution. Reject NC/ND, GFDL-only, unknown/contradictory licences and restriction notices. Public-domain files link to the CC Public Domain Mark (a status marker, not a new licence grant). CC0 links to the dedication. Preserve the Commons attribution preference separately from the artist field.
6. Use only API-provided thumbnails on `thumb.wikimedia.org` or `upload.wikimedia.org` under `/wikipedia/commons/`. Small files request smaller real thumbnails rather than full-size originals. Strip tracking parameters. Download each accepted image and verify image bytes. Original-file SHA-1 and description revision permit later provenance checks.

The source file page links to the original work, full licence and detailed history. A thumbnail can be resized/cropped for layout; that change is stated in the overlay's accessible credit and the `changes` field. This app does not claim copyright over the photographs. Retain attribution and licence links if reusing these files outside the app.

## Important reviewed cases

| Stable ID | Decision and evidence |
| --- | --- |
| `korora` | **White-flippered penguin**, not a generic little penguin. The redirect's Bruny Island bird was rejected. The override is explicitly identified as white-flippered at Pohatu, Banks Peninsula, and categorised *Eudyptula minor albosignata*. |
| `otago-shag` | The broader Stewart Island shag article is not enough. The selected Commons file explicitly documents the **Taiaroa Head, Otago Peninsula** nesting colony. |
| `foveaux-shag` | Different file: **Stewart Island Shag.jpg**, categorised *Leucocarbo stewarti*. The [original photographer](https://www.flickr.com/photos/jimscarff/4425865819/) places it in Foveaux Straits off Stewart Island; [NZBO](https://www.nzbirdsonline.org.nz/species/foveaux-shag) confirms the range. The Taiaroa lead is not reused. |
| `pihoihoi` | Explicit NZ-pipit file **New Zealand Pipit Kapiti.JPG**, whose description identifies *Anthus novaeseelandiae novaeseelandiae* on Kāpiti. No Australian pipit substitution. |
| `cattle-egret` | **Eastern cattle egret, *Ardea coromanda***, following the catalogue correction; not Western cattle egret and not the goat-dominated Wikipedia lead. The [selected Commons file](https://commons.wikimedia.org/wiki/File:Eastern_Cattle-Egret_in_Bhagalpur_December_2025_by_Tisha_Mukherjee_01.jpg) explicitly names *Ardea coromanda* in Bhagalpur, Bihar, India, photographed on **21 December 2025** by **Tisha Mukherjee**, own work, **CC BY-SA 4.0**. The [Eastern cattle egret article](https://en.wikipedia.org/wiki/Eastern_cattle_egret) and its Wikidata P225 agree. [NZBO](https://www.nzbirdsonline.org.nz/species/cattle-egret) retains the older *Bubulcus ibis coromandus* treatment for the eastern form occurring in Australia and NZ. This is a species-level Indian photograph, not a claim of NZ locality. |
| `spur-winged-plover` | Reject the Darwin lead identified as *Vanellus miles miles*. Use the explicitly identified *V. m. novaehollandiae* file from Tasmania. |
| `coot`, `puteketeke` | Broader species articles reviewed against specific Tasmanian photographs and NZBO subspecies ranges; do not use European nominate images for these subspecies. |
| `fairy-tern` | The DOC photo is explicitly from Pakiri, near Warkworth, in the NZ breeding population; not an Australian fairy tern. |
| `siberian-sand-plover` | Reject the historical lesser sand-plover lead, whose pre-split identity can include Tibetan sand plover. Use a file explicitly identified as Siberian sand plover and categorised *Anarhynchus mongolus*. This is documented metadata evidence, not independent visual verification. |
| `great-spotted-kiwi`, `auckland-rail`, `little-shearwater`, `matuku` | Replace historical illustrations with identified live-bird photographs. |
| `common-diving-petrel`, `reischeks-parakeet`, `campbell-teal` | Replace authorless/specimen candidates with attributed live-bird photographs. |
| `kotare`, `royal-spoonbill`, `tauhou`, `white-faced-heron` | Replace GFDL-only leads with supported Creative Commons photographs. |
| `red-tailed-tropicbird` | Replace lead with conflicting “red-billed” description with an explicitly identified red-tailed file. |

All other filename, common-name and scientific-name variants are documented individually in the overrides, including old genus combinations, grammatical endings, camera filenames, non-English filenames and plural common names. No blanket assumption that an article thumbnail depicts its taxon is made.

## UI safety, offline behavior and integration API

Attribution is decoded to **plain text** by the dependency-free build-time decoder, stripped of markup/control characters, and rendered using ordinary escaped React text. Never use `dangerouslySetInnerHTML`. External image/file/licence URLs are HTTPS and exact-host/path allowlisted; metadata artist URLs are text, not clickable HTML. The small overlay links directly to the Commons file page with `noopener noreferrer`; long attribution is ellipsized but available in the accessible name and title. Its displayed/accessibility labels do not include the species name or filename (the source URL necessarily contains the filename). Normal guide/detail photographs use the species name as alt text. Passing `quiz={true}` changes it to **“Bird photograph to identify”**, without the answer. Clicking/pressing the credit stops parent-card propagation.

Each species/photo pair gets isolated React state, so old load/error events cannot replace a new species. A failed image falls back to a silhouette, retries on the next `online` event, and is not permanently cached as missing. The optional `onReady` callback reports whether the current photo has loaded successfully. The quiz excludes records without a verified photo and the `magenta-petrel` downy chick, disables answers until the image loads, and offers **Skip photo** while unavailable/loading without changing the score.

The PWA photo-cache rule covers **both `upload.wikimedia.org` and `thumb.wikimedia.org`**, with up to 400 entries retained for 90 days. Successful image offline availability still depends on prior loading and the browser/service-worker cache; uncached thumbnails show silhouettes offline. Metadata is bundled. This integration does not promise that all 230 photographs have been downloaded onto a user's device.

Exported integration API:

- `PhotoImg({ species, className?, quiz = false, onReady? })` — `quiz` selects generic answer-safe alt text; `onReady?: (ready: boolean) => void` reports load/error readiness.
- `getSpeciesPhoto(sp: Pick<Species, "id" | "sci">): LicensedPhoto | null` — synchronous, ID-keyed, fails closed on a changed scientific name.
- `getPhotoCredit(sp: Pick<Species, "id" | "sci">): LicensedPhoto | null` — same full record for detail-page credits. Show `artist` and preferred `attribution` as needed, link `fileUrl`, link `licenseUrl` using `license`, and state `changes`.
- `getPhoto(input: Species | string): Promise<string | null>` — backwards compatible with `getPhoto(sp.wiki)`; string lookup accepts only a unique original catalogue wiki title, never arbitrary or broader redirects.
- `getWikiInfo(input: Species | string): Promise<WikiInfo>` — `{ thumb, pageUrl, credit }`. `pageUrl` is an encyclopedia link, **not a photo attribution**.
- `pageUrlFor(wikiTitle: string): string`, `nzBirdsOnlineSearch(name: string): string` — preserved helpers.
- `PHOTO_MANIFEST`, `isSafePhotoUrl(value, kind)` and types `LicensedPhoto`, `UnavailablePhoto`, `PhotoRecord`, `PhotoSource`, `WikiInfo` are exported for tests/integration.

The detail page displays the artist/preferred attribution, a Commons file link, a separate licence link and the resizing/cropping statement. Its range text and NZ Birds Online source link use the catalogue's `range` and `nzbo` fields. The full `LicensedPhoto` contains `url`, `fileUrl`, `fileTitle`, `artist`, `attribution`, `credit`, `license`, `licenseUrl`, `changes`, `speciesId`, `scientificName`, `status` and `source` provenance.

## Validation performed

- All **20 photo tests** and the full **646-test suite** pass, including **98 backup tests**. Photo tests require all 230 entries to be verified and check normal species-name alt text, generic quiz labels, Eastern cattle-egret provenance and fallback for missing/mismatched records.
- Full-project TypeScript checking passes with `npx tsc --noEmit`.
- Manifest generation fetched all **230 images**. A baseline comparison confirmed the other **229 pinned files, URLs, attribution, licences and original/thumbnail hashes** were preserved.
- A subsequent read-only `--check` re-downloaded all **230 images** and detected no pinned-file, attribution, licence, taxon or image-byte drift. The manifest's own SHA-256 was unchanged by the check.
- A fresh-storage, mobile-viewport Headless Edge/Playwright smoke test passed for generic quiz alt text, answer disabling during loading/failure, skipping without score changes, enabling answers after load, error/reconnect retry, normal cattle-egret alt text and full Commons/licence attribution. Image responses in this UI test were synthetic; real image fetching was verified separately by the synchronizer.
- The selected cattle-egret thumbnail was visually inspected for composition. **All-species visual taxonomic identification and installed-PWA/service-worker offline caching were not independently verified by this audit.**