import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { SPECIES } from "../src/data/species"
import manifest from "../src/data/photos.json"
import overrides from "../src/data/photo-overrides.json"
import { PhotoImg } from "../src/components/PhotoImg"
import { getPhoto, getPhotoCredit, getSpeciesPhoto, getWikiInfo, isSafePhotoUrl, PHOTO_MANIFEST, pageUrlFor } from "../src/lib/photos"
import { assessTaxon, getLicense, plainText, readSpecies, safeUrl } from "../scripts/sync-photos.mjs"

const species = (id: string) => SPECIES.find(s => s.id === id)!
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe("pinned licensed photo manifest", () => {
  it("covers every stable catalogue ID exactly once, including national entries", async () => {
    expect(SPECIES).toHaveLength(230)
    expect(Object.keys(PHOTO_MANIFEST).sort()).toEqual(SPECIES.map(s => s.id).sort())
    expect(manifest.catalogueHash).toBe(digest(await readSpecies()))
    expect(manifest.overridesHash).toBe(digest(overrides))
    expect(new Date(manifest.generatedAt).toISOString()).toBe(manifest.generatedAt)
  })

  it("has licensed, attributed, network-checked images for all 230 species", () => {
    expect(Object.values(PHOTO_MANIFEST).filter(record => record.status === "verified")).toHaveLength(230)
    for (const sp of SPECIES) {
      const record = PHOTO_MANIFEST[sp.id]
      expect(record.speciesId).toBe(sp.id)
      expect(record.scientificName).toBe(sp.sci)
      expect(record.source.requestedTitle).toBe(sp.wiki)
      expect(record.source.checkedAt).toBe(manifest.generatedAt)
      expect(record.source.articleRevision).toBeGreaterThan(0)
      expect(record.source.wikidataRevision).toBeGreaterThan(0)
      expect(record.source.visuallyReviewed).toBe(false)
      if (record.status !== "verified") throw new Error(`${sp.id}: ${record.reason}`)
      expect(getSpeciesPhoto(sp)).toBe(record)
      for (const key of ["artist", "attribution", "credit", "license", "changes"] as const) {
        expect(record[key]).not.toMatch(/<[^>]*>|&#?\w+;/)
      }
      expect(record.artist.trim()).not.toBe("")
      expect(record.attribution.trim()).not.toBe("")
      expect(record.license).toMatch(/^(CC BY(?:-SA)? [1-4]\.\d(?: [a-z-]+)?|CC0|Public domain)$/i)
      expect(record.source.taxonEvidence.length).toBeGreaterThan(0)
      expect(record.source.fileSha1).toMatch(/^[a-f0-9]{40}$/)
      expect(record.source.commonsRevision).toBeGreaterThan(0)
      expect(record.source.network?.status).toBe(200)
      expect(record.source.network?.bytes).toBeGreaterThan(100)
      expect(record.source.network?.contentType).toMatch(/^image\/(jpeg|png|webp)$/)
      expect(record.source.network?.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(record.source.imageCheckedAt).toBe(manifest.generatedAt)
      for (const [kind, url] of [["image", record.url], ["file", record.fileUrl], ["license", record.licenseUrl]] as const) {
        expect(isSafePhotoUrl(url, kind), `${sp.id} ${kind}`).toBe(true)
        expect(safeUrl(url, kind)).toBe(true)
        expect(new URL(url).search).toBe("")
      }
    }
  })

  it("retains dated reviews for every override and special broader-taxon case", () => {
    const hosts = new Set(["en.wikipedia.org", "commons.wikimedia.org", "www.nzbirdsonline.org.nz", "www.flickr.com", "www.inaturalist.org", "blog.doc.govt.nz"])
    for (const [id, override] of Object.entries(overrides)) {
      expect(PHOTO_MANIFEST[id].source.review?.note).toBe(override.review)
      expect(override.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(override.evidenceUrls.length).toBeGreaterThan(0)
      for (const value of override.evidenceUrls) {
        const url = new URL(value)
        expect(url.protocol).toBe("https:")
        expect(hosts.has(url.hostname)).toBe(true)
        expect(url.username + url.password + url.port).toBe("")
      }
    }
    for (const id of ["korora", "otago-shag", "foveaux-shag", "pihoihoi", "coot", "puteketeke", "cattle-egret", "spur-winged-plover", "siberian-sand-plover"]) {
      expect(getSpeciesPhoto(species(id))?.source.discovery).toBe("reviewed-override")
    }
    expect(getSpeciesPhoto(species("korora"))?.fileTitle).toContain("White-flippered")
    expect(getSpeciesPhoto(species("otago-shag"))?.url).not.toBe(getSpeciesPhoto(species("foveaux-shag"))?.url)
    expect(getSpeciesPhoto(species("pihoihoi"))?.fileTitle).toContain("Kapiti")
    expect(getSpeciesPhoto(species("spur-winged-plover"))?.fileTitle).toContain("novaehollandiae")
  })

  it("pins the reviewed Eastern cattle egret, not a Western bird or the goat-dominated lead", () => {
    const sp = species("cattle-egret")
    const photo = getSpeciesPhoto(sp)!
    expect(sp.sci).toBe("Ardea coromanda")
    expect(photo.fileTitle).toBe("File:Eastern Cattle-Egret in Bhagalpur December 2025 by Tisha Mukherjee 01.jpg")
    expect(photo.fileTitle).toBe(overrides["cattle-egret"].file)
    expect(photo.fileTitle).not.toMatch(/goat|western|\bibis\b/i)
    expect(photo.artist).toBe("Tisha Mukherjee")
    expect(photo.license).toBe("CC BY-SA 4.0")
    expect(photo.licenseUrl).toBe("https://creativecommons.org/licenses/by-sa/4.0")
    expect(photo.source.articleTaxonNames).toContain("Ardea coromanda")
    expect(photo.source.articleEvidence).toBe("wikidata-P225")
    expect(photo.source.taxonEvidence).toContainEqual({ field: "description", term: "Ardea coromanda" })
    expect(photo.source.review?.evidenceUrls).toContain(photo.fileUrl)
    expect(getSpeciesPhoto({ ...sp, sci: "Ardea ibis" })).toBeNull()
  })

  it("preserves legacy async APIs without runtime network requests or old cache reads", async () => {
    const fetchSpy = vi.fn(() => { throw new Error("No network allowed") })
    vi.stubGlobal("fetch", fetchSpy)
    const sp = species("pihoihoi")
    expect(await getPhoto(sp.wiki)).toBe(getSpeciesPhoto(sp)?.url)
    expect(await getPhoto(sp)).toBe(await getPhoto(sp.wiki.replaceAll(" ", "_")))
    expect(await getWikiInfo(sp)).toEqual({ thumb: getSpeciesPhoto(sp)?.url, pageUrl: pageUrlFor(sp.wiki), credit: getPhotoCredit(sp) })
    expect(await getPhoto("Stewart Island shag")).toBeNull()
    expect(await getPhoto("unreviewed arbitrary article")).toBeNull()
    expect(await getPhoto("__proto__")).toBeNull()
    expect(getSpeciesPhoto({ ...sp, id: "missing" })).toBeNull()
    expect(getSpeciesPhoto({ ...sp, sci: "Different taxon" })).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("safe metadata processing and URLs", () => {
  it("decodes entities and strips markup without a browser or HTML injection", () => {
    expect(plainText('<a href="javascript:alert(1)">Jo&#235;l &amp; Ren&eacute;e</a>')).toBe("Joël & Renée")
    expect(plainText('&lt;img src=x onerror=alert(1)&gt;A&#x1F426;')).toBe("A🐦")
    expect(plainText('<script>alert(1)</script><style>body{}</style> Author&nbsp;Name')).toBe("Author Name")
    expect(plainText('&#x110000; &#xD800;')).toBe("� �")
  })

  it.each(["javascript:alert(1)", "data:image/png;base64,eA==", "http://upload.wikimedia.org/wikipedia/commons/a/a.jpg", "https://upload.wikimedia.org.evil.test/wikipedia/commons/a/a.jpg", "https://user:password@upload.wikimedia.org/wikipedia/commons/a/a.jpg", "https://upload.wikimedia.org:444/wikipedia/commons/a/a.jpg", "https://upload.wikimedia.org/wikipedia/en/a/a.jpg", "//upload.wikimedia.org/wikipedia/commons/a/a.jpg"])("rejects unsafe image URL %s", value => {
    expect(isSafePhotoUrl(value, "image")).toBe(false)
    expect(safeUrl(value, "image")).toBe(false)
  })

  it("rejects unsupported or contradictory licence metadata", () => {
    const meta = (name: string, url: string) => ({ LicenseShortName: { value: name }, LicenseUrl: { value: url } })
    expect(getLicense(meta("CC BY-NC 4.0", "https://creativecommons.org/licenses/by-nc/4.0/"))).toBeNull()
    expect(getLicense(meta("GFDL 1.2", "https://www.gnu.org/licenses/old-licenses/fdl-1.2.html"))).toBeNull()
    expect(getLicense(meta("CC BY 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"))).toBeNull()
    expect(getLicense(meta("CC0", "http://creativecommons.org/publicdomain/zero/1.0/deed.en"))).toEqual({ license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/" })
    expect(getLicense({ ...meta("CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"), Restrictions: { value: "non-commercial only" } })).toBeNull()
  })

  it("does not trust a broad article, unreviewed mismatch, or illustration", () => {
    const file = { title: "File:Generic bird.jpg", imageinfo: [{ extmetadata: { ImageDescription: { value: "A bird" } } }] }
    const assessment = assessTaxon(species("korora"), { title: "Little penguin", extract: "The little penguin (Eudyptula minor) is a penguin." }, { names: ["Eudyptula minor"] }, file)
    expect(assessment.issues).toContain("Known ambiguous taxon requires a reviewed file override")
    expect(assessment.issues).toContain("Subspecies needs a reviewed, locality-specific file")
    expect(assessment.issues).toContain("No exact taxon evidence in Commons filename/description")
    const illustration = { title: "File:Rhipidura fuliginosa.jpg", imageinfo: [{ extmetadata: { Categories: { value: "Bird illustrations" } } }] }
    expect(assessTaxon(species("piwakawaka"), {}, { names: ["Rhipidura fuliginosa"] }, illustration).issues).toContain("Illustration or specimen, not a live-bird photograph")
  })
})

describe("photo presentation", () => {
  const altText = (html: string) => plainText(html.match(/<img\b[^>]*\balt="([^"]*)"/)?.[1])

  it("uses accessible species names by default and safe visible photo credits", () => {
    for (const sp of SPECIES) {
      const html = renderToStaticMarkup(React.createElement(PhotoImg, { species: sp }))
      const photo = getSpeciesPhoto(sp)!
      expect(altText(html)).toBe(sp.name)
      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noopener noreferrer"')
      expect(html).toContain("Photo credit:")
      expect(html).toContain(photo.license)
      expect(html).not.toContain("Photo: Wikipedia")
      expect(renderToStaticMarkup(React.createElement(PhotoImg, { species: sp, quiz: false }))).toBe(html)
    }
  })

  it("uses generic quiz alt text without exposing a species name in accessible photo labels", () => {
    for (const sp of SPECIES) {
      const html = renderToStaticMarkup(React.createElement(PhotoImg, { species: sp, quiz: true, onReady: vi.fn() }))
      expect(altText(html)).toBe("Bird photograph to identify")
      // The source URL legitimately contains the filename; check labels, not raw markup.
      const labels = [...html.matchAll(/\b(?:alt|aria-label|title)="([^"]*)"/g)].map(match => plainText(match[1]))
      for (const label of labels) {
        expect(label).not.toContain(sp.name)
        expect(label).not.toContain(sp.sci)
        expect(label).not.toContain(getSpeciesPhoto(sp)!.fileTitle)
      }
    }
  })

  it("keeps an accessible silhouette for missing or mismatched photos in either mode", () => {
    for (const sp of [{ ...species("cattle-egret"), sci: "Ardea ibis" }, { ...species("pihoihoi"), id: "missing" }]) {
      for (const quiz of [false, true]) {
        const html = renderToStaticMarkup(React.createElement(PhotoImg, { species: sp, quiz }))
        expect(html).toContain('role="img" aria-label="Bird photograph unavailable"')
        expect(html).not.toContain("<img")
        expect(html).not.toContain("<a ")
      }
    }
  })

  it("contains no runtime metadata fetch, HTML injection or permanent failure cache", async () => {
    const ui = await readFile(new URL("../src/components/PhotoImg.tsx", import.meta.url), "utf8")
    const lib = await readFile(new URL("../src/lib/photos.ts", import.meta.url), "utf8")
    expect(ui + lib).not.toMatch(/dangerouslySetInnerHTML|innerHTML|localforage|urlCache|fetch\(/)
    expect(ui).toContain('window.addEventListener("online", retry)')
    expect(ui).toContain('window.removeEventListener("online", retry)')
  })
})