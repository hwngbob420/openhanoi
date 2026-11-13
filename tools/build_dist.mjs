// Đóng gói game thành 1 file HTML tự chứa (ảnh nhúng base64) để chơi trên điện thoại / gửi đi.
//   node tools/build_dist.mjs  ->  dist/hanoi-pixel.html
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(path.join(root, p)).toString('base64')

const manifest = JSON.parse(rd('assets/world/manifest.json'))
const world = {}
for (const n of Object.keys(manifest.sprites)) world[n] = b64(`assets/world/${n}.png`)
const player = {}
for (const d of ['down', 'up', 'right']) for (let f = 0; f < 4; f++) player[`${d}_${f}`] = b64(`assets/player/pl_${d}_${f}.png`)

function must(src, old, neu) { if (!src.includes(old)) throw new Error('không tìm thấy đoạn cần thay: ' + old.slice(0, 60)); return src.replace(old, neu) }
let worldJs = rd('js/world.js')
worldJs = must(worldJs, "MAN = (await (await fetch('assets/world/manifest.json', { cache: 'no-cache' })).json()).sprites", 'MAN = window.__BUNDLE.manifest.sprites')
worldJs = must(worldJs, "i.src = 'assets/world/' + n + '.png?v=' + MAN_V", 'i.src = window.__BUNDLE.world[n]')
worldJs = must(worldJs, 'i.src = `assets/player/pl_${d}_${f}.png`', 'i.src = window.__BUNDLE.player[d + "_" + f]')
let playerJs = rd('js/player.js')
playerJs = must(playerJs, "im.src = 'assets/player/pl_' + dir + '_' + f + '.png'", "im.src = window.__BUNDLE.player[dir + '_' + f]")

let html = rd('index.html')
html = must(html, '<script src="js/player.js?v=8"></script>', `<script>window.__BUNDLE = ${JSON.stringify({ manifest, world, player })}</script>\n<script>\n${playerJs}\n</script>`)
html = must(html, '<script src="js/world.js?v=8"></script>', `<script>\n${worldJs}\n</script>`)
html = must(html, '<title>Hà Nội Pixel</title>', '<title>Hà Nội Pixel</title>\n<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#141824">')
fs.mkdirSync(path.join(root, 'dist'), { recursive: true })
const out = path.join(root, 'dist/hanoi-pixel.html')
fs.writeFileSync(out, html)
console.log(`đã tạo ${path.relative(root, out)}  ${(fs.statSync(out).size / 1048576).toFixed(2)} MB`)
