// Gom ảnh PNG (assets/world, assets/player) + manifest thành src/assets/world-bundle.js (base64) để game chạy 1 file.
//   npm run bundle   (chạy lại mỗi khi vẽ lại asset bằng tools/build_world_art.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(path.join(root, p)).toString('base64')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/world/manifest.json'), 'utf8'))
const world = {}
for (const n of Object.keys(manifest.sprites)) world[n] = b64(`assets/world/${n}.png`)
const player = {}
for (const d of ['down', 'up', 'right']) for (let f = 0; f < 4; f++) player[`${d}_${f}`] = b64(`assets/player/pl_${d}_${f}.png`)
const out = path.join(root, 'src/assets/world-bundle.js')
fs.writeFileSync(out, `// SINH TỰ ĐỘNG bởi tools/make_bundle.mjs — đừng sửa tay.\nwindow.__BUNDLE = ${JSON.stringify({ manifest, world, player })}\n`)
console.log(`đã tạo ${path.relative(root, out)}  ${(fs.statSync(out).size / 1048576).toFixed(2)} MB`)
