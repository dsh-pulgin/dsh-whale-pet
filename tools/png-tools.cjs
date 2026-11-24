/**
 * Shared PNG decode/encode + light drawing helpers for preparing pet artwork.
 * Node standard library only.
 */
const fs = require('node:fs')
const zlib = require('node:zlib')

function decodePng(file) {
  const buf = fs.readFileSync(file)
  let off = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`${file}: unsupported PNG (depth=${bitDepth} color=${colorType} interlace=${interlace})`)
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const channels = colorType === 6 ? 4 : 3
  const stride = width * channels
  const out = Buffer.alloc(width * height * 4)
  let pos = 0
  let prevLine = null
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos]
    pos += 1
    const line = Buffer.from(raw.subarray(pos, pos + stride))
    pos += stride
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? line[x - channels] : 0
      const b = prevLine === null ? 0 : prevLine[x]
      const c = prevLine !== null && x >= channels ? prevLine[x - channels] : 0
      let value = line[x]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      line[x] = value & 0xff
    }
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4
      if (channels === 4) {
        out[o] = line[x * 4]
        out[o + 1] = line[x * 4 + 1]
        out[o + 2] = line[x * 4 + 2]
        out[o + 3] = line[x * 4 + 3]
      } else {
        out[o] = line[x * 3]
        out[o + 1] = line[x * 3 + 1]
        out[o + 2] = line[x * 3 + 2]
        out[o + 3] = 255
      }
    }
    prevLine = line
  }
  return { width, height, data: out }
}

/** Adaptive-filter PNG encode of an RGBA buffer. */
function encodePng({ width, height, data }) {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  const crc32 = (bytes) => {
    let c = 0xffffffff
    for (const byte of bytes) c = table[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, payload) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(payload.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), payload])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = width * 4
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y += 1) {
    const row = y * stride
    let best = null
    let bestScore = Infinity
    for (const filter of [0, 1, 2, 3, 4]) {
      const line = Buffer.alloc(stride + 1)
      line[0] = filter
      let score = 0
      for (let x = 0; x < stride; x += 1) {
        const value = data[row + x]
        const a = x >= 4 ? data[row + x - 4] : 0
        const b = y > 0 ? data[row - stride + x] : 0
        const c = y > 0 && x >= 4 ? data[row - stride + x - 4] : 0
        let predicted = 0
        if (filter === 1) predicted = a
        else if (filter === 2) predicted = b
        else if (filter === 3) predicted = (a + b) >> 1
        else if (filter === 4) {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          predicted = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
        }
        const residual = (value - predicted) & 0xff
        line[x + 1] = residual
        score += residual < 128 ? residual : 256 - residual
      }
      if (score < bestScore) {
        bestScore = score
        best = line
      }
    }
    best.copy(raw, y * (stride + 1))
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function contentBox(img, threshold = 16) {
  let minX = img.width
  let minY = img.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { minX, minY, maxX, maxY }
}

function crop(img, box) {
  const width = box.maxX - box.minX + 1
  const height = box.maxY - box.minY + 1
  const data = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    const from = ((box.minY + y) * img.width + box.minX) * 4
    img.data.copy(data, y * width * 4, from, from + width * 4)
  }
  return { width, height, data }
}

/** Premultiplied box-filter downscale. */
function resize(img, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const outW = Math.max(1, Math.round(img.width * scale))
  const outH = Math.max(1, Math.round(img.height * scale))
  const out = Buffer.alloc(outW * outH * 4)
  for (let y = 0; y < outH; y += 1) {
    const sy0 = Math.floor((y * img.height) / outH)
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * img.height) / outH))
    for (let x = 0; x < outW; x += 1) {
      const sx0 = Math.floor((x * img.width) / outW)
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * img.width) / outW))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let weight = 0
      for (let sy = sy0; sy < sy1; sy += 1) {
        for (let sx = sx0; sx < sx1; sx += 1) {
          const i = (sy * img.width + sx) * 4
          const alpha = img.data[i + 3]
          r += img.data[i] * alpha
          g += img.data[i + 1] * alpha
          b += img.data[i + 2] * alpha
          a += alpha
          weight += 1
        }
      }
      const o = (y * outW + x) * 4
      if (a > 0) {
        out[o] = Math.round(r / a)
        out[o + 1] = Math.round(g / a)
        out[o + 2] = Math.round(b / a)
      }
      out[o + 3] = Math.round(a / weight)
    }
  }
  return { width: outW, height: outH, data: out }
}

/** Paint one RGBA colour with coverage `alpha` over pixel (x, y). */
function blend(img, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height || alpha <= 0) return
  const i = (y * img.width + x) * 4
  const dstA = img.data[i + 3] / 255
  const srcA = Math.min(1, alpha) * (color[3] === undefined ? 1 : color[3] / 255)
  const outA = srcA + dstA * (1 - srcA)
  if (outA <= 0) return
  for (let c = 0; c < 3; c += 1) {
    img.data[i + c] = Math.round((color[c] * srcA + img.data[i + c] * dstA * (1 - srcA)) / outA)
  }
  img.data[i + 3] = Math.round(outA * 255)
}

/** Anti-aliased filled ellipse. */
function fillEllipse(img, cx, cy, rx, ry, color) {
  const x0 = Math.max(0, Math.floor(cx - rx - 1))
  const x1 = Math.min(img.width - 1, Math.ceil(cx + rx + 1))
  const y0 = Math.max(0, Math.floor(cy - ry - 1))
  const y1 = Math.min(img.height - 1, Math.ceil(cy + ry + 1))
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      const d = Math.sqrt(dx * dx + dy * dy) - 1
      const alpha = Math.max(0, Math.min(1, 0.5 - (d * Math.min(rx, ry))))
      if (alpha > 0) blend(img, x, y, color, alpha)
    }
  }
}

/** Anti-aliased thick line segment. */
function strokeLine(img, ax, ay, bx, by, width, color) {
  const radius = width / 2
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - radius - 1))
  const x1 = Math.min(img.width - 1, Math.ceil(Math.max(ax, bx) + radius + 1))
  const y0 = Math.max(0, Math.floor(Math.min(ay, by) - radius - 1))
  const y1 = Math.min(img.height - 1, Math.ceil(Math.max(ay, by) + radius + 1))
  const vx = bx - ax
  const vy = by - ay
  const lenSq = vx * vx + vy * vy || 1
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / lenSq))
      const ex = px - (ax + vx * t)
      const ey = py - (ay + vy * t)
      const dist = Math.sqrt(ex * ex + ey * ey) - radius
      const alpha = Math.max(0, Math.min(1, 0.5 - dist))
      if (alpha > 0) blend(img, x, y, color, alpha)
    }
  }
}

/** Anti-aliased elliptical ring (rim outline). */
function ringEllipse(img, cx, cy, rx, ry, width, color) {
  const x0 = Math.max(0, Math.floor(cx - rx - width))
  const x1 = Math.min(img.width - 1, Math.ceil(cx + rx + width))
  const y0 = Math.max(0, Math.floor(cy - ry - width))
  const y1 = Math.min(img.height - 1, Math.ceil(cy + ry + width))
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      const d = (Math.sqrt(dx * dx + dy * dy) - 1) * Math.min(rx, ry)
      const alpha = Math.max(0, Math.min(1, width / 2 - Math.abs(d)))
      if (alpha > 0) blend(img, x, y, color, alpha)
    }
  }
}

module.exports = { decodePng, encodePng, contentBox, crop, resize, blend, fillEllipse, strokeLine, ringEllipse }
