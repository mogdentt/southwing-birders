/** Build-time only. Never trust a Wikipedia thumbnail as taxonomic or licence evidence. */
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath, pathToFileURL } from "node:url"
import { createHash } from "node:crypto"
import { setTimeout as backoff } from "node:timers/promises"
import ts from "typescript"

const root = new URL("../", import.meta.url)
const manifestPath = new URL("src/data/photos.json", root)
const overridesPath = new URL("src/data/photo-overrides.json", root)
const API = {
  wikipedia: "https://en.wikipedia.org/w/api.php",
  commons: "https://commons.wikimedia.org/w/api.php",
  wikidata: "https://www.wikidata.org/w/api.php",
}
const headers = { "User-Agent": "SouthwingPhotoAudit/1.0 (educational NZ bird catalogue; build-time metadata verification)" }
const entities = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©",
  ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  hellip: "…", bull: "•", middot: "·", thinsp: " ", ensp: " ", emsp: " ",
}
const latin = "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ"
const latinNames = "Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml".split(" ")
latinNames.forEach((name, i) => { entities[name] = latin[i] })

/** Text only, not an HTML sanitizer: the UI must still render these strings as React text. */
export function plainText(value = "") {
  let text = String(value)
  for (let pass = 0; pass < 3; pass++) {
    text = text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (whole, entity) => {
        if (!entity.startsWith("#")) return entities[entity] ?? whole
        const hex = entity[1].toLowerCase() === "x"
        const n = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10)
        return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "�"
      })
  }
  return text.replace(/<[^>]*>/g, " ").replace(/[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim()
}

export function safeUrl(value, kind) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false
    if (kind === "image") return ["upload.wikimedia.org", "thumb.wikimedia.org"].includes(url.hostname) && url.pathname.startsWith("/wikipedia/commons/")
    if (kind === "file") return url.hostname === "commons.wikimedia.org" && url.pathname.startsWith("/wiki/File:")
    if (kind === "license") return url.hostname === "creativecommons.org" && /^\/(licenses\/(by|by-sa)\/(1\.0|2\.0|2\.5|3\.0|4\.0)(\/[a-z-]+)?|publicdomain\/(zero|mark)\/1\.0)\/?$/.test(url.pathname)
    return false
  } catch { return false }
}

function cleanUrl(value) {
  const url = new URL(value)
  url.search = ""
  url.hash = ""
  return url.href
}

function norm(text) {
  return plainText(text).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function contains(text, term) {
  return (` ${norm(text)} `).includes(` ${norm(term)} `)
}

export async function api(site, parameters) {
  const url = new URL(API[site])
  url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", ...parameters })
  const response = await request(url)
  if (!response.ok) throw new Error(`${site}: HTTP ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(`${site}: ${JSON.stringify(data.error)}`)
  return data
}

async function request(url, options = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000), ...options })
    if (![429, 502, 503, 504].includes(response.status) || attempt === 4) return response
    const retryAfter = response.headers.get("retry-after")
    const delay = Number(retryAfter) || Math.ceil((Date.parse(retryAfter ?? "") - Date.now()) / 1000) || 0
    const seconds = Math.max(2 ** (attempt + 1), delay)
    await response.body?.cancel()
    if (seconds > 90) throw new Error(`Wikimedia requests a ${seconds}s cooldown; stop and retry later: ${url}`)
    console.error(`Wikimedia HTTP ${response.status}; respecting Retry-After (${seconds}s).`)
    await backoff(seconds * 1000)
  }
}

function batches(values, size = 20) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, (i + 1) * size))
}

function resolvedPages(query, titles) {
  const changes = new Map([...(query.normalized ?? []), ...(query.redirects ?? [])].map(n => [n.from, n.to]))
  const pages = new Map((query.pages ?? []).map(p => [p.title, p]))
  return titles.map(title => {
    let target = title
    const seen = new Set()
    while (changes.has(target) && !seen.has(target)) { seen.add(target); target = changes.get(target) }
    return [title, pages.get(target)]
  })
}

/** Parse only literal catalogue fields; do not execute application code or rewrite IDs. */
export async function readSpecies() {
  const species = []
  for (const name of ["species.ts", "species-national.ts"]) {
    const text = await readFile(new URL(`src/data/${name}`, root), "utf8")
    const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true)
    function visit(node) {
      if (ts.isObjectLiteralExpression(node)) {
        const row = {}
        for (const prop of node.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.initializer)) row[prop.name.getText(source)] = prop.initializer.text
        }
        if (row.id && row.wiki) species.push({ id: row.id, name: row.name, sci: row.sci, wiki: row.wiki })
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  if (!species.length || new Set(species.map(s => s.id)).size !== species.length) throw new Error("Empty catalogue or duplicate species IDs")
  return species.sort((a, b) => a.id.localeCompare(b.id, "en"))
}

async function readOverrides() {
  try { return JSON.parse(await readFile(overridesPath, "utf8")) } catch (error) {
    if (error.code === "ENOENT") return {}
    throw error
  }
}

function digest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex") }

async function getArticles(species, overrides) {
  const articles = new Map()
  const titles = [...new Set(species.map(s => overrides[s.id]?.article ?? s.wiki))]
  for (const batch of batches(titles)) {
    const data = await api("wikipedia", {
      titles: batch.join("|"), redirects: "1", prop: "pageimages|pageprops|extracts|revisions",
      piprop: "name", pilicense: "free", exintro: "1", explaintext: "1", exsentences: "2", exlimit: "max", rvprop: "ids",
    })
    for (const [title, page] of resolvedPages(data.query, batch)) articles.set(title, page)
  }
  return articles
}

async function getTaxa(articles) {
  const taxa = new Map()
  const ids = [...new Set([...articles.values()].map(p => p?.pageprops?.wikibase_item).filter(Boolean))]
  for (const batch of batches(ids, 50)) {
    // Entity revision IDs require info as well as claims; claims alone omits lastrevid.
    const data = await api("wikidata", { action: "wbgetentities", ids: batch.join("|"), props: "claims|info" })
    for (const entity of Object.values(data.entities)) {
      taxa.set(entity.id, { revision: entity.lastrevid, names: (entity.claims?.P225 ?? []).filter(c => c.rank !== "deprecated").map(c => c.mainsnak?.datavalue?.value).filter(v => typeof v === "string") })
    }
  }
  return taxa
}

export async function getFiles(titles) {
  const files = new Map()
  for (const batch of batches([...new Set(titles)], 20)) {
    const data = await api("commons", {
      titles: batch.join("|"), redirects: "1", prop: "imageinfo|revisions", rvprop: "ids",
      iiprop: "url|extmetadata|sha1|timestamp|mime", iiurlwidth: "640", iiextmetadatalanguage: "en",
    })
    for (const [title, page] of resolvedPages(data.query, batch)) files.set(title, page)
  }
  // imageinfo uses an unscaled original for small images. Ask for a genuinely smaller
  // thumbnail instead of downloading originals (which have a separate, strict rate limit).
  for (const width of [320, 120]) {
    const small = [...files.entries()].filter(([, page]) => {
      const info = page?.imageinfo?.[0]
      return info?.thumburl && new URL(info.thumburl).hostname === "upload.wikimedia.org"
    }).map(([title]) => title)
    for (const batch of batches(small, 20)) {
      const data = await api("commons", { titles: batch.join("|"), redirects: "1", prop: "imageinfo", iiprop: "url", iiurlwidth: String(width) })
      for (const [title, page] of resolvedPages(data.query, batch)) {
        const info = page?.imageinfo?.[0]
        if (info?.thumburl) Object.assign(files.get(title).imageinfo[0], { thumburl: info.thumburl, thumbwidth: info.thumbwidth, thumbheight: info.thumbheight })
      }
    }
  }
  return files
}

/** Fail closed on unsupported/non-free licences, including NC, ND and GFDL-only files. */
export function getLicense(meta) {
  const name = plainText(meta.LicenseShortName?.value)
  let url = plainText(meta.LicenseUrl?.value).replace(/^http:/, "https:")
  if (url.startsWith("//")) url = `https:${url}`
  if (url.startsWith("https://creativecommons.org/")) url = url.replace(/\/(?:deed\.[a-z_-]+|legalcode)\/?$/i, "/")
  if (name === "Public domain" && meta.Copyrighted?.value === "False") url = "https://creativecommons.org/publicdomain/mark/1.0/"
  if (!safeUrl(url, "license")) return null
  if (!/^(CC BY(?:-SA)? (?:1\.0|2\.0|2\.5|3\.0|4\.0)(?: [a-z-]+)?|CC0|Public domain)$/i.test(name)) return null
  const cc = /^CC (BY(?:-SA)?) ([\d.]+)(?: ([a-z-]+))?$/i.exec(name)
  if (cc && new URL(url).pathname.replace(/\/$/, "") !== `/licenses/${cc[1].toLowerCase()}/${cc[2]}${cc[3] ? `/${cc[3].toLowerCase()}` : ""}`) return null
  if (name === "CC0" && !url.includes("/publicdomain/zero/1.0")) return null
  if (name === "Public domain" && !url.includes("/publicdomain/mark/1.0")) return null
  if (plainText(meta.Restrictions?.value)) return null
  return { license: name, licenseUrl: url }
}

export function assessTaxon(species, article, taxon, file, override) {
  const articleNames = taxon?.names ?? []
  const articleExact = articleNames.some(n => norm(n) === norm(species.sci))
  const firstSentenceExact = contains((article?.extract ?? "").split(/(?<=[.!?])\s/)[0], species.sci)
  const metadata = file?.imageinfo?.[0]?.extmetadata ?? {}
  const fields = { filename: file?.title ?? "", description: plainText(metadata.ImageDescription?.value) }
  if (override?.useCategories) fields.categories = plainText(metadata.Categories?.value)
  const acceptedTerms = [species.sci, ...(override?.fileTaxonTerms ?? [])]
  // Common names are accepted only when they equal the exact article title, not a generic label.
  if (articleExact && norm(article?.title) === norm(species.wiki)) acceptedTerms.push(article.title.replace(/ \(bird\)$/, ""))
  const matches = Object.entries(fields).flatMap(([field, text]) => acceptedTerms.filter(term => contains(text, term)).map(term => ({ field, term })))
  const filenameMatches = acceptedTerms.some(term => contains(fields.filename, term))
  const reviewed = Boolean(override?.review && override?.reviewedOn && override?.evidenceUrls?.length && override?.file)
  const issues = []
  if (override?.file && !reviewed) issues.push("File override lacks a dated evidence review")
  if (["korora", "otago-shag", "foveaux-shag", "pihoihoi", "cattle-egret", "siberian-sand-plover"].includes(species.id) && !reviewed) issues.push("Known ambiguous taxon requires a reviewed file override")
  if (!articleExact && !firstSentenceExact && !reviewed) issues.push("Article taxon does not match the catalogue scientific name")
  if (species.sci.split(" ").length > 2 && !articleExact && !reviewed) issues.push("Subspecies needs a reviewed, locality-specific file")
  if (!filenameMatches && !reviewed) issues.push("Filename/title mismatch needs explicit review")
  if (!matches.length) issues.push("No exact taxon evidence in Commons filename/description")
  if (/\billustrations?\b|\bskeletons?\b|\btaxidermy\b|\bstudy skins\b/i.test(plainText(metadata.Categories?.value))) issues.push("Illustration or specimen, not a live-bird photograph")
  if (override?.block) issues.push(override.block)
  return { issues, articleNames, matches, filenameMatches, reviewed, articleEvidence: articleExact ? "wikidata-P225" : firstSentenceExact ? "wikipedia-first-sentence" : reviewed ? "reviewed-taxonomic-equivalence" : "unresolved" }
}

async function verifyImage(url) {
  if (!safeUrl(url, "image")) throw new Error(`Unsafe image URL: ${url}`)
  // A real GET (not just HEAD), consuming bytes, catches deleted files and HTML error responses.
  const response = await request(url, { redirect: "error" })
  const contentType = response.headers.get("content-type")?.split(";")[0]
  if (!response.ok || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) throw new Error(`Image HTTP ${response.status} (${contentType}): ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const valid = contentType === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216
    : contentType === "image/png" ? bytes[0] === 137 && bytes[1] === 80
      : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  if (!valid || bytes.length < 100) throw new Error(`Invalid image bytes: ${url}`)
  return { status: response.status, contentType, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }
}

async function mapLimited(values, action, concurrency = 2) {
  let index = 0
  let failed = false
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (!failed && index < values.length) {
      const value = values[index++]
      try { await action(value) } catch (error) { failed = true; throw error }
    }
  }))
}

export async function syncPhotos({ audit = false, check = false } = {}) {
  const species = await readSpecies()
  const overrides = await readOverrides()
  for (const id of Object.keys(overrides)) if (!species.some(s => s.id === id)) throw new Error(`Unknown override ID: ${id}`)
  let old = null
  try { old = JSON.parse(await readFile(manifestPath, "utf8")) } catch (error) {
    if (error.code !== "ENOENT" || check) throw error
  }
  if (check && (old.catalogueHash !== digest(species) || old.overridesHash !== digest(overrides))) throw new Error("Catalogue or review overrides drifted; audit and regenerate the manifest")
  const articles = await getArticles(species, overrides)
  const taxa = await getTaxa(articles)
  const selected = new Map(species.map(s => {
    const page = articles.get(overrides[s.id]?.article ?? s.wiki)
    return [s.id, overrides[s.id]?.file ?? old?.photos[s.id]?.fileTitle ?? (page?.pageimage ? `File:${page.pageimage}` : null)]
  }))
  const files = await getFiles([...selected.values()].filter(Boolean))
  const checkedAt = new Date().toISOString()
  const photos = {}
  for (const sp of species) {
    const override = overrides[sp.id]
    const article = articles.get(override?.article ?? sp.wiki)
    const taxonId = article?.pageprops?.wikibase_item
    const taxon = taxa.get(taxonId)
    const file = files.get(selected.get(sp.id))
    const info = file?.imageinfo?.[0]
    const meta = info?.extmetadata ?? {}
    const assessment = assessTaxon(sp, article, taxon, file, override)
    const license = getLicense(meta)
    const artist = plainText(meta.Artist?.value)
    const issues = [...assessment.issues]
    if (!info) issues.push("No Commons imageinfo for the selected file")
    if (!license) issues.push("No supported, verified free licence")
    if (!artist) issues.push("Missing author attribution")
    if (info && !["image/jpeg", "image/png", "image/webp"].includes(info.mime)) issues.push("Not a supported photograph format")
    const url = info?.thumburl ? cleanUrl(info.thumburl) : null
    const fileUrl = info?.descriptionurl ? cleanUrl(info.descriptionurl) : null
    if (!safeUrl(url, "image") || !safeUrl(fileUrl, "file")) issues.push("Missing or unsafe image/file URL")
    const source = {
      provider: "Wikimedia Commons", requestedTitle: sp.wiki, articleTitle: article?.title ?? null,
      articleUrl: article ? `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}` : null,
      articleRevision: article?.revisions?.[0]?.revid ?? null,
      wikidataId: taxonId ?? null, wikidataRevision: taxon?.revision ?? null, articleTaxonNames: assessment.articleNames,
      articleEvidence: assessment.articleEvidence,
      discovery: override?.file ? "reviewed-override" : "enwiki-pageimages-free-name",
      taxonEvidence: assessment.matches,
      review: override ? { note: override.review ?? override.block, reviewedOn: override.reviewedOn, evidenceUrls: override.evidenceUrls ?? [] } : null,
      checkedAt, visuallyReviewed: false,
    }
    const base = { speciesId: sp.id, scientificName: sp.sci, source }
    if (issues.length) photos[sp.id] = { ...base, status: "unavailable", reason: [...new Set(issues)].join("; "), candidateFile: file?.title ?? null }
    else photos[sp.id] = {
      ...base, status: "verified", url, fileUrl, fileTitle: file.title, artist, ...license,
      attribution: plainText(meta.Attribution?.value) || artist,
      credit: plainText(meta.Credit?.value),
      changes: "Resized; may be cropped to fit the display.",
      source: { ...source, commonsPageId: file.pageid, commonsRevision: file.revisions?.[0]?.revid, fileSha1: info.sha1, fileTimestamp: info.timestamp, thumbnailWidth: info.thumbwidth, thumbnailHeight: info.thumbheight },
    }
    if (audit) console.log(JSON.stringify({ id: sp.id, sci: sp.sci, article: article?.title, taxa: assessment.articleNames, file: file?.title, license: license?.license, issues, evidence: assessment.matches, description: plainText(meta.ImageDescription?.value).slice(0, 230) }))
  }
  const verified = Object.values(photos).filter(p => p.status === "verified")
  if (!audit) await mapLimited(verified, async photo => {
    const network = await verifyImage(photo.url)
    photo.source.imageCheckedAt = checkedAt
    photo.source.network = network
    console.error(`Verified image: ${photo.speciesId}`)
  })
  if (check) {
    const drift = []
    for (const sp of species) {
      const before = old.photos[sp.id], after = photos[sp.id]
      for (const key of ["status", "fileTitle", "artist", "attribution", "credit", "license", "licenseUrl", "url", "fileUrl"]) {
        if (before?.[key] !== after?.[key]) drift.push(`${sp.id}: ${key} changed`)
      }
      if (before?.source.fileSha1 !== after.source.fileSha1) drift.push(`${sp.id}: file bytes changed on Commons`)
      if (before?.source.network?.sha256 !== after.source.network?.sha256) drift.push(`${sp.id}: rendered image bytes changed`)
    }
    if (drift.length) throw new Error(drift.join("\n"))
    console.log(`Checked ${species.length} entries, ${verified.length} licensed images; no pinned-file/licence/taxon drift. No files written.`)
  } else if (!audit) {
    await writeFile(manifestPath, `${JSON.stringify({ version: 1, generatedAt: checkedAt, catalogueHash: digest(species), overridesHash: digest(overrides), photos }, null, 2)}\n`, "utf8")
    console.log(`Wrote ${fileURLToPath(manifestPath)}: ${verified.length}/${species.length} verified licensed photographs.`)
  } else console.log(`Audit only: ${verified.length}/${species.length} candidates passed metadata checks; image bytes not checked; no files written.`)
  return photos
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const flags = process.argv.slice(2)
  if (flags.some(f => !["--audit", "--check"].includes(f)) || flags.length > 1) throw new Error("Usage: node scripts/sync-photos.mjs [--audit | --check]")
  syncPhotos({ audit: flags.includes("--audit"), check: flags.includes("--check") }).catch(error => { console.error(error); process.exitCode = 1 })
}