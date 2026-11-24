/**
 * Compose the "secretly eating rice" working pose: the licensed full-body maid
 * with a steaming rice bowl held under her raised hand, grains heading for her
 * open mouth.
 * Run: node compose-eating.cjs <decoded.png> <out.png> [maxSide]
 */
const fs = require('node:fs')
const { decodePng, encodePng, contentBox, crop, resize, fillEllipse, ringEllipse, blend } = require('./png-tools.cjs')

const img = decodePng(process.argv[2])
const figure = crop(img, contentBox(img, 16))
const w = figure.width
const h = figure.height
const maxSide = Number(process.argv[4] ?? 320)

const OUTLINE = [40, 52, 78, 240]
const LACQUER = [52, 66, 96, 255]
const LACQUER_LIGHT = [74, 90, 124, 255]
const LACQUER_DARK = [36, 46, 68, 255]
const GOLD = [201, 168, 106, 255]
const RICE = [252, 249, 241, 255]
const RICE_SHADE = [222, 214, 196, 255]
const RICE_OUTLINE = [122, 112, 96, 190]

const cx = Math.round(w * Number(process.env.BOWL_X ?? 0.79))
const rimY = Math.round(h * Number(process.env.BOWL_Y ?? 0.30))
const R = Math.round(w * Number(process.env.BOWL_R ?? 0.093))
const rimRy = Math.round(R * 0.3)
const depth = Math.round(R * 1.02)

/** Horizontal span fill with per-pixel alpha at both ends. */
function span(y, x0, x1, color) {
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x += 1) {
    const left = Math.max(0, Math.min(1, x + 1 - x0))
    const right = Math.max(0, Math.min(1, x1 - x))
    const alpha = Math.min(left, right)
    if (alpha > 0) blend(figure, x, y, color, alpha)
  }
}

// Soft contact shadow on her apron so the bowl sits in the scene.
fillEllipse(figure, cx, rimY + depth + 4, Math.round(R * 1.05), Math.round(R * 0.22), [40, 52, 78, 60])

// Lacquered body: a tapering silhouette from the rim down to the foot.
for (let y = rimY; y <= rimY + depth; y += 1) {
  const t = (y - rimY) / depth
  const radius = R * (1 - 0.26 * t * t)
  const tone = [0, 1, 2].map((c) => Math.round(LACQUER[c] - 16 * t))
  span(y, cx - radius, cx + radius, [...tone, 255])
  // Sheen down the left side.
  for (let k = 1; k <= 5; k += 1) {
    blend(figure, Math.round(cx - radius + k * (R * 0.07)), y, LACQUER_LIGHT, 0.1)
  }
  // Darker edges for roundness.
  for (const side of [-1, 1]) {
    const edge = cx + side * radius
    for (let k = 0; k < 3; k += 1) {
      blend(figure, Math.round(edge - side * k), y, LACQUER_DARK, 0.35 - k * 0.1)
    }
  }
}

// Foot.
fillEllipse(figure, cx, rimY + depth, Math.round(R * 0.44), Math.round(R * 0.12), LACQUER_DARK)
ringEllipse(figure, cx, rimY + depth, Math.round(R * 0.44), Math.round(R * 0.12), 2, OUTLINE)

// Interior surface, then the heaped rice that stands proud of the rim.
fillEllipse(figure, cx, rimY, R - 2, rimRy - 1, RICE)
const heapH = Math.round(R * 0.72)
for (let y = rimY - heapH; y <= rimY + rimRy * 0.4; y += 1) {
  const t = (y - (rimY - heapH)) / heapH
  const radius = R * 0.9 * Math.sqrt(Math.max(0, 1 - t * t))
  span(y, cx - radius, cx + radius, RICE)
}
// Soft shading down the right of the heap so it reads as volume.
for (let y = rimY - heapH; y <= rimY; y += 1) {
  const t = (y - (rimY - heapH)) / heapH
  const radius = R * 0.9 * Math.sqrt(Math.max(0, 1 - t * t))
  for (let k = 0; k < 6; k += 1) {
    blend(figure, Math.round(cx + radius - k * (R * 0.05)), y, RICE_SHADE, 0.16 - k * 0.02)
  }
}
for (let k = 0; k < 34; k += 1) {
  const angle = (k / 34) * Math.PI * 2
  const rad = 0.3 + ((k * 41) % 65) / 100
  const gx = Math.round(cx + Math.cos(angle) * R * 0.8 * rad)
  const gy = Math.round(rimY - heapH * 0.55 + Math.sin(angle) * heapH * 0.5 * rad)
  blend(figure, gx, gy, RICE_SHADE, 0.85)
  blend(figure, gx + 1, gy + 1, RICE_SHADE, 0.5)
}

// Rim: gold line over the boundary, plus a thin inner shadow.
ringEllipse(figure, cx, rimY, R, rimRy, 2.6, OUTLINE)
ringEllipse(figure, cx, rimY, R - 2.4, rimRy - 1.4, 1.6, GOLD)

// A few grains making their way to her mouth: over the dark bow they stay
// visible, and two sit at the corner of her mouth so the eating reads.
const mouthX = Math.round(w * 0.487)
const mouthY = Math.round(h * 0.15)
const startX = cx - Math.round(R * 0.18)
const startY = rimY - heapH * 0.7
const grainR = Math.max(5, Math.round(w * 0.019))
const grains = [
  [startX + (mouthX - startX) * 0.34, startY + (mouthY - startY) * 0.34 - h * 0.004],
  [startX + (mouthX - startX) * 0.55, startY + (mouthY - startY) * 0.55 - h * 0.008],
  [mouthX + w * 0.026, mouthY + h * 0.019],
  [mouthX - w * 0.024, mouthY + h * 0.021],
]
for (const [gxRaw, gyRaw, scale = 1] of grains) {
  const gx = Math.round(gxRaw)
  const gy = Math.round(gyRaw)
  const r = Math.max(4, Math.round(grainR * scale))
  fillEllipse(figure, gx, gy, r, Math.max(2, Math.round(r * 0.6)), RICE)
  ringEllipse(figure, gx, gy, r, Math.max(2, Math.round(r * 0.6)), 1.6, RICE_OUTLINE)
}

const out = resize(figure, maxSide)
fs.writeFileSync(process.argv[3], encodePng(out))
console.log(`figure ${w}x${h} -> ${out.width}x${out.height}, ${fs.statSync(process.argv[3]).size} bytes`)
console.log(`bowl cx=${cx} rim=${rimY} R=${R} depth=${depth}; mouth ${mouthX},${mouthY}`)
