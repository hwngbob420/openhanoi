// Dựng lớp "người ngồi xe máy" (paper-doll) bằng claude-pxl, dùng lõi isometric của thế giới (không sửa gì của thế giới).
//   node tools/make_seated_art.mjs     -> assets/src/characters/out/sprites/seat_*.png
//   node tools/make_seated_art.mjs --preview   (thêm ảnh ghép thử vào assets/src/characters/_build_seat/preview)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'assets/src')
const PXL = path.join(process.env.USERPROFILE || process.env.HOME, '.claude/pixel-engines/claude-pxl/bin/pxl.js')
const pal = fs.readFileSync(path.join(root, 'palette/hanoi_palette.json'), 'utf8')
const read = (f) => fs.readFileSync(path.join(src, f), 'utf8')
const lib = ['lib/core.js', 'lib/vehicles.js', 'characters/seat_lib.js'].map(read).join('\n').replace('__PAL__', pal)
const { LAYOUT } = new Function(lib + '\n;return { LAYOUT, DRAW }')()

const HEAD = [['px', 'x', 1], ['nx', 'x', -1], ['py', 'y', 1], ['ny', 'y', -1]]
const BODY = ['#d93a2b', '#2f62c9', '#e8e2d0', '#23252b', '#e3a82c', '#2f8f59']            // giống catalog.mjs
const HAIRS = ['#2b2230', '#6e3d25', '#d5581f', '#6f909c']
const TOPS = [{ c: '#b8503a', long: 0 }, { c: '#ece6d6', long: 1 }, { c: '#3f6fb0', long: 1, hood: 1 }, { c: '#3a8f8a', long: 0 }]
const PANTS = ['#3d4c7a', '#363a42', '#b99d68']

const specs = []
const base = (h, axis, dir) => ({ kind: 'vehicle', axis, dir, L: 30, W: 10, H: 36, rider: 1 })
for (const [h, axis, dir] of HEAD) {
  BODY.forEach((col, i) => { for (const l of ['back', 'front']) specs.push({ name: `seat_bike${l}_${i}_${h}`, ...base(h, axis, dir), col, layer: l, pants: '#000', top: '#000', hair: '#000' }) })
  PANTS.forEach((p, i) => specs.push({ name: `seat_legs_${i}_${h}`, ...base(h, axis, dir), col: BODY[0], layer: 'legs', pants: p, top: '#000', hair: '#000' }))
  TOPS.forEach((t, i) => specs.push({ name: `seat_torso_${i}_${h}`, ...base(h, axis, dir), col: BODY[0], layer: 'torso', pants: '#000', top: t.c, long: t.long, hood: t.hood, hair: '#000' }))
  specs.push({ name: `seat_head_0_${h}`, ...base(h, axis, dir), col: BODY[0], layer: 'head', pants: '#000', top: '#000', hair: '#000' })
  HAIRS.forEach((hc, i) => specs.push({ name: `seat_hair_${i}_${h}`, ...base(h, axis, dir), col: BODY[0], layer: 'hair', pants: '#000', top: '#000', hair: hc }))
}
const prev = process.argv.includes('--preview')
if (prev) for (const [h, axis, dir] of HEAD) specs.push({ name: `seatall_${h}`, ...base(h, axis, dir), col: BODY[0], layer: 'all', pants: PANTS[0], top: TOPS[0].c, long: 0, hair: HAIRS[0], outlineAll: 0.5 })

let px = lib + '\n'
const meta = {}
for (const s of specs) {
  const L = LAYOUT.vehicle(s)
  meta[s.name] = { w: L.w, h: L.h, pivot: [L.px, L.py] }
  px += `sprite(${JSON.stringify(s.name)}, { w: ${L.w}, h: ${L.h} }, (c) => { const s = ${JSON.stringify(s)}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })\n`
}
const work = path.join(src, 'characters/_build_seat'); fs.mkdirSync(work, { recursive: true })
fs.writeFileSync(path.join(work, 'seat.px.js'), px)
execFileSync('node', [PXL, 'build', path.join(work, 'seat.px.js'), '--out', path.join(work, 'out'), '--no-preview'], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 28 })
const dest = path.join(src, 'characters/out/sprites'); fs.mkdirSync(dest, { recursive: true })
for (const s of specs) if (!s.name.startsWith('seatall')) fs.copyFileSync(path.join(work, 'out/sprites', s.name + '.png'), path.join(dest, s.name + '.png'))
fs.writeFileSync(path.join(src, 'characters/seat_meta.json'), JSON.stringify({ size: [44, 76], pivot: Object.fromEntries(HEAD.map(([h]) => [h, meta['seat_head_0_' + h].pivot])), note: 'cùng khung/pivot với mo_*_{px,nx,py,ny} của thế giới' }))
console.log(`đã dựng ${specs.length} sprite người ngồi xe`)
