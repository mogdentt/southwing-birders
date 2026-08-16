// Renders the SVG logo into the PNG icons the PWA manifest needs.
import sharp from "sharp"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const svg = readFileSync(resolve(root, "public/favicon.svg"))

async function make(size, out, pad = 0) {
  const inner = size - pad * 2
  const img = await sharp(svg, { density: 300 }).resize(inner, inner).png().toBuffer()
  if (!pad) {
    writeFileSync(resolve(root, "public", out), img)
    return
  }
  const canvas = sharp({
    create: { width: size, height: size, channels: 4, background: "#123B2D" },
  })
  const buf = await canvas.composite([{ input: img, left: pad, top: pad }]).png().toBuffer()
  writeFileSync(resolve(root, "public", out), buf)
}

await make(192, "pwa-192.png")
await make(512, "pwa-512.png")
await make(512, "pwa-maskable-512.png", 64)
await make(180, "apple-touch-icon.png")
console.log("icons written")
