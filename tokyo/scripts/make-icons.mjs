// Generates PNG app icons (white rounded square, vermilion circle) with no deps.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x + 0.5, y + 0.5)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ])
}
// Supersampled coverage for smooth edges.
function aa(fn, x, y) {
  let s = 0
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) s += fn(x - 0.375 + i * 0.25, y - 0.375 + j * 0.25) ? 1 : 0
  return s / 16
}
function icon(size, { rounded, pad }) {
  const r = size * 0.22, c = size / 2
  const inSquare = (x, y) => {
    if (!rounded) return true
    const dx = Math.max(Math.abs(x - c) - (c - r), 0), dy = Math.max(Math.abs(y - c) - (c - r), 0)
    return dx * dx + dy * dy <= r * r
  }
  const rad = size * (pad ? 0.19 : 0.23)
  const inCircle = (x, y) => (x - c) ** 2 + (y - c) ** 2 <= rad * rad
  return png(size, (x, y) => {
    const sq = aa(inSquare, x, y)
    if (sq === 0) return [0, 0, 0, 0]
    const ci = aa(inCircle, x, y)
    const r8 = Math.round(255 * (1 - ci) + 0xd5 * ci)
    const g8 = Math.round(255 * (1 - ci) + 0x32 * ci)
    const b8 = Math.round(255 * (1 - ci) + 0x2a * ci)
    return [r8, g8, b8, Math.round(255 * sq)]
  })
}
mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', icon(192, { rounded: true, pad: false }))
writeFileSync('public/icons/icon-512.png', icon(512, { rounded: true, pad: false }))
writeFileSync('public/icons/icon-512-maskable.png', icon(512, { rounded: false, pad: true }))
writeFileSync('public/icons/apple-touch-icon.png', icon(180, { rounded: false, pad: false }))
console.log('icons written')
