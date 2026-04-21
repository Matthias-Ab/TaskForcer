#!/usr/bin/env node
// Generates build/icon.png (512x512) and build/icon.ico (256x256 embedded)
// Pure-JS PNG via raw DEFLATE — no extra deps required.
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

function makePng(size, r, g, b) {
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // bit depth 8, RGB

  // Raw pixel rows: filter byte 0 + RGB * size
  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(size * rowSize)
  for (let y = 0; y < size; y++) {
    const off = y * rowSize
    raw[off] = 0 // filter none
    for (let x = 0; x < size; x++) {
      // Draw a rounded-ish indigo square with a simple "T" letter hint
      const px = off + 1 + x * 3
      // background
      let pr = r, pg = g, pb = b
      // slightly lighter center logo area
      const cx = Math.abs(x - size / 2), cy = Math.abs(y - size / 2)
      if (cx < size * 0.28 && cy < size * 0.28) {
        pr = Math.min(255, r + 40); pg = Math.min(255, g + 40); pb = Math.min(255, b + 40)
      }
      raw[px] = pr; raw[px + 1] = pg; raw[px + 2] = pb
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 })

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Generate PNG icons ─────────────────────────────────────────────────────

const [R, G, B] = [99, 102, 241]   // indigo-500

const png512 = makePng(512, R, G, B)
fs.writeFileSync(path.join(BUILD_DIR, 'icon.png'), png512)
console.log('✓ build/icon.png (512x512)')

const png256 = makePng(256, R, G, B)
fs.writeFileSync(path.join(BUILD_DIR, 'icon256.png'), png256)

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

// Cleanup temp file
fs.unlinkSync(path.join(BUILD_DIR, 'icon256.png'))
console.log('Icons ready in build/')
