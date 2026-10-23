// Run after building: node scripts/check-browser.mjs
// Requires the existing playwright dependency and an installed Chromium browser.
// BROWSER_EXECUTABLE (or SHOT_CHROME) / BROWSER_CHANNEL can select a local browser.
// No external server, persistent profile, real API key or user backup is accepted.
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { access } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const root = fileURLToPath(new URL("../", import.meta.url))
const require = createRequire(import.meta.url)
// Valid, transparent 1x1 RGBA PNG, generated with sharp; all image responses use
// this fixture. Never download hundreds of catalogue photos or real map tiles.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==", "base64")
const emptyBackup = {
  v: 1, sightings: [], outings: [],
  settings: { name: "", theme: "auto", ebirdKey: "", homeLat: -43.5321, homeLng: 172.6362 },
  quiz: { played: 0, correct: 0, bestStreak: 0 }, unlockedBadges: {},
}
// Original v1 shape, original catalogue IDs, and deliberately synthetic values.
// The unknown ID/extension fields also exercise forward-compatible preservation.
const originalBackup = {
  v: 1,
  sightings: [
    { id: "synthetic-fantail", speciesId: "piwakawaka", count: 2, dateISO: "2024-02-29T07:15:00", hotspotId: "travis", outingId: "synthetic-outing", notes: 'Kākā, tūī & "quotes"\nKeep this note exactly.' },
    { id: "synthetic-egret", speciesId: "cattle-egret", count: 3, dateISO: "2024-06-01T08:30:00+12:00", hotspotId: "waihora", lat: -43.756, lng: 172.489 },
    { id: "synthetic-future", speciesId: "future-species", count: 0, dateISO: "2024-07-01T09:00", hotspotId: "future-hotspot", futureField: { retained: true } },
  ],
  outings: [{ id: "synthetic-outing", name: "Synthetic legacy outing", hotspotId: "travis", startISO: "2024-02-29T07:00", endISO: "2024-02-29T08:00" }],
  settings: { name: "Synthetic Test Birder", theme: "light", ebirdKey: "synthetic-browser-key", homeLat: -43.5321, homeLng: 172.6362 },
  quiz: { played: 3, correct: 2, bestStreak: 2 },
  unlockedBadges: { "synthetic-badge": "2024-02-29T08:00" },
  futureSection: { retained: ["do not drop this"] },
}
const browserOptions = {
  viewport: { width: 390, height: 844 }, locale: "en-NZ", timezoneId: "Pacific/Auckland",
  colorScheme: "light", reducedMotion: "reduce", serviceWorkers: "block", acceptDownloads: true,
}

let server, browser, context, origin, cleanupPromise
let completed = 0, attempted = 0
const independentFailures = []
const runtimeErrors = [], localErrors = [], ebirdRequests = []
let serverOutput = ""

async function startPreview() {
  await access(join(root, "dist", "index.html")).catch(() => {
    throw new Error("A built application is required. Build the app before running this browser check.")
  })
  const vite = join(dirname(require.resolve("vite/package.json")), "bin", "vite.js")
  // Port zero asks the OS for an unused port atomically. Only bind loopback, and
  // obtain the URL from OUR child's ready message, never attach to an old server.
  server = spawn(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", "0", "--strictPort"], {
    cwd: root, shell: false, windowsHide: true,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"],
  })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error(`Preview did not become ready.\n${serverOutput}`)), 20_000)
    let settled = false
    const finish = (error, url) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve(url)
    }
    const capture = (chunk) => {
      serverOutput = (serverOutput + chunk.toString().replace(/\x1b\[[0-9;]*m/g, "")).slice(-16_000)
      const match = serverOutput.match(/http:\/\/127\.0\.0\.1:(\d+)\//)
      if (match) finish(null, `http://127.0.0.1:${match[1]}`)
    }
    server.stdout.on("data", capture)
    server.stderr.on("data", capture)
    server.on("error", (error) => finish(error))
    server.on("exit", (code, signal) => finish(new Error(`Preview exited (${code ?? signal}).\n${serverOutput}`)))
  })
}

async function launchBrowser() {
  const executablePath = process.env.BROWSER_EXECUTABLE || process.env.SHOT_CHROME
  const channel = process.env.BROWSER_CHANNEL
  if (executablePath || channel) return chromium.launch({ executablePath, channel, headless: true })
  try { return await chromium.launch({ headless: true }) }
  catch (error) {
    // Windows contributors often have Edge but no downloaded Playwright binary.
    // Use its installed executable, still with an ephemeral Playwright profile.
    if (process.platform === "win32" && /Executable doesn't exist/.test(String(error))) {
      return chromium.launch({ channel: "msedge", headless: true })
    }
    throw error
  }
}

function cleanup() {
  return cleanupPromise ??= (async () => {
    try { await context?.close() }
    finally {
      try { await browser?.close() }
      finally {
        if (server && server.exitCode === null && server.signalCode === null) {
          const exited = once(server, "exit")
          const force = setTimeout(() => server.kill("SIGKILL"), 5_000)
          force.unref()
          server.kill("SIGTERM")
          try { await exited } finally { clearTimeout(force) }
        }
      }
    }
  })()
}

const interrupt = () => { void cleanup().finally(() => process.exit(130)) }
const terminate = () => { void cleanup().finally(() => process.exit(143)) }
process.once("SIGINT", interrupt)
process.once("SIGTERM", terminate)
const watchdog = setTimeout(() => {
  console.error("FAIL: browser regression exceeded three minutes")
  void cleanup().finally(() => process.exit(1))
}, 180_000)
watchdog.unref()

async function step(name, run, { continueOnFailure = false } = {}) {
  attempted++
  try {
    await run()
    completed++
    console.log(`ok ${attempted} - ${name}`)
  } catch (error) {
    // Shared-context data-integrity/setup failures stop immediately. Independent
    // checks (including fresh-context failure scenarios) can report separately.
    if (!continueOnFailure) throw error
    independentFailures.push(name)
    console.error(`not ok ${attempted} - ${name}:`, error)
  }
}

async function go(page, path) {
  await page.goto(`${origin}/#${path}`, { waitUntil: "domcontentloaded" })
  await page.getByRole("navigation").waitFor()
  // Hash navigation can complete before React replaces the old page. The nav
  // persists across routes, so wait for route-specific content as well.
  const heading = {
    "/": "Today's target", "/guide": "Field guide", "/guide/kea": "Range in Aotearoa",
    "/map": "Birding Aotearoa", "/hotspot/waitangi-chatham": "Waitangi Foreshore, Chatham Island",
    "/settings": "Settings", "/alerts": "Rare bird alerts", "/quiz": "Who is this?",
  }[path]
  assert.ok(heading, `a route-ready assertion is defined for ${path}`)
  await page.getByRole("heading", { name: heading, exact: true }).first().waitFor()
}

async function downloadBackup(page, buttonName = "Download backup") {
  const pending = page.waitForEvent("download")
  await page.getByRole("button", { name: buttonName, exact: true }).click()
  const download = await pending
  assert.match(download.suggestedFilename(), /^southwing-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const stream = await download.createReadStream()
  assert.ok(stream, "backup download provides a readable stream")
  const chunks = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  assert.equal(await download.failure(), null, "backup download succeeds")
  // Kept entirely in memory; no files are written to the user's Downloads.
  return Buffer.concat(chunks).toString("utf8")
}

async function chooseBackup(page, raw, name = "synthetic-original-v1.json") {
  const pending = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: "Restore backup", exact: true }).click()
  await (await pending).setFiles({ name, mimeType: "application/json", buffer: Buffer.from(raw) })
}

const preview = (page) => page.getByRole("heading", { name: "Review backup before restoring", exact: true })
const acknowledgement = (page) => page.getByRole("checkbox", { name: /restoring will replace all existing local data/i })
const replaceButton = (page) => page.getByRole("button", { name: "Replace local data and restore", exact: true })

async function confirmBackup(page, raw) {
  await chooseBackup(page, raw)
  await preview(page).waitFor()
  assert.equal(await replaceButton(page).isDisabled(), true, "restore requires acknowledgement every time")
  await acknowledgement(page).check()
  await replaceButton(page).click()
  await page.getByRole("status").filter({ hasText: /^Restored \d+ sightings/ }).waitFor()
  await preview(page).waitFor({ state: "detached" })
}

async function waitForSaved(page, expected) {
  // Read only: exercise the original IndexedDB key and await actual persistence,
  // rather than sleeping for an assumed debounce interval before a reload.
  await page.waitForFunction((expectedJSON) => new Promise((resolve) => {
    const request = indexedDB.open("localforage")
    request.onupgradeneeded = () => { request.transaction.abort(); resolve(false) }
    request.onerror = () => resolve(false)
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("keyvaluepairs")) { db.close(); resolve(false); return }
      const transaction = db.transaction("keyvaluepairs", "readonly")
      const read = transaction.objectStore("keyvaluepairs").get("southwing-data-v1")
      let matches = false
      const ordered = (value) => Array.isArray(value) ? value.map(ordered) : value && typeof value === "object"
        ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, ordered(value[key])])) : value
      read.onsuccess = () => { matches = JSON.stringify(ordered(read.result)) === JSON.stringify(ordered(JSON.parse(expectedJSON))) }
      transaction.oncomplete = () => { db.close(); resolve(matches) }
      transaction.onerror = () => { db.close(); resolve(false) }
      transaction.onabort = () => { db.close(); resolve(false) }
    }
  }), JSON.stringify(expected))
}

async function noOverflow(page, label) {
  // A transient transform can change sticky/fixed containing blocks and produce
  // spurious overflow. Await finite UI animations and layout, NOT image loads or
  // infinite loading shimmers. Do not hide overflow or alter application CSS.
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations()
      .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
      .map((animation) => animation.finished.catch(() => {})))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
  }))
  assert.ok(dimensions.document <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1,
    `${label}: no horizontal page overflow (${JSON.stringify(dimensions)})`)
}

async function keyboardOpenHotspot(page, name, id) {
  const link = page.getByRole("link", { name: new RegExp(name) })
  await link.waitFor()
  assert.equal(await link.getAttribute("href"), `#/hotspot/${id}`)
  // Starting at the region control, reach the real link by Tab, not a JS click.
  await page.getByRole("combobox", { name: "Hotspot region" }).focus()
  let reached = false
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab")
    if (await link.evaluate((element) => element === document.activeElement)) { reached = true; break }
  }
  assert.ok(reached, `${name} can be reached using Tab`)
  await page.keyboard.press("Enter")
  await page.waitForURL(`**/#/hotspot/${id}`)
  await page.getByRole("heading", { name: new RegExp(name) }).waitFor()
}

async function installFixtures(testContext) {
  await testContext.addInitScript(() => {
    // No device location permission or real location is used by this test.
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition(_success, failure) { queueMicrotask(() => failure?.({ code: 1, message: "Synthetic permission denial" })) },
      watchPosition() { return 0 }, clearWatch() {},
    } })
  })
  await testContext.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin === origin) return route.continue()
    if (url.hostname === "api.ebird.org") {
      ebirdRequests.push({ url: url.href, token: request.headers()["x-ebirdapitoken"] })
      const observation = {
        speciesCode: "tui1", comName: "Synthetic public tūī", sciName: "Prosthemadera novaeseelandiae",
        locName: "Synthetic public viewing area", obsDt: "2026-10-22 08:05", howMany: 2,
        lat: -36.9451, lng: 174.7614, obsReviewed: false, locationPrivate: false,
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
        observation, { ...observation, comName: "Synthetic private bird", locName: "Secret private location", locationPrivate: true },
      ]) })
    }
    if (request.resourceType() === "image") return route.fulfill({ status: 200, contentType: "image/png", body: png })
    if (request.resourceType() === "stylesheet") return route.fulfill({ status: 200, contentType: "text/css", body: "" })
    if (url.hostname.endsWith("wikipedia.org") && url.pathname === "/w/api.php") {
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"query":{"pages":{}}}' })
    }
    // Fonts, telemetry and any other third-party request never reach the network.
    return route.abort("blockedbyclient")
  })
}

async function newTestPage(testContext, errors = runtimeErrors, assets = localErrors, installClock = false) {
  const page = await testContext.newPage()
  page.setDefaultTimeout(12_000)
  page.setDefaultNavigationTimeout(20_000)
  const time = new Date("2026-10-23T12:00:00+13:00")
  if (installClock) await page.clock.install({ time })
  else await page.clock.setFixedTime(time)
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("response", (response) => {
    if (new URL(response.url()).origin === origin && response.status() >= 400 &&
        ["document", "script", "stylesheet"].includes(response.request().resourceType())) {
      assets.push(`${response.status()} ${response.url()}`)
    }
  })
  return page
}

// Installed before app code, only in dedicated synthetic contexts. Fail a put,
// not indexedDB.open: localforage must exercise its save rejection rather than
// silently switching to its localStorage driver. Successful reads remain real.
function instrumentSyntheticStorage() {
  const state = window.__syntheticStorage = { failWrites: false, rejected: 0, writes: [] }
  const put = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (value, key) {
    if (this.transaction.db.name === "localforage" && this.name === "keyvaluepairs" && key === "southwing-data-v1") {
      state.writes.push(structuredClone(value))
      if (state.failWrites) {
        state.rejected++
        throw new DOMException("Synthetic browser-test quota failure", "QuotaExceededError")
      }
    }
    return put.apply(this, arguments)
  }
}

async function isolatedStep(name, run, { storageFaults = false, installClock = false } = {}) {
  await step(name, async () => {
    const isolated = await browser.newContext(browserOptions)
    try {
      await installFixtures(isolated)
      if (storageFaults) await isolated.addInitScript(instrumentSyntheticStorage)
      const errors = [], assets = []
      const page = await newTestPage(isolated, errors, assets, installClock)
      // Reloads deliberately abandon only this fresh context's synthetic unsaved
      // edits. An expected beforeunload warning must not cancel those reloads.
      page.on("dialog", async (dialog) => {
        if (dialog.type() === "beforeunload") await dialog.accept()
        else { errors.push(`Unexpected ${dialog.type()} dialog: ${dialog.message()}`); await dialog.dismiss() }
      })
      await run(page)
      assert.deepEqual(errors, [], "isolated scenario has no uncaught browser errors")
      assert.deepEqual(assets, [], "isolated scenario has no failed local application assets")
    } finally {
      await isolated.close()
    }
  }, { continueOnFailure: true })
}

async function storedBackup(page, { seed } = {}) {
  // Direct access is used only to inspect storage or seed an invalid synthetic
  // value that the restore UI correctly refuses. Never reset/delete a database.
  return page.evaluate(({ seed }) => new Promise((resolve, reject) => {
    const open = indexedDB.open("localforage")
    open.onupgradeneeded = () => open.transaction.abort()
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains("keyvaluepairs")) {
        db.close(); reject(new Error("Expected the app's initialized IndexedDB store")); return
      }
      const transaction = db.transaction("keyvaluepairs", seed === undefined ? "readonly" : "readwrite")
      const store = transaction.objectStore("keyvaluepairs")
      const request = seed === undefined ? store.get("southwing-data-v1") : store.put(seed, "southwing-data-v1")
      let value
      request.onsuccess = () => { value = seed === undefined ? request.result : seed }
      transaction.oncomplete = () => { db.close(); resolve(value) }
      transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Synthetic storage transaction aborted")) }
    }
  }), { seed })
}

try {
  origin = await startPreview()
  browser = await launchBrowser()
  context = await browser.newContext(browserOptions)
  await installFixtures(context)
  const page = await newTestPage(context)

  await step("homepage exports the unchanged empty v1 schema", async () => {
    await go(page, "/")
    await page.getByRole("heading", { name: "Keep your birding data safe" }).waitFor()
    assert.match(await page.locator("body").innerText(), /230 species across Aotearoa New Zealand/)
    assert.deepEqual(JSON.parse(await downloadBackup(page)), emptyBackup)
    await noOverflow(page, "empty homepage")
  })

  let exportedOriginal
  await step("original JSON restore previews without mutation and cancels safely", async () => {
    await chooseBackup(page, JSON.stringify(originalBackup), `synthetic-${"long-filename-".repeat(10)}v1.json`)
    await preview(page).waitFor()
    assert.match(await page.locator("body").innerText(), /3 sightings \(3 species\)/)
    assert.equal(await replaceButton(page).isDisabled(), true)
    assert.deepEqual(JSON.parse(await downloadBackup(page, "Download current backup first")), emptyBackup)
    await noOverflow(page, "long backup filename and preview")
    await acknowledgement(page).check()
    await page.getByRole("button", { name: "Cancel restore", exact: true }).click()
    await page.getByRole("status").filter({ hasText: "Restore cancelled. No data has been changed." }).waitFor()
    assert.equal(await preview(page).count(), 0)
    assert.deepEqual(JSON.parse(await downloadBackup(page)), emptyBackup)
    await page.reload({ waitUntil: "domcontentloaded" })
    assert.deepEqual(JSON.parse(await downloadBackup(page)), emptyBackup)
  })

  await step("confirmed restore preserves all legacy IDs, notes, settings and extension fields after reload", async () => {
    await confirmBackup(page, JSON.stringify(originalBackup))
    exportedOriginal = await downloadBackup(page)
    assert.deepEqual(JSON.parse(exportedOriginal), originalBackup)
    await waitForSaved(page, originalBackup)
    await page.reload({ waitUntil: "domcontentloaded" })
    assert.deepEqual(JSON.parse(await downloadBackup(page)), originalBackup)
  })

  await step("malformed and unsupported backups are rejected without changing saved data", async () => {
    for (const raw of ["{broken", '{"v":2,"sightings":[]}', '{"sightings":[{"id":"bad","speciesId":"tui","count":"2","dateISO":"2024-01-01"}]}', '{"sightings":[],"settings":{"homeLng":181}}']) {
      await chooseBackup(page, raw, "synthetic-invalid.json")
      await page.getByRole("alert").filter({ hasText: /No data has been changed/ }).waitFor()
      assert.equal(await preview(page).count(), 0)
      assert.equal(await replaceButton(page).count(), 0)
      assert.deepEqual(JSON.parse(await downloadBackup(page)), originalBackup)
      await waitForSaved(page, originalBackup)
    }
    await page.reload({ waitUntil: "domcontentloaded" })
    assert.deepEqual(JSON.parse(await downloadBackup(page)), originalBackup)
  })

  await step("export/import roundtrip replaces rather than merges synthetic data", async () => {
    const temporary = { ...emptyBackup, sightings: [{ id: "synthetic-replacement-only", speciesId: "tui", count: 1, dateISO: "2024-01-01T09:00" }] }
    await confirmBackup(page, JSON.stringify(temporary))
    assert.deepEqual(JSON.parse(await downloadBackup(page)), temporary)
    await confirmBackup(page, exportedOriginal)
    await waitForSaved(page, originalBackup)
    await page.reload({ waitUntil: "domcontentloaded" })
    assert.deepEqual(JSON.parse(await downloadBackup(page)), originalBackup)
  })

  await step("guide exposes 230 species, native/endemic filters and accent-insensitive search", async () => {
    await go(page, "/guide")
    const cards = page.getByRole("button", { name: /^View / })
    const matches = (text) => page.getByRole("status").filter({ hasText: text })
    await matches(/^230 species match$/).waitFor()
    assert.equal(await cards.count(), 230)
    const status = page.getByRole("combobox", { name: /Origin.*status/i })
    await status.selectOption("Endemic")
    // Frozen counts for this 230-species catalogue, independent of the UI's
    // filtered list: a filter that silently drops birds must also fail.
    await matches(/^95 species match$/).waitFor()
    assert.equal(await cards.count(), 95)
    assert.equal(await cards.filter({ has: page.getByText("Endemic", { exact: true }) }).count(), 95)
    assert.equal(await page.getByRole("button", { name: "View Mallard", exact: true }).count(), 0)
    await status.selectOption("Native")
    await matches(/^64 species match$/).waitFor()
    assert.equal(await cards.count(), 64)
    assert.equal(await page.getByRole("button", { name: "View Silvereye", exact: true }).count(), 1)
    assert.equal(await cards.filter({ has: page.getByText("Endemic", { exact: true }) }).count(), 0)
    assert.equal(await page.getByRole("button", { name: "View Kea", exact: true }).count(), 0)
    assert.equal(await page.getByRole("button", { name: "View Mallard", exact: true }).count(), 0)
    await status.selectOption("")
    await matches(/^230 species match$/).waitFor()
    const search = page.getByRole("textbox", { name: /Search species/i })
    for (const term of ["kākāpō", "kakapo", "KAKAPO"]) {
      await search.fill(term)
      await matches(/^1 species match$/).waitFor()
      assert.deepEqual(await cards.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label"))), ["View Kākāpō"])
    }
    await search.fill("Nestor notabilis")
    await page.getByRole("button", { name: "View Kea", exact: true }).click()
    await page.waitForURL("**/#/guide/kea")
  })

  await step("new species detail shows range, verified photo credit and a decoded stub image", async () => {
    await page.getByRole("heading", { name: "Range in Aotearoa", exact: true }).waitFor()
    await page.getByText(/South Island mountains and adjacent forests/).waitFor()
    const credit = page.locator("p").filter({ hasText: /^Photo:/ })
    await credit.waitFor()
    const links = credit.getByRole("link")
    assert.equal(await links.count(), 2)
    assert.match(await links.nth(0).getAttribute("href"), /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    assert.ok((await links.nth(0).innerText()).trim().length > 0, "photographer is credited")
    assert.match(await links.nth(1).getAttribute("href"), /^https:\/\/creativecommons\.org\/(licenses|publicdomain)\//)
    assert.match(await links.nth(1).innerText(), /CC|Public domain/)
    // Only wait for this single tiny test image, not every guide image.
    await page.waitForFunction(() => {
      const image = document.querySelector(".detail-hero img")
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth === 1
    })
    assert.equal(await page.locator(".detail-hero img").getAttribute("alt"), "Kea", "normal detail alt identifies the species")
    await noOverflow(page, "Kea detail")
  })

  await step("map lists Auckland and Chatham sites with keyboard-operable detail links", async () => {
    await go(page, "/map")
    await page.getByRole("combobox", { name: "Hotspot region" }).selectOption("Auckland")
    await page.getByRole("button", { name: "List", exact: true }).click()
    await page.getByRole("status").filter({ hasText: /^3 of \d+ hotspots/ }).waitFor()
    assert.equal(await page.locator('a[href^="#/hotspot/"]').count(), 3)
    await keyboardOpenHotspot(page, "Ambury Regional Park", "ambury")
    await go(page, "/map")
    await page.getByRole("combobox", { name: "Hotspot region" }).selectOption("Chatham Islands")
    await page.getByRole("button", { name: "List", exact: true }).click()
    await page.getByRole("status").filter({ hasText: /^1 of \d+ hotspots/ }).waitFor()
    assert.equal(await page.locator('a[href^="#/hotspot/"]').count(), 1)
    await keyboardOpenHotspot(page, "Waitangi Foreshore", "waitangi-chatham")
    const directions = new URL(await page.getByRole("link", { name: "Directions", exact: true }).getAttribute("href"))
    assert.equal(directions.searchParams.get("destination"), "-43.9516,-176.5597", "directions retain negative Chatham longitude")
  })

  await step("mocked alerts default to NZ with no implicit Christchurch request, and respect manual region choice", async () => {
    ebirdRequests.length = 0
    await go(page, "/alerts")
    await page.getByRole("heading", { name: "Notable in Aotearoa New Zealand", exact: true }).waitFor()
    assert.ok(ebirdRequests.length > 0)
    for (const request of ebirdRequests) {
      assert.equal(new URL(request.url).pathname, "/v2/data/obs/NZ/recent/notable")
      assert.equal(request.token, "synthetic-browser-key")
    }
    assert.equal(await page.getByRole("combobox", { name: "Nearby reports centred on" }).inputValue(), "none")
    await page.getByText("Synthetic public tūī", { exact: false }).waitFor()
    assert.doesNotMatch(await page.locator("body").innerText(), /Synthetic private bird|Secret private location/)
    await page.getByRole("combobox", { name: "Notable reports in" }).selectOption("NZ-AUK")
    await page.getByRole("heading", { name: "Notable in Auckland", exact: true }).waitFor()
    assert.ok(ebirdRequests.some((r) => new URL(r.url).pathname === "/v2/data/obs/NZ-AUK/recent/notable"))
    assert.ok(ebirdRequests.every((r) => !new URL(r.url).pathname.includes("/geo/")))
    await page.getByRole("button", { name: "Use my location", exact: true }).click()
    await page.getByRole("status").filter({ hasText: /Location unavailable/ }).waitFor()
    assert.ok(ebirdRequests.every((r) => !new URL(r.url).pathname.includes("/geo/")), "denied GPS never falls back to Christchurch")
  })

  await step("mobile pages have no horizontal document overflow", async () => {
    const overflows = []
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 })
      for (const path of ["/", "/guide", "/guide/kea", "/map", "/hotspot/waitangi-chatham", "/settings", "/alerts"]) {
        await go(page, path)
        if (path === "/alerts") await page.getByRole("heading", { name: "Notable in Aotearoa New Zealand", exact: true }).waitFor()
        if (path === "/map") {
          await page.getByRole("combobox", { name: "Hotspot region" }).selectOption("Chatham Islands")
          await page.getByRole("button", { name: "List", exact: true }).click()
          await page.getByRole("link", { name: /Waitangi Foreshore/ }).waitFor()
        }
        try { await noOverflow(page, `${width}px ${path}`) }
        catch (error) { overflows.push(error.message) }
      }
    }
    assert.deepEqual(overflows, [], "all mobile routes fit the viewport")
  }, { continueOnFailure: true })

  await step("saved home coordinates are editable, survive reload and drive nearby alerts", async () => {
    await go(page, "/settings")
    // Match semantic coordinate labels, not a particular heading/placeholder.
    const latitude = page.getByLabel(/latitude/i), longitude = page.getByLabel(/longitude/i)
    await latitude.fill("-36.8485")
    await longitude.fill("174.7633")
    await longitude.press("Tab")
    // Support both immediate-save controls and an explicit accessible save button.
    const save = page.getByRole("button", { name: /save.*(?:home|location)|(?:home|location).*save/i })
    if (await save.count()) await save.click()
    const edited = JSON.parse(await downloadBackup(page))
    assert.deepEqual(edited, { ...originalBackup, settings: { ...originalBackup.settings, homeLat: -36.8485, homeLng: 174.7633 } })
    await waitForSaved(page, edited)
    await page.reload({ waitUntil: "domcontentloaded" })
    await latitude.waitFor()
    assert.equal(Number(await latitude.inputValue()), -36.8485)
    assert.equal(Number(await longitude.inputValue()), 174.7633)
    ebirdRequests.length = 0
    await go(page, "/alerts")
    await page.getByRole("heading", { name: "Near saved home", exact: true }).waitFor()
    const nearby = ebirdRequests.filter((r) => new URL(r.url).pathname === "/v2/data/obs/geo/recent")
    assert.ok(nearby.length > 0, "edited home requests nearby reports")
    for (const request of nearby) {
      const url = new URL(request.url)
      assert.equal(url.searchParams.get("lat"), "-36.8485")
      assert.equal(url.searchParams.get("lng"), "174.7633")
    }
  }, { continueOnFailure: true })

  await step("no uncaught browser errors or failed local application assets", async () => {
    assert.deepEqual(runtimeErrors, [])
    assert.deepEqual(localErrors, [])
    assert.equal(server.exitCode, null, "owned preview remains alive until cleanup")
  })

  // Keep the original twelve scenarios above intact. Every additional scenario
  // starts from its own ephemeral profile and sets up all of its own data; none
  // imports application/test helpers or relies on another scenario's mutations.
  await isolatedStep("unversioned backups default missing sections and partial fields exactly after reload", async (page) => {
    await go(page, "/settings")
    await confirmBackup(page, JSON.stringify(originalBackup))
    await waitForSaved(page, originalBackup)
    const sightings = [originalBackup.sightings[0]]
    const partial = {
      sightings, settings: { name: "Synthetic legacy birder", futureSetting: "retain me" },
      quiz: { played: 4, futureQuiz: { retained: true } }, futureSection: { legacy: true },
    }
    for (const [legacy, expected] of [
      [{ sightings }, { ...emptyBackup, sightings }],
      [partial, {
        ...emptyBackup, sightings,
        settings: { ...emptyBackup.settings, ...partial.settings },
        quiz: { ...emptyBackup.quiz, ...partial.quiz }, futureSection: partial.futureSection,
      }],
    ]) {
      await confirmBackup(page, JSON.stringify(legacy))
      assert.deepEqual(JSON.parse(await downloadBackup(page)), expected, "defaults are not inherited from the previous profile")
      await waitForSaved(page, expected)
      await page.reload({ waitUntil: "domcontentloaded" })
      assert.deepEqual(JSON.parse(await downloadBackup(page)), expected)
    }
  })

  await isolatedStep("home controls reject out-of-range and blank coordinates without changing valid saved data", async (page) => {
    const baseline = { ...originalBackup, settings: { ...originalBackup.settings, homeLat: -36.8485, homeLng: 174.7633 } }
    await go(page, "/settings")
    await confirmBackup(page, JSON.stringify(baseline))
    await waitForSaved(page, baseline)
    const latitude = page.getByLabel("Latitude", { exact: true }), longitude = page.getByLabel("Longitude", { exact: true })
    for (const [lat, lng] of [["91", "174.7633"], ["-91", "174.7633"], ["-36.8485", "181"], ["-36.8485", "-181"], ["", "174.7633"], ["-36.8485", ""]]) {
      await latitude.fill(lat)
      await longitude.fill(lng)
      await page.getByRole("button", { name: "Save home location", exact: true }).click()
      await page.getByRole("status").filter({ hasText: /Enter a valid latitude.*Your saved home has not changed/ }).waitFor()
      assert.deepEqual(JSON.parse(await downloadBackup(page)), baseline, `rejected coordinates (${lat}, ${lng}) leave the full backup unchanged`)
      await waitForSaved(page, baseline)
    }
    await page.reload({ waitUntil: "domcontentloaded" })
    await latitude.waitFor()
    assert.equal(await latitude.inputValue(), "-36.8485")
    assert.equal(await longitude.inputValue(), "174.7633")
    assert.deepEqual(JSON.parse(await downloadBackup(page)), baseline)
  })

  await isolatedStep("correct and incorrect quiz answers persist counters, streaks and extension fields without revealing the answer in alt text", async (page) => {
    const baseline = {
      ...originalBackup, sightings: [originalBackup.sightings[0]],
      settings: { ...originalBackup.settings, futureSetting: { retained: true } },
      quiz: { played: 3, correct: 2, bestStreak: 1, futureQuiz: { retained: true } },
      unlockedBadges: { ...originalBackup.unlockedBadges, "first-lifer": "2024-02-29T08:00" },
    }
    await go(page, "/settings")
    await confirmBackup(page, JSON.stringify(baseline))
    await waitForSaved(page, baseline)
    // Use the public field guide as the photo/name oracle, not leaked quiz alt
    // text, React internals, a fixed random sequence, or production scoring code.
    await go(page, "/guide")
    const guidePhotos = await page.locator(".sp-card").evaluateAll((cards) => cards.map((card) => ({
      name: card.querySelector('button[aria-label^="View "]')?.getAttribute("aria-label").slice(5),
      url: card.querySelector("img")?.src,
    })).filter((photo) => photo.name && photo.url))
    assert.ok(guidePhotos.length > 0, "field guide supplies independently labelled photos")
    await go(page, "/quiz")
    let expected = baseline, score = 0, total = 0, streak = 0
    for (const correct of [true, true, false]) {
      await page.waitForFunction(() => {
        const image = document.querySelector(".quiz-photo img")
        const options = [...document.querySelectorAll(".quiz-opts button")]
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth === 1 &&
          options.length === 4 && options.every((button) => !button.disabled)
      })
      const image = page.locator(".quiz-photo img"), options = page.locator(".quiz-opts button")
      assert.equal(await image.getAttribute("alt"), "Bird photograph to identify")
      const url = await image.getAttribute("src")
      const names = new Set(guidePhotos.filter((photo) => photo.url === url).map((photo) => photo.name))
      const optionNames = await options.evaluateAll((buttons) => buttons.map((button) => button.firstChild.textContent.trim()))
      const matches = optionNames.map((name, index) => names.has(name) ? index : -1).filter((index) => index >= 0)
      assert.equal(matches.length, 1, "exactly one option matches the field guide's photo identity")
      const index = correct ? matches[0] : optionNames.findIndex((_, index) => index !== matches[0])
      await options.nth(index).click()
      await page.getByRole("button", { name: "Next bird", exact: true }).waitFor()
      score += Number(correct); total++; streak = correct ? streak + 1 : 0
      expected = {
        ...expected, quiz: {
          ...expected.quiz, played: baseline.quiz.played + total, correct: baseline.quiz.correct + score,
          bestStreak: Math.max(expected.quiz.bestStreak, streak),
        },
      }
      assert.equal((await page.locator(".quiz-score b").innerText()).trim(), `${score}/${total}`)
      assert.equal((await page.locator(".quiz-score span").innerText()).trim(), `streak ${streak} · best ${expected.quiz.bestStreak}`)
      assert.equal(await page.locator(".quiz-opts button:disabled").count(), 4, "an answered question cannot be scored again")
      assert.equal(await page.locator(".quiz-opts .correct").count(), 1)
      assert.equal(await page.locator(".quiz-opts .wrong").count(), correct ? 0 : 1)
      await waitForSaved(page, expected)
      if (total < 3) await page.getByRole("button", { name: "Next bird", exact: true }).click()
    }
    await go(page, "/settings")
    assert.deepEqual(JSON.parse(await downloadBackup(page)), expected)
    await page.reload({ waitUntil: "domcontentloaded" })
    assert.deepEqual(JSON.parse(await downloadBackup(page)), expected)
  })

  await isolatedStep("pending and failed quiz images disable answers and skipping never changes scores", async (page) => {
    await go(page, "/settings")
    await confirmBackup(page, JSON.stringify(originalBackup))
    await waitForSaved(page, originalBackup)
    let release
    const held = new Promise((resolve) => { release = resolve })
    const failedPhotos = []
    const externalImage = (request) => request.resourceType() === "image" && new URL(request.url()).origin !== origin
    // Page routes override the shared fixture only for external images. All app
    // assets and other fixtures retain their original behaviour.
    await page.route("**/*", async (route) => {
      if (!externalImage(route.request())) return route.fallback()
      await held
      failedPhotos.push(route.request().url())
      return route.abort("failed")
    })
    try {
      const firstRequest = page.waitForRequest(externalImage)
      await go(page, "/quiz")
      const firstUrl = (await firstRequest).url()
      await page.getByRole("status").filter({ hasText: /Waiting for the photo/ }).waitFor()
      assert.equal(await page.locator(".quiz-photo img").getAttribute("alt"), "Bird photograph to identify")
      assert.equal(await page.locator(".quiz-opts button:disabled").count(), 4, "answers are disabled while the network response is pending")
      release()
      await page.getByRole("img", { name: "Bird photograph unavailable", exact: true }).waitFor()
      assert.ok(failedPhotos.includes(firstUrl), "the photo actually encountered an injected network failure")
      assert.equal(await page.locator(".quiz-opts button:disabled").count(), 4, "answers remain disabled after the image error")
      const nextRequest = page.waitForRequest(externalImage)
      await page.getByRole("button", { name: "Skip photo", exact: true }).click()
      const nextUrl = (await nextRequest).url()
      assert.notEqual(nextUrl, firstUrl, "skip advances to a different photograph")
      await page.getByRole("img", { name: "Bird photograph unavailable", exact: true }).waitFor()
      assert.ok(failedPhotos.includes(nextUrl))
      assert.equal(await page.locator(".quiz-opts button:disabled").count(), 4)
      assert.equal((await page.locator(".quiz-score b").innerText()).trim(), "0/0")
      assert.equal((await page.locator(".quiz-score span").innerText()).trim(), "streak 0 · best 2")
      assert.equal(await page.getByRole("button", { name: "Next bird", exact: true }).count(), 0)
      await go(page, "/settings")
      assert.deepEqual(JSON.parse(await downloadBackup(page)), originalBackup)
      await waitForSaved(page, originalBackup)
      await page.reload({ waitUntil: "domcontentloaded" })
      assert.deepEqual(JSON.parse(await downloadBackup(page)), originalBackup)
    } finally {
      release() // Also release intercepted requests if an assertion failed while loading.
    }
  })

  await isolatedStep("same-tick UI settings updates retain every changed field and survive reload", async (page) => {
    await go(page, "/settings")
    await confirmBackup(page, JSON.stringify(originalBackup))
    await waitForSaved(page, originalBackup)
    const expected = {
      ...originalBackup, settings: {
        ...originalBackup.settings, name: "Synthetic rapid final name", theme: "dark", ebirdKey: "synthetic-rapid-key",
      },
    }
    const name = await page.getByLabel("Name (for the morning greeting)", { exact: true }).elementHandle()
    const theme = await page.getByRole("combobox", { name: /^Theme\b/ }).elementHandle()
    const key = await page.getByLabel("eBird API key", { exact: true }).elementHandle()
    // Dispatch real DOM events synchronously in one browser task. No awaits,
    // per-input Playwright delays, store methods, or React internals intervene.
    await page.evaluate(({ name, theme, key }) => {
      const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set
      const input = (element, value) => {
        setInput.call(element, value)
        element.dispatchEvent(new Event("input", { bubbles: true }))
      }
      input(name, "Synthetic rapid intermediate name")
      theme.value = "dark"
      theme.dispatchEvent(new Event("change", { bubbles: true }))
      input(key, "synthetic-rapid-key")
      input(name, "Synthetic rapid final name")
    }, { name, theme, key })
    assert.deepEqual(JSON.parse(await downloadBackup(page)), expected, "same-tick patches compose instead of overwriting one another")
    await waitForSaved(page, expected)
    await page.reload({ waitUntil: "domcontentloaded" })
    assert.deepEqual(JSON.parse(await downloadBackup(page)), expected, "queued writes cannot restore an older snapshot")
    assert.equal(await page.getByLabel("Name (for the morning greeting)", { exact: true }).inputValue(), expected.settings.name)
    assert.equal(await page.getByRole("combobox", { name: /^Theme\b/ }).inputValue(), "dark")
    assert.equal(await page.getByLabel("eBird API key", { exact: true }).inputValue(), "synthetic-rapid-key")
  })

  await isolatedStep("Kea logs at Arthur's Pass with required date validation and an exact persisted backup roundtrip", async (page) => {
    await go(page, "/settings")
    await confirmBackup(page, JSON.stringify(originalBackup))
    await waitForSaved(page, originalBackup)
    const notes = 'Synthetic kea — kākā, tūī & "quotes".\nTwo birds at Arthur’s Pass.'
    const openKeaLog = async () => {
      await page.getByRole("link", { name: "Log a bird", exact: true }).click()
      await page.getByRole("heading", { name: "What did you see?", exact: true }).waitFor()
      await page.getByRole("textbox", { name: "Search for a bird to log", exact: true }).fill("Kea")
      await page.locator(".sp-row").filter({ has: page.getByText("Kea", { exact: true }) }).click()
      await page.getByRole("heading", { name: "Log sighting", exact: true }).waitFor()
      await page.getByRole("combobox", { name: /^Where\?/ }).selectOption("arthurs-pass-village")
      await page.getByRole("button", { name: "More", exact: true }).click()
      await page.getByRole("textbox", { name: "Notes (optional)", exact: true }).fill(notes)
    }
    const when = page.getByLabel("When?", { exact: true })
    const save = page.getByRole("button", { name: "Save sighting", exact: true })
    await openKeaLog()
    await when.fill("")
    await save.click()
    assert.deepEqual(await when.evaluate((input) => ({
      required: input.required, valueMissing: input.validity.valueMissing, valid: input.validity.valid,
    })), { required: true, valueMissing: true, valid: false }, "a blank date is invalid")
    assert.equal(await page.getByRole("heading", { name: "Log sighting", exact: true }).count(), 1, "invalid save keeps the log form open")
    assert.equal(await page.getByRole("button", { name: "Sweet as", exact: true }).count(), 0, "invalid save does not create a lifer")
    await go(page, "/settings")
    assert.deepEqual(JSON.parse(await downloadBackup(page)), originalBackup, "invalid save leaves the entire backup unchanged")
    await waitForSaved(page, originalBackup)

    await openKeaLog()
    await when.fill("2026-10-22T09:30")
    assert.equal(await when.evaluate((input) => input.validity.valid), true, "the prior local date is valid")
    await save.click()
    const dismissLifer = page.getByRole("button", { name: "Sweet as", exact: true })
    await dismissLifer.waitFor()
    await page.getByRole("heading", { name: "Kea", exact: true }).waitFor()
    await dismissLifer.click()
    await go(page, "/settings")
    const exported = await downloadBackup(page), logged = JSON.parse(exported)
    const kea = logged.sightings.filter((sighting) => sighting.speciesId === "kea")
    assert.equal(logged.sightings.length, originalBackup.sightings.length + 1, "exactly one sighting is added")
    assert.equal(kea.length, 1)
    const sighting = kea[0]
    assert.equal(typeof sighting.id, "string")
    assert.ok(sighting.id.length > 0 && !originalBackup.sightings.some((previous) => previous.id === sighting.id), "the new sighting has its own nonempty ID")
    // Frozen public catalogue coordinates; expected fields are not inferred from
    // private store internals, and no real device location or backup is used.
    assert.deepEqual(sighting, {
      id: sighting.id, speciesId: "kea", hotspotId: "arthurs-pass-village",
      count: 2, dateISO: "2026-10-22T09:30:00", notes, lat: -42.9412, lng: 171.5628,
    })
    assert.deepEqual(logged.sightings.filter((previous) => previous.id !== sighting.id), originalBackup.sightings, "existing sightings remain unchanged")
    assert.deepEqual(logged.settings, originalBackup.settings, "logging does not change settings values or shape")
    assert.equal(logged.v, originalBackup.v)
    assert.deepEqual(logged.outings, originalBackup.outings)
    assert.deepEqual(logged.quiz, originalBackup.quiz)
    assert.deepEqual(logged.futureSection, originalBackup.futureSection)
    await waitForSaved(page, logged)
    await page.reload({ waitUntil: "domcontentloaded" })
    assert.equal(await downloadBackup(page), exported, "the full exported backup survives reload exactly")

    // Restore a different synthetic snapshot first so the roundtrip cannot pass
    // through a no-op import. Preserve the generated ID and any earned badges.
    await confirmBackup(page, JSON.stringify(originalBackup))
    await waitForSaved(page, originalBackup)
    assert.deepEqual(JSON.parse(await downloadBackup(page)), originalBackup)
    await confirmBackup(page, exported)
    await waitForSaved(page, logged)
    assert.equal(await downloadBackup(page), exported, "import/export is an exact roundtrip")
    await page.reload({ waitUntil: "domcontentloaded" })
    assert.equal(await downloadBackup(page), exported, "the roundtripped sighting and settings survive another reload")
  })

  await isolatedStep("failed browser saves warn, keep unsaved JSON exportable and leave the last saved profile intact", async (page) => {
    await go(page, "/settings")
    await confirmBackup(page, JSON.stringify(originalBackup))
    await waitForSaved(page, originalBackup)
    await page.evaluate(() => { window.__syntheticStorage.failWrites = true })
    await page.getByLabel("Name (for the morning greeting)", { exact: true }).fill("Synthetic unsaved birder")
    const warning = page.getByRole("alert").filter({ hasText: /Changes could not be saved to this browser/ })
    await warning.waitFor()
    assert.match(await warning.innerText(), /download a backup.*before reloading or closing/i)
    await page.getByRole("combobox", { name: /^Theme\b/ }).selectOption("dark")
    await page.waitForFunction(() => window.__syntheticStorage.rejected >= 2)
    const expected = { ...originalBackup, settings: { ...originalBackup.settings, name: "Synthetic unsaved birder", theme: "dark" } }
    assert.deepEqual(JSON.parse(await downloadBackup(page)), expected, "failed persistence does not discard in-memory work")
    assert.deepEqual(await storedBackup(page), originalBackup, "quota errors do not change the last successful write")
    await page.reload({ waitUntil: "domcontentloaded" })
    assert.deepEqual(JSON.parse(await downloadBackup(page)), originalBackup, "unsaved edits were not silently persisted via another driver")
    assert.equal(await page.getByRole("alert").count(), 0, "reloading a valid saved profile does not crash or keep a stale warning")
  }, { storageFaults: true })

  await isolatedStep("failed initial load protects corrupt storage while new in-memory work remains exportable", async (page) => {
    await go(page, "/settings")
    assert.deepEqual(JSON.parse(await downloadBackup(page)), emptyBackup)
    const corrupt = { ...originalBackup, sightings: { invalid: "Synthetic corrupt stored shape; retain exactly" } }
    await storedBackup(page, { seed: corrupt })
    await page.reload({ waitUntil: "domcontentloaded" })
    const warning = page.getByRole("alert").filter({ hasText: /Saved data could not be loaded/ })
    await warning.waitFor()
    assert.match(await warning.innerText(), /Existing browser data has not been overwritten/)
    assert.deepEqual(JSON.parse(await downloadBackup(page)), emptyBackup)
    // Advance past the legacy 250ms debounce as well as immediate/microtask
    // writes. A protected load must make NO put attempts, not merely fail them.
    await page.clock.runFor(1_000)
    assert.deepEqual(await storedBackup(page), corrupt)
    assert.deepEqual(await page.evaluate(() => window.__syntheticStorage.writes), [])
    await page.getByLabel("Name (for the morning greeting)", { exact: true }).fill("Synthetic protected-tab work")
    await page.getByRole("combobox", { name: /^Theme\b/ }).selectOption("dark")
    const expected = { ...emptyBackup, settings: { ...emptyBackup.settings, name: "Synthetic protected-tab work", theme: "dark" } }
    assert.deepEqual(JSON.parse(await downloadBackup(page)), expected)
    await page.clock.runFor(1_000)
    assert.equal(await warning.count(), 1, "editing cannot clear the failed-load warning")
    assert.deepEqual(await page.evaluate(() => window.__syntheticStorage.writes), [], "new settings must not overwrite protected corrupt storage")
    assert.deepEqual(await storedBackup(page), corrupt)
    await page.reload({ waitUntil: "domcontentloaded" })
    await warning.waitFor()
    assert.deepEqual(await storedBackup(page), corrupt, "the same corrupt value remains recoverable after another reload")
    assert.deepEqual(JSON.parse(await downloadBackup(page)), emptyBackup, "protected tab-only changes were never persisted")
  }, { storageFaults: true, installClock: true })

  if (independentFailures.length) {
    process.exitCode = 1
    console.error(`FAIL: ${completed}/${attempted} browser scenarios passed; failed: ${independentFailures.join("; ")}`)
  } else {
    console.log(`PASS: ${completed} browser regression scenarios; external data mocked, isolated synthetic storage only.`)
  }
} catch (error) {
  process.exitCode = 1
  console.error(`FAIL after ${completed} browser scenarios:`, error)
} finally {
  try { await cleanup() }
  catch (error) { process.exitCode = 1; console.error("FAIL during browser/preview cleanup:", error) }
  clearTimeout(watchdog)
  process.removeListener("SIGINT", interrupt)
  process.removeListener("SIGTERM", terminate)
}