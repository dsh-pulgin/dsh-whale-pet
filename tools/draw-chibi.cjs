/**
 * Draw the Q-version "sneaking a bowl of rice" working pose — original artwork.
 * Sticker-style chibi with a consistent outline layer.
 * Run: node draw-chibi.cjs <out.png> [maxSide]
 */
const fs = require('node:fs')
const { encodePng, resize, fillEllipse, ringEllipse, blend } = require('./png-tools.cjs')
const { fillPolygon, fillEllipseRot, strokePolyline, frillBand } = require('./draw-tools.cjs')

const SIZE = 640
const canvas = { width: SIZE, height: SIZE, data: Buffer.alloc(SIZE * SIZE * 4) }

const HAIR = [84, 116, 178, 255]
const HAIR_DARK = [64, 90, 144, 255]
const HAIR_LIGHT = [124, 157, 214, 255]
const SKIN = [253, 234, 222, 255]
const SKIN_LINE = [214, 160, 143, 255]
const NAVY = [55, 68, 100, 255]
const NAVY_DARK = [40, 50, 74, 255]
const WHITE = [250, 247, 240, 255]
const WHITE_LINE = [188, 180, 166, 255]
const GOLD = [206, 170, 104, 255]
const IRIS = [79, 126, 204, 255]
const PUPIL = [28, 42, 72, 255]
const LINE = [38, 47, 72, 255]
const BLUSH = [243, 160, 160, 255]
const MOUTH = [168, 74, 82, 255]
const RICE = [253, 251, 245, 255]
const RICE_SHADE = [216, 207, 188, 255]
const BOWL = [178, 72, 66, 255]
const BOWL_LINE = [122, 45, 42, 255]
const TAIL = [70, 88, 130, 255]

const e = (x, y, rx, ry, c) => fillEllipse(canvas, x, y, rx, ry, c)
const ring = (x, y, rx, ry, w, c) => ringEllipse(canvas, x, y, rx, ry, w, c)
const poly = (pts, c) => fillPolygon(canvas, pts, c)
const line = (pts, w, c) => strokePolyline(canvas, pts, w, c)

/** Ellipse with a rim of `stroke` colour around it. */
const oe = (x, y, rx, ry, fill, stroke, width = 5) => {
  e(x, y, rx + width / 2, ry + width / 2, stroke)
  e(x, y, rx, ry, fill)
}
/** Closed polygon with a stroked edge. */
const op = (pts, fill, stroke, width = 5) => {
  line([...pts, pts[0]], width, stroke)
  poly(pts, fill)
}
const spanFill = (y, x0, x1, color) => {
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x += 1) {
    const alpha = Math.max(0, Math.min(1, Math.min(x + 1 - x0, x1 - x)))
    if (alpha > 0) blend(canvas, x, y, color, alpha)
  }
}

// --------------------------------------------------------------- back hair
oe(320, 244, 166, 158, HAIR_DARK, LINE, 6)
op([[156, 250], [200, 236], [188, 436], [146, 452]], HAIR_DARK, LINE)
op([[484, 250], [440, 236], [452, 436], [494, 452]], HAIR_DARK, LINE)

// Whale tail, two lobes behind her.
fillEllipseRot(canvas, 470, 476, 46, 22, -0.5, TAIL)
fillEllipseRot(canvas, 508, 448, 40, 20, -0.9, TAIL)
e(470, 476, 46, 22, TAIL)
line([[470, 480], [500, 460]], 5, LINE)

// -------------------------------------------------------------------- body
op([[264, 386], [376, 386], [420, 528], [220, 528]], NAVY, LINE, 6)
oe(232, 522, 24, 18, NAVY, LINE, 5)
oe(408, 522, 24, 18, NAVY, LINE, 5)
oe(246, 408, 38, 40, NAVY, LINE, 5)
oe(394, 408, 38, 40, NAVY, LINE, 5)
// apron
op([[292, 404], [348, 404], [368, 520], [272, 520]], WHITE, WHITE_LINE, 4)
oe(274, 516, 18, 12, WHITE, WHITE_LINE, 4)
oe(366, 516, 18, 12, WHITE, WHITE_LINE, 4)
line([[296, 448], [344, 448]], 3, GOLD)
// arms
line([[252, 432], [236, 462]], 20, NAVY)
line([[388, 432], [404, 462]], 20, NAVY)
// feet
oe(288, 540, 18, 9, WHITE, WHITE_LINE, 3)
oe(352, 540, 18, 9, WHITE, WHITE_LINE, 3)
oe(288, 556, 25, 14, NAVY, LINE, 4)
oe(352, 556, 25, 14, NAVY, LINE, 4)

// ---------------------------------------------------- long hair in front
op([[200, 216], [236, 212], [226, 444], [190, 458]], HAIR, LINE)
op([[440, 216], [404, 212], [414, 444], [450, 458]], HAIR, LINE)
line([[204, 254], [198, 428]], 3, HAIR_LIGHT)
line([[436, 254], [442, 428]], 3, HAIR_LIGHT)

// -------------------------------------------------------------------- head
oe(320, 268, 116, 108, SKIN, SKIN_LINE, 5)
// bangs: a rounded cap with three strand tips, leaving the eyes clear
op(
  [[204, 214], [212, 154], [266, 124], [320, 118], [374, 124], [428, 154], [436, 214],
    [404, 204], [384, 232], [356, 196], [320, 228], [284, 196], [256, 232], [236, 204]],
  HAIR,
  LINE,
  5,
)
line([[240, 168], [262, 146]], 4, HAIR_LIGHT)
// ahoge
line([[330, 110], [366, 86], [352, 58]], 12, LINE)
line([[330, 110], [366, 86], [352, 58]], 7, HAIR)
// fin ears
op([[200, 240], [132, 282], [202, 310]], HAIR, LINE, 5)
op([[440, 240], [508, 282], [438, 310]], HAIR, LINE, 5)
poly([[196, 258], [160, 280], [198, 294]], HAIR_LIGHT)
poly([[444, 258], [480, 280], [442, 294]], HAIR_LIGHT)
// frilled headband
frillBand(canvas, [212, 146], [320, 78], [428, 146], 8, 26, WHITE_LINE)
frillBand(canvas, [212, 146], [320, 82], [428, 146], 8, 22, WHITE)
// side bow
fillEllipseRot(canvas, 442, 176, 22, 14, -0.5, LINE)
fillEllipseRot(canvas, 442, 176, 22, 14, 0.5, LINE)
fillEllipseRot(canvas, 442, 176, 18, 11, -0.5, HAIR_LIGHT)
fillEllipseRot(canvas, 442, 176, 18, 11, 0.5, HAIR_LIGHT)
oe(442, 176, 9, 9, GOLD, LINE, 3)

// eyes: big and round with soft lashes
for (const cx of [276, 364]) {
  e(cx, 296, 34, 40, WHITE)
  e(cx, 300, 27, 33, IRIS)
  e(cx - 2, 304, 17, 22, PUPIL)
  e(cx - 9, 284, 10, 10, [255, 255, 255, 255])
  e(cx + 8, 314, 5, 5, [255, 255, 255, 205])
  e(cx - 1, 326, 12, 4, [190, 212, 244, 180])
  const outer = cx < 320 ? -1 : 1
  line([[cx - 28 * outer, 272], [cx - 8 * outer, 262], [cx + 16 * outer, 264], [cx + 30 * outer, 274]], 6, LINE)
}
// brows stay off: chibi faces read friendlier without them
// mouth and blush
oe(320, 342, 9, 11, MOUTH, LINE, 3)
e(320, 346, 6, 5, [206, 112, 116, 255])
e(214, 320, 28, 13, [243, 160, 160, 165])
e(426, 320, 28, 13, [243, 160, 160, 165])

// --------------------------------------------------------------------- bowl
const bcx = 320
const rimY = 468
const R = 84
const rimRy = 24
const depth = 50
for (let y = rimY; y <= rimY + depth; y += 1) {
  const t = (y - rimY) / depth
  const radius = R * (1 - 0.24 * t * t)
  const tone = [Math.round(BOWL[0] - 26 * t), Math.round(BOWL[1] - 18 * t), Math.round(BOWL[2] - 16 * t)]
  spanFill(y, bcx - radius, bcx + radius, [...tone, 255])
}
line([[bcx - R + 8, rimY + 1], [bcx - R * 0.74, rimY + depth]], 4, BOWL_LINE)
line([[bcx + R - 8, rimY + 1], [bcx + R * 0.74, rimY + depth]], 4, BOWL_LINE)
e(bcx, rimY + depth, 34, 9, BOWL_LINE)
// rice heap
const heap = 40
for (let y = rimY - heap; y <= rimY + 4; y += 1) {
  const t = (y - (rimY - heap)) / heap
  const radius = R * 0.92 * Math.sqrt(Math.max(0, 1 - t * t))
  spanFill(y, bcx - radius, bcx + radius, RICE)
}
for (let k = 0; k < 26; k += 1) {
  const angle = (k / 26) * Math.PI * 2
  const rad = 0.3 + ((k * 37) % 60) / 100
  e(bcx + Math.cos(angle) * R * 0.76 * rad, rimY - 18 + Math.sin(angle) * 22 * rad, 4, 3, RICE_SHADE)
}
// rim
e(bcx, rimY, R, rimRy, RICE)
ring(bcx, rimY, R, rimRy, 4, LINE)
ring(bcx, rimY, R - 3, rimRy - 1.5, 2, GOLD)
// hands on the rim
for (const hx of [234, 406]) {
  oe(hx, rimY + 6, 21, 17, SKIN, SKIN_LINE, 4)
}

// chopsticks in her right hand, lifted toward her mouth with a rice clump
line([[404, 470], [356, 398]], 6, LINE)
line([[404, 470], [356, 398]], 3.5, [126, 92, 62, 255])
line([[412, 464], [366, 392]], 6, LINE)
line([[412, 464], [366, 392]], 3.5, [126, 92, 62, 255])
e(360, 396, 13, 10, RICE)
ring(360, 396, 13, 10, 1.8, [150, 140, 120, 200])
e(348, 386, 6, 4, RICE)
e(372, 388, 5, 4, RICE)
// right hand in front of the sticks' grip
oe(406, rimY + 6, 21, 17, SKIN, SKIN_LINE, 4)

// rice crumbs between the bowl and her mouth
for (const [gx, gy] of [[300, 392], [286, 372], [336, 384]]) {
  e(gx, gy, 8, 5, RICE)
  ring(gx, gy, 8, 5, 1.4, [150, 140, 120, 190])
}

const out = resize(canvas, Number(process.argv[3] ?? 320))
fs.writeFileSync(process.argv[2], encodePng(out))
console.log(`drawn ${SIZE}x${SIZE} -> ${out.width}x${out.height}, ${fs.statSync(process.argv[2]).size} bytes`)
