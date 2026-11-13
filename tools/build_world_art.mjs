// Dựng toàn bộ asset thế giới bằng claude-pxl.
//   node tools/build_world_art.mjs [--only tiền_tố] [--keep]
// Danh mục nằm ở assets/src/catalog.mjs; thư viện vẽ ở assets/src/lib/*.js (ghép lại thành 1 file .px.js).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'assets/src'), outDir = path.join(root, 'assets/world')
const PXL = path.join(process.env.USERPROFILE || process.env.HOME, '.claude/pixel-engines/claude-pxl/bin/pxl.js')
const args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

const pal = fs.readFileSync(path.join(root, 'palette/hanoi_palette.json'), 'utf8')
const libFiles = ['core', 'ground', 'nature', 'buildings', 'landmarks', 'vehicles', 'props'].filter((f) => fs.existsSync(path.join(srcDir, 'lib', f + '.js')))
const lib = libFiles.map((f) => fs.readFileSync(path.join(srcDir, 'lib', f + '.js'), 'utf8')).join('\n').replace('__PAL__', pal)
const { LAYOUT } = new Function(lib + '\n;return { LAYOUT, DRAW }')()

const { specs } = await import(pathToFileURL(path.join(srcDir, 'catalog.mjs')).href + '?t=' + Date.now())
let list = specs()
const names = new Set(); for (const s of list) { if (names.has(s.name)) throw new Error('trùng tên ' + s.name); names.add(s.name) }
if (only) list = list.filter((s) => s.name.startsWith(only))

const manifest = {}
let px = lib + '\n'
for (const s of list) {
  if (!LAYOUT[s.kind]) throw new Error('chưa có LAYOUT.' + s.kind + ' cho ' + s.name)
  const L = LAYOUT[s.kind](s)
  manifest[s.name] = { w: L.w, h: L.h, pivot: [L.px, L.py], fp: L.fp || null, kind: s.kind, group: s.group || null, ...(s.meta || {}) }
  px += `sprite(${JSON.stringify(s.name)}, { w: ${L.w}, h: ${L.h} }, (c) => { const s = ${JSON.stringify(s)}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })\n`
}
const work = path.join(srcDir, '_build'); fs.mkdirSync(work, { recursive: true })
fs.writeFileSync(path.join(work, 'world.px.js'), px)
execFileSync('node', [PXL, 'build', path.join(work, 'world.px.js'), '--out', path.join(work, 'out'), '--no-preview'], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 28 })

fs.mkdirSync(outDir, { recursive: true })
if (!only) for (const f of fs.readdirSync(outDir)) if (f.endsWith('.png')) fs.unlinkSync(path.join(outDir, f))
for (const s of list) fs.copyFileSync(path.join(work, 'out/sprites', s.name + '.png'), path.join(outDir, s.name + '.png'))
const mpath = path.join(outDir, 'manifest.json')
const prev = only && fs.existsSync(mpath) ? JSON.parse(fs.readFileSync(mpath, 'utf8')) : {}
fs.writeFileSync(mpath, JSON.stringify({ tile: [72, 36], sprites: { ...prev, ...manifest } }, null, 1))
console.log(`đã dựng ${list.length} sprite -> ${path.relative(root, outDir)}`)
