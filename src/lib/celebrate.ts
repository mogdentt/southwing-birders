import confetti from "canvas-confetti"

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Lifer! Full celebration. */
export function celebrateLifer() {
  if (reduced()) return
  const colors = ["#1E5C46", "#D9A441", "#2C7A8C", "#7A3B69", "#F7F5EF"]
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.75 }, colors, disableForReducedMotion: true })
  setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors }), 180)
  setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors }), 320)
}

/** Smaller pop for badges and finished outings. */
export function celebrateSmall() {
  if (reduced()) return
  confetti({
    particleCount: 40,
    spread: 55,
    origin: { y: 0.8 },
    colors: ["#D9A441", "#1E5C46", "#F7F5EF"],
    disableForReducedMotion: true,
  })
}
