#!/usr/bin/env node
// Generates build/icon.png (512x512) and build/icon.ico (256x256 embedded) --
// a rounded-square indigo/violet gradient with a bold checkmark, drawn as an
// anti-aliased signed-distance field. Pure-JS PNG via raw DEFLATE -- no
// image-library dependency needed.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const BUILD_DIR = path.join(__dirname, '..', 'build')
if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true })

// ── PNG helpers ────────────────────────────────────────────────────────────

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
      t[i] = c
    }
    return t
  })())
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([t, data])
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, checksum])
}

// ── Signed-distance-field drawing helpers ─────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function mix(a, b, t) { return a + (b - a) * t }
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

// Distance from (px, py) to a rounded square of half-size h centered at origin
function sdRoundedBox(px, py, h, radius) {
  const qx = Math.abs(px) - h + radius
  const qy = Math.abs(py) - h + radius
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius
}

// Distance from (px, py) to the segment (ax,ay)-(bx,by)
function sdSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay
  const apx = px - ax, apy = py - ay
  const t = clamp((apx * abx + apy * aby) / (abx * abx + aby * aby), 0, 1)
  const cx = ax + abx * t, cy = ay + aby * t
  return Math.hypot(px - cx, py - cy)
}

function makeIcon(size) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  const rowSize = 1 + size * 4

  const half = size / 2
  const radius = size * 0.22
  const checkThickness = size * 0.085
  // Checkmark vertices, centered on the icon (0,0) origin
  const p0 = { x: -size * 0.20, y: size * 0.02 }
  const p1 = { x: -size * 0.045, y: size * 0.16 }
  const p2 = { x: size * 0.24, y: -size * 0.16 }

  // Gradient endpoints (indigo-500 -> violet-600), sampled along the diagonal
  const c1 = [99, 102, 241]   // #6366f1
  const c2 = [124, 58, 237]   // #7c3aed

  const AA = 1.2 // anti-alias band width in pixels

  for (let y = 0; y < size; y++) {
    const py = y - half + 0.5
    const rowOff = y * rowSize
    raw[rowOff] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const px = x - half + 0.5
      const off = rowOff + 1 + x * 4

      const boxDist = sdRoundedBox(px, py, half, radius)
      const boxAlpha = clamp(0.5 - boxDist / AA, 0, 1)

      // Diagonal gradient (top-left lighter -> bottom-right deeper)
      const t = clamp((px + py) / size + 0.5, 0, 1)
      let r = mix(c1[0], c2[0], t)
      let g = mix(c1[1], c2[1], t)
      let b = mix(c1[2], c2[2], t)

      // Checkmark: min distance to the two segments, minus half-thickness
      const d0 = sdSegment(px, py, p0.x, p0.y, p1.x, p1.y)
      const d1 = sdSegment(px, py, p1.x, p1.y, p2.x, p2.y)
      const checkDist = Math.min(d0, d1) - checkThickness / 2
      const checkAlpha = clamp(0.5 - checkDist / AA, 0, 1)

      // Composite white checkmark over the gradient background
      r = mix(r, 255, checkAlpha)
      g = mix(g, 255, checkAlpha)
      b = mix(b, 255, checkAlpha)

      raw[off] = Math.round(r)
      raw[off + 1] = Math.round(g)
      raw[off + 2] = Math.round(b)
      raw[off + 3] = Math.round(boxAlpha * 255)
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // bit depth 8, RGBA

  const idat = zlib.deflateSync(raw, { level: 9 })
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Generate PNG icons ─────────────────────────────────────────────────────

const png512 = makeIcon(512)
fs.writeFileSync(path.join(BUILD_DIR, 'icon.png'), png512)
console.log('✓ build/icon.png (512x512)')

const png256 = makeIcon(256)

// ── Minimal ICO (256x256 PNG embedded) ────────────────────────────────────
// ICO format: ICONDIR + ICONDIRENTRY + raw PNG data (modern ICO supports PNG)

function makeIco(pngBuf) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)   // reserved
  header.writeUInt16LE(1, 2)   // type: ICO
  header.writeUInt16LE(1, 4)   // count: 1 image

  const entry = Buffer.alloc(16)
  entry[0] = 0   // width  0 = 256
  entry[1] = 0   // height 0 = 256
  entry[2] = 0   // color count
  entry[3] = 0   // reserved
  entry.writeUInt16LE(1, 4)   // planes
  entry.writeUInt16LE(32, 6)  // bit count
  entry.writeUInt32LE(pngBuf.length, 8)   // data size
  entry.writeUInt32LE(6 + 16, 12)         // data offset (header + 1 entry)

  return Buffer.concat([header, entry, pngBuf])
}

const ico = makeIco(png256)
fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), ico)
console.log('✓ build/icon.ico (256x256 PNG-in-ICO)')

console.log('Icons ready in build/')
