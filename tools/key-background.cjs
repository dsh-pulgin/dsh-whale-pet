/**
 * Key the white backdrop out of the uploaded artwork, feather the edge, and
 * write the pet asset. Verifies the result over dark and light backgrounds.
 * Run: node key-background.cjs <in.png> <out.png> [maxSide] [tol]
 */
const fs = require('node:fs')
const { decodePng, encodePng, contentBox, crop, resize } = require('./png-tools.cjs')

const img = decodePng(process.argv[2])
const maxSide = Number(process.argv[4] ?? 320)
const tol = Number(process.argv[5] ?? 36)
const { width, height, data } = img

const nearWhite = (p) => {
  const i = p * 4
  return Math.min(data[i], data[i + 1], data[i + 2]) >= 255 - tol
}

const mask = new Uint8Array(width * height) // 1 = background
const queue = []
const seed = (x, y) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return
  const p = y * width + x
  if (mask[p] === 1 || !nearWhite(p)) return
  mask[p] = 1
  queue.push(p)
}
for (let x = 0; x < width; x += 1) {
  seed(x, 0)
  seed(x, height - 1)
}
for (let y = 0; y < height; y += 1) {
  seed(0, y)
  seed(width - 1, y)
}
while (queue.length > 0) {
  const p = queue.pop()
  const x = p % width
  const y = (p - x) / width
  seed(x + 1, y)
  seed(x - 1, y)
  seed(x, y + 1)
  seed(x, y - 1)
}
let filled = 0
for (let p = 0; p < mask.length; p += 1) if (mask[p] === 1) filled += 1
console.log(`background ${filled} px (${((filled / (width * height)) * 100).toFixed(1)}%) at tol=${tol}`)

// Alpha: 0 on the background, then erode one pixel so the anti-aliased
// white rim of the artwork disappears instead of forming a halo.
const alpha = new Uint8Array(width * height)
for (let p = 0; p < alpha.length; p += 1) alpha[p] = mask[p] === 1 ? 0 : 255
const eroded = Uint8Array.from(alpha)
for (let y = 1; y < height - 1; y += 1) {
  for (let x = 1; x < width - 1; x += 1) {
    const p = y * width + x
    if (alpha[p] === 0) continue
    let touchesBackground = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      if (mask[(y + dy) * width + (x + dx)] === 1) touchesBackground = true
    }
    if (touchesBackground) eroded[p] = 0
  }
}

// One-pixel box blur of the alpha channel smooths the cut edge.
const smooth = Uint8Array.from(eroded)
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    let sum = 0
    let count = 0
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        sum += eroded[ny * width + nx]
        count += 1
      }
    }
    smooth[y * width + x] = Math.round(sum / count)
  }
}
for (let p = 0; p < smooth.length; p += 1) data[p * 4 + 3] = smooth[p]

// Optional: fade the bottom edge out, for artwork that is cut off there.
const fadeRatio = Number(process.env.FADE_BOTTOM ?? 0)
if (fadeRatio > 0) {
  const fadeRows = Math.max(4, Math.round(height * fadeRatio))
  for (let y = height - fadeRows; y < height; y += 1) {
    const t = (y - (height - fadeRows)) / fadeRows
    const factor = Math.max(0, 1 - t * t)
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x
      data[p * 4 + 3] = Math.round((data[p * 4 + 3] * factor) / 1)
    }
  }
  console.log(`bottom fade over ${fadeRows} rows`)
}

// Report how much of the interior white survived.
const at = (x, y) => data[(y * width + x) * 4 + 3]
for (const [x, y, label] of [[420, 560, 'apron'], [400, 120, 'headband'], [110, 500, 'rice bowl'], [560, 800, 'rice pile'], [430, 300, 'hair']]) {
  console.log(`  alpha ${label.padEnd(12)} ${at(x, y)}`)
}

const out = resize(crop(img, contentBox(img, 24)), maxSide)
fs.writeFileSync(process.argv[3], encodePng(out))
console.log(`asset ${out.width}x${out.height}, ${fs.statSync(process.argv[3]).size} bytes`)

// Preview sheets over dark and light backgrounds for halo checking.
for (const [name, bg] of [['dark', [32, 36, 44, 255]], ['light', [236, 238, 242, 255]]]) {
  const sheet = { width: out.width, height: out.height, data: Buffer.alloc(out.width * out.height * 4) }
  for (let p = 0; p < out.width * out.height; p += 1) sheet.data.set(bg, p * 4)
  for (let p = 0; p < out.width * out.height; p += 1) {
    const a = out.data[p * 4 + 3] / 255
    if (a === 0) continue
    for (let c = 0; c < 3; c += 1) {
      sheet.data[p * 4 + c] = Math.round(out.data[p * 4 + c] * a + bg[c] * (1 - a))
    }
  }
  const file = process.argv[3].replace(/\.png$/, `-on-${name}.png`)
  fs.writeFileSync(file, encodePng(sheet))
  console.log(`preview ${file}`)
}
