// Dev-time visual check: drives the preview build and screenshots key screens.
import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const BASE = process.env.SHOT_BASE || "http://localhost:4173"
mkdirSync("screenshots", { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.SHOT_CHROME || undefined,
})
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: "light",
})
const page = await ctx.newPage()
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message))
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200))
})

async function shot(name, path, wait = 1400) {
  await page.goto(`${BASE}/#${path}`, { waitUntil: "networkidle" }).catch(() => {})
  await page.waitForTimeout(wait)
  await page.screenshot({ path: `screenshots/${name}.png` })
  console.log("shot:", name)
}

// seed demo data through the real UI
await page.goto(`${BASE}/#/settings`, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(600)
await page.getByText("Load demo data").click()
await page.waitForTimeout(600)

await shot("01-home", "/", 2200)
await shot("02-guide", "/guide", 2600)
await shot("03-species", "/guide/kuaka", 2200)
await shot("04-log", "/log", 1200)
await shot("05-mybirds", "/mybirds", 2000)
await shot("06-map", "/map", 3000)
await shot("07-hotspot", "/hotspot/travis", 1600)
await shot("08-quiz", "/quiz", 2200)

// dark mode home
const dark = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
})
const dp = await dark.newPage()
await dp.goto(`${BASE}/#/settings`, { waitUntil: "domcontentloaded" })
await dp.waitForTimeout(500)
await dp.getByText("Load demo data").click()
await dp.waitForTimeout(400)
await dp.goto(`${BASE}/#/`, { waitUntil: "networkidle" }).catch(() => {})
await dp.waitForTimeout(2000)
await dp.screenshot({ path: "screenshots/09-home-dark.png" })
console.log("shot: 09-home-dark")

await browser.close()
console.log("done")
