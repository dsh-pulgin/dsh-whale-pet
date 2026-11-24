/**
 * Drawing helpers layered on png-tools: supersampled polygons, rotated
 * ellipses and round-capped polyline strokes, all in straight alpha.
 */
const { blend } = require('./png-tools.cjs')

const SAMPLES = 4

/** Filled polygon with 4x4 supersampling per pixel. */
function fillPolygon(img, points, color) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const x0 = Math.max(0, Math.floor(Math.min(...xs)))
  const x1 = Math.min(img.width - 1, Math.ceil(Math.max(...xs)))
  const y0 = Math.max(0, Math.floor(Math.min(...ys)))
  const y1 = Math.min(img.height - 1, Math.ceil(Math.max(...ys)))
  const inside = (px, py) => {
    let hit = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i]
      const [xj, yj] = points[j]
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      let covered = 0
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          if (inside(x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES)) covered += 1
        }
      }
      if (covered > 0) blend(img, x, y, color, covered / (SAMPLES * SAMPLES))
    }
  }
}

/** Rotated filled ellipse. */
function fillEllipseRot(img, cx, cy, rx, ry, angle, color) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const reach = Math.max(rx, ry) + 2
  const x0 = Math.max(0, Math.floor(cx - reach))
  const x1 = Math.min(img.width - 1, Math.ceil(cx + reach))
  const y0 = Math.max(0, Math.floor(cy - reach))
  const y1 = Math.min(img.height - 1, Math.ceil(cy + reach))
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const lx = (dx * cos + dy * sin) / rx
      const ly = (-dx * sin + dy * cos) / ry
      const d = Math.sqrt(lx * lx + ly * ly) - 1
      const alpha = Math.max(0, Math.min(1, 0.5 - d * Math.min(rx, ry)))
      if (alpha > 0) blend(img, x, y, color, alpha)
    }
  }
}

/** Round-capped polyline through the given points. */
function strokePolyline(img, points, width, color) {
  const { strokeLine } = require('./png-tools.cjs')
  for (let i = 1; i < points.length; i += 1) {
    strokeLine(img, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], width, color)
  }
  for (const [x, y] of points) {
    require('./png-tools.cjs').fillEllipse(img, x, y, width / 2, width / 2, color)
  }
}

/** Frilled band: a row of circles following a quadratic curve. */
function frillBand(img, from, control, to, count, radius, color, edge) {
  for (let i = 0; i <= count; i += 1) {
    const t = i / count
    const x = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * control[0] + t * t * to[0]
    const y = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * control[1] + t * t * to[1]
    require('./png-tools.cjs').fillEllipse(img, x, y, radius, radius, color)
    if (edge !== undefined) require('./png-tools.cjs').ringEllipse(img, x, y, radius, radius, 2.2, edge)
  }
}

module.exports = { fillPolygon, fillEllipseRot, strokePolyline, frillBand }
