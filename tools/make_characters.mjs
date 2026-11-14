// Gom PNG lớp nhân vật + VFX thành src/assets/characters/layers-bundle.js (base64) để game build ra 1 file.
//   node tools/make_characters.mjs
// Nguồn: assets/src/characters/out/sprites/ch_*.png (từ layers.px.js), seat_*.png (từ seated.px.js),
//        assets/src/characters/vfx/*.png (khói phở, mưa: tools/make_vfx.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64')
const take = (dir, re) => {
  const o = {}
  if (!fs.existsSync(dir)) return o
  for (const f of fs.readdirSync(dir).sort()) if (re.test(f)) o[f.replace(/\.png$/, '')] = b64(path.join(dir, f))
  return o
}
const layers = take(path.join(root, 'assets/src/characters/out/sprites'), /^(ch|seat)_.*\.png$/)
const vfx = take(path.join(root, 'assets/src/characters/vfx'), /\.png$/)
let vfxMeta = {}
const metaPath = path.join(root, 'assets/src/characters/vfx/meta.json')
if (fs.existsSync(metaPath)) vfxMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
const outFile = path.join(root, 'src/assets/characters/layers-bundle.js')
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, `// SINH TỰ ĐỘNG bởi tools/make_characters.mjs — đừng sửa tay.\nexport default ${JSON.stringify({ layers, vfx, vfxMeta })}\n`)
console.log(`đã tạo ${path.relative(root, outFile)}: ${Object.keys(layers).length} lớp, ${Object.keys(vfx).length} vfx, ${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`)
