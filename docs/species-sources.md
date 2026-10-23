# National species catalogue: sources and editorial decisions

Source and content audit: **23 October 2026**.

## Scope and compatibility

- **230 catalogue taxa: 87 original entries plus 143 additions.** The original entries remain in [src/data/species.ts](../src/data/species.ts); additions are appended from [src/data/species-national.ts](../src/data/species-national.ts).
- Every original ID, rarity value, resulting point value and species hotspot array is preserved, as is original ordering. No historical ID has been reassigned to a different bird. The sole original scientific-name correction is `cattle-egret`: **Ardea ibis → Ardea coromanda**, the eastern taxon occurring in NZ.
- **`AppData` v1 retains its exact field names, field shapes and storage key `southwing-data-v1`.** Sightings store `speciesId`, not scientific-name metadata, so the cattle-egret correction requires no migration and CSV exports now use **Ardea coromanda**. JSON import/export preserves unknown IDs and extra fields. Legacy v1 and partial unversioned backups with a valid `sightings` array are accepted; missing sections/settings/quiz fields receive defaults, while other explicit versions and malformed values are rejected. Restore requires explicit confirmation of replacement, not merging; download a current backup first. Backups include any saved private eBird API key. See [README.md](../README.md#your-data-and-backwards-compatibility).
- All 230 entries have a national `range`. Additions have descriptions, identification tips, natural-history facts and article titles. Optional `Species.range` and `Species.nzbo` are catalogue metadata, not changes to saved user-data shapes.
- Coverage includes North, South and Rakiura / Stewart Islands, the Chathams, NZ subantarctic islands and Kermadecs; resident native/endemic birds, established introductions, migrants and documented vagrants are represented. Island ranges do not imply public visitor hotspots. No extinct taxon has been added.
- This is a curated field guide, **not an exhaustive official checklist**. The count is of catalogue taxa, not a uniformly ranked list of species: some legacy entries and the NZ fairy tern are subspecies, while other entries include several subspecies.

## Sources and checking method

### Primary reference

[New Zealand Birds Online](https://www.nzbirdsonline.org.nz/) (NZBO; edited by C. M. Miskelly, with individually credited species-account authors) is the main reference for NZ occurrence, island distributions, identification, behaviour and establishment of introduced birds.

Every one of the **143 additions** carries its exact verified species-account URL in `nzbo`. These are the per-entry references, rather than a separate duplicated list that could drift from the data. All were fetched successfully and checked for the corresponding bird account. Distribution text was reviewed during selection; scientific labels and approximate length metadata were also compared in a batch audit. Differences in genus or taxonomic rank are explained below rather than treated automatically as different birds.

Three existing records also have directly checked NZBO references:

- [New Zealand pipit](https://www.nzbirdsonline.org.nz/species/new-zealand-pipit): the NZ taxon, not Australian pipit.
- [Cattle egret](https://www.nzbirdsonline.org.nz/species/cattle-egret): NZ occurrence and the eastern form; its older taxonomic treatment is reconciled below.
- [Little penguin](https://www.nzbirdsonline.org.nz/species/little-penguin): the broader account covering the legacy white-flippered population.

There are therefore **146 per-record NZBO links**, not 230. Original records without an `nzbo` field must not be presented as having a newly verified individual source link. URL slugs are not inferred from names: several accounts have historic slugs, including `lesser-sand-plover`, `stewart-island-shag`, `white-naped-petrel` and various `mollymawk` names.

### Supporting references

- [DOC native birds](https://www.doc.govt.nz/nature/native-animals/birds/), [kiwi](https://www.doc.govt.nz/nature/native-animals/birds/birds-a-z/kiwi/) and [penguins](https://www.doc.govt.nz/nature/native-animals/birds/birds-a-z/penguins/): general conservation, distributions and responsible viewing context.
- [List of birds of New Zealand](https://en.wikipedia.org/wiki/List_of_birds_of_New_Zealand): secondary cross-check of national coverage, not the sole basis for claiming a rare visitor or an established introduction.
- English Wikipedia species articles: article identity, alternative names and photo-candidate discovery. Runtime photos use a pinned Commons manifest, not live article-thumbnail lookup. Wikipedia and NZBO do not always follow the same taxonomy.

Catalogue prose is an original concise synthesis, not copied account text. NZBO photographs are not copied. Commons photo licensing, attribution and taxon evidence are documented separately in [photo-sources.md](photo-sources.md); a species-account link is not permission to reuse that account's photographs.

NZBO pages can retain dated observations and population estimates even when other parts have been updated. The catalogue deliberately avoids presenting these as current population counts, precise encounter probabilities or newly verified conservation classifications.

## Field meanings and limits

- `rarity` is a **game-scoring category**, not a conservation status or measured national abundance. The unchanged scores are common 1, uncommon 2, notable 5, rare 10 and mega 25. An old Canterbury-based score can remain high for a bird common elsewhere; preserving existing lifer points takes precedence over recalibration.
- `status` uses the existing four choices. `Endemic` can mean endemic breeding distribution, not that a migrating bird never leaves NZ; at subspecies rank it refers to that subspecies. `Migrant` also accommodates irregular non-breeding visitors because the schema has no separate vagrant status. NZBO's occurrence/conservation categories are not copied mechanically into these four values.
- Undated `threat` labels were removed from the original records. No new formal conservation assessment is claimed. Consult the source account and its cited assessment for conservation information.
- `sizeCm` is an approximate adult length, not a measurement applying to both sexes, every age or every plumage. Indian peafowl excludes the ornamental train; long-tailed skua and red-tailed tropicbird exclude elongated tail streamers, following NZBO's base-length convention. These values are not wingspans.
- `months`, when provided, indicate a broad typical NZ viewing season, not absolute presence or absence. Overwintering individuals and regional differences occur. White heron and wrybill no longer carry Canterbury-only seasonal filters because they remain in NZ year-round while moving between regions.
- **Omitted months are not proof of year-round residency.** Irregular vagrants have no defensible annual calendar. Season filters do not exclude entries without a month array; the detail page says “See range”, and range text supplies the necessary qualification.
- `range` is a broad distribution summary, not live sightings, detailed colony coordinates, land-access permission or a promise of an encounter. Mainland records of an island breeder do not imply mainland breeding.
- Optional Māori names are used conservatively from established source usage, without inventing translations. Not every bird has a Māori-name field, and one name need not be exclusive to one taxon.
- Difficult groups require more than a short guide entry: kiwi, prions, juvenile skuas, large albatrosses, small grey-and-white petrels and rare waders may need calls, location, multiple photographs and expert review. Record an uncertain identification as uncertain rather than forcing a species choice.

## Taxonomy and legacy exceptions

| Record or group | Treatment and limitation |
| --- | --- |
| `korora` | Intentionally preserves **Eudyptula minor albosignata**, the original white-flippered-only record, with a Banks Peninsula/Motunau range. It has not been silently expanded into all NZ little penguins. **Wider NZ little-penguin coverage remains a gap**; no overlapping general entry was added. NZBO and the redirected Wikipedia article cover a broader taxon, but the pinned photograph is specifically documented as white-flippered at Pohatu. |
| `cattle-egret` | Keeps the stable ID and original score, with scientific-name metadata corrected to **Ardea coromanda**, not **Ardea ibis**. NZBO retains the older **Bubulcus ibis** treatment, including eastern **coromandus**. The article and pinned photo represent Eastern cattle egret; the photo is from India, not a claim of NZ locality. Saved sightings remain linked by `speciesId`, and CSV exports now use the corrected name. No second eastern entry was added. |
| `pihoihoi` | Preserves **Anthus novaeseelandiae** and now targets New Zealand pipit rather than Australasian pipit. The range includes NZ island subspecies. Its status, and that of NZ fantail, is corrected to endemic without changing scores. |
| `otago-shag`, `foveaux-shag` | Separate **Leucocarbo chalconotus** and **L. stewarti**, following their separate NZBO accounts. Wikipedia combines them under Stewart Island shag; both scientific-title redirects lead there, but the manifest pins **different, taxon-specific files** with Otago and Foveaux provenance. No third Stewart Island shag entry is present. Split/lump treatment differs between references. |
| `great-spotted-kiwi` | Uses **Apteryx maxima**, as in the checked NZBO and Wikipedia accounts; older sources use **A. haastii**. There is one record, not both names as separate birds. |
| `long-tailed-cuckoo`, `spotted-dove`, `shore-plover` | **Urodynamis taitensis**, **Spilopelia chinensis** and **Thinornis novaeseelandiae** are used in the catalogue; the checked NZBO accounts use **Eudynamys taitensis**, **Streptopelia chinensis** and **Charadrius novaeseelandiae** respectively. These are alternative genus treatments of the same respective taxa, not extra lifers. |
| `pitt-shag` | Uses **Phalacrocorax featherstoni**, following the checked NZBO account. Shag genera vary between taxonomic authorities; its identity and Chatham Islands range matter more than matching every checklist's genus. |
| `white-capped-albatross` | Uses **Thalassarche steadi**; NZBO's white-capped account uses the broader **T. cauta** treatment. No separate shy albatross was added. The two are often not separable confidently at sea. |
| Other albatrosses | Antipodean albatross includes Gibson's; Buller's includes northern and southern forms. Wandering albatross is **Diomedea exulans**, not every member of the wandering-albatross complex; its Wikipedia article now uses Snowy albatross. |
| `eastern-rockhopper-penguin` | Uses **Eudyptes filholi** following NZBO; authorities that include it within southern rockhopper have a different rank. No overlapping southern-rockhopper entry was added. |
| `siberian-sand-plover` | Uses **Anarhynchus mongolus**, the Siberian taxon formerly included in lesser sand plover. The verified NZBO account retains the old URL slug. No separate unsplit lesser sand plover or inferred Tibetan sand plover was added. |
| `fairy-tern` | Represents **Sternula nereis davisae**, the endemic NZ subspecies; its NZBO source account is titled for the species more broadly. There is no second parent-species record. |
| Included regional forms | South Island robin includes the Stewart Island subspecies; NZ dotterel includes northern and southern forms; subantarctic snipe includes Auckland, Antipodes and Campbell forms; red-crowned parakeet includes the island forms covered by its source. Separate entries would need a deliberate taxonomic policy rather than automatic splitting. |
| Chatham parakeet | **Cyanoramphus forbesi** is separate from red-crowned parakeet; hybrid birds cannot safely be assigned from a single intermediate head marking. |

Extinct birds, including extinct rails and moa, are outside scope. South Island kōkako was not added because extant occurrence is unresolved. Whenua Hou/South Georgian diving-petrel treatments were not added pending a consistent split/lump decision. Red-legged partridge was excluded because the checked NZBO account does not support a viable wild NZ population; Barbary dove was left out rather than treating uncertain establishment or captive/domestic records as settled. These omissions are not assertions that the curated list covers every possible NZ bird.

## Wikipedia and pinned photographs

All **230 article targets** resolved to existing non-disambiguation Wikipedia articles with thumbnail metadata during the audit. Article resolution is only a reference/candidate check, not proof that a lead image depicts the intended taxon.

Article corrections include:

- Australasian crested grebe → **Great crested grebe**, matching the parent species of the retained **Podiceps cristatus australis**.
- Whimbrel → **Eurasian whimbrel**, matching **Numenius phaeopus** rather than a disambiguation page.
- Ruff → **Ruff (bird)**.
- Australasian pipit → **New Zealand pipit**.
- Western cattle egret → **Eastern cattle egret**, with the catalogue scientific name corrected to **Ardea coromanda**.

The app now uses **230 pinned, freely licensed photographs**, keyed by stable species ID in [src/data/photos.json](../src/data/photos.json). Checks cover image downloads and hashes, author/attribution, licence, source revisions and taxon evidence. Broader-article and subspecies cases have explicit file-specific reviews, including white-flippered penguin, the two shags, NZ pipit and Eastern cattle egret; they do not depend on accepting a generic article thumbnail. See [photo-sources.md](photo-sources.md) for evidence, overrides and reproducible checks.

**This is metadata/provenance verification, not independent visual identification of every bird.** Contributor identifications can be mistaken; some images show captive birds, chicks, breeding plumage or non-NZ populations of the same taxon. The tāiko (`magenta-petrel`) downy chick is excluded from the photo quiz. Photos are not a complete identification reference, and offline availability depends on prior loading and browser caches.

## Hotspot associations and access

The **60 hotspots** comprise 25 original Canterbury places and 35 national additions, covering all **16 main regions plus the Chatham Islands**. Rakiura / Stewart Island is grouped under Southland. Subantarctic and Kermadec species ranges do not imply visitor sites in this hotspot selection.

All **143 additions retain `hotspots: []`**; original species hotspot arrays are unchanged. National associations are stored in **`HOTSPOTS[].targets`**, not duplicated into new species reverse arrays. The species-detail place list is derived from hotspot targets together with legacy species hotspot links. An empty reverse array therefore does not mean that no associated place exists.

Site-specific evidence and visitor conditions are documented in [hotspot-sources.md](hotspot-sources.md). The latest additions supply 42 target associations, including 19 distinct expanded-catalogue taxa previously without national hotspot targets. This is a curated selection, not a requirement to assign a public location to every bird. Vagrants are not routine targets merely because a historic record exists, and sanctuary populations do not imply unrestricted or daytime viewing.

Pins are approximate public entrances, arrival areas or viewpoints, not nest coordinates. Check access, bookings, biosecurity, tides and closures separately. Do not approach nests, enter burrows, obstruct penguin landing routes, use playback, feed wildlife or treat these ranges as permission to enter restricted islands or private land.

## Catalogue statistics and regression checks

| Browsing group | Taxa |
| --- | ---: |
| Bush & garden | 43 |
| Wetland & lake | 34 |
| Estuary & shore | 50 |
| Coast & sea | 75 |
| Open country | 28 |
| **Total** | **230** |

Origin labels comprise **95 Endemic, 64 Native, 41 Migrant and 30 Introduced** entries. These are the app's broad categories, subject to the meanings above, not official taxonomic or ecological classifications.

`npm test` includes catalogue counts, unique IDs/names/scientific strings, required fields, category values, positive sizes, valid non-duplicated months, source-URL shape, lookup indexes and valid hotspot references. Frozen legacy fixtures check original species IDs/scores and hotspot IDs/coordinates. **The explicit scientific-name preservation exception is `cattle-egret` → Ardea coromanda**, not an exception permitting duplicate taxa. Backup and CSV regressions cover its unchanged ID and corrected export name. Taxonomic synonym and split/lump cases remain editorial decisions; string uniqueness alone cannot prove taxonomic independence.

Use `npm run build` for the production/type check, `npm run test:browser` for isolated browser regressions and `npm run photos:check` for live pinned-photo verification. These are distinct checks: unit tests and source audits do not certify final UI behaviour, live eBird integration, every photograph's visual identity or installed-PWA offline operation.