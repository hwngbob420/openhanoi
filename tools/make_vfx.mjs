// Dựng VFX bằng Pixelbolt: khói nồi phở (6 khung lặp, 16x24) và mưa rào (ô lát 64x64, 4 khung lặp, ghép được như gạch).
//   node tools/make_vfx.mjs   -> assets/src/characters/vfx/{pho_steam.png, rain.png, meta.json} + recipe .json trong vfx_src/
// Sau đó chạy: node tools/make_characters.mjs để nhúng vào layers-bundle.js
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'assets/src/characters/vfx_src'), outDir = path.join(root, 'assets/src/characters/vfx')
fs.mkdirSync(srcDir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true })
const PB = path.join(process.env.USERPROFILE || process.env.HOME, '.claude/pixel-engines/Pixelbolt/bin/pixelbolt.js')
const run = (...a) => execFileSync('node', [PB, ...a], { encoding: 'utf8', maxBuffer: 1 << 26 })

// ---------- khói phở: 3 cụm khói bay lên theo đường lượn, lệch pha 1/3 chu kỳ => lặp liền mạch ----------
{
  const W = 16, H = 24, F = 6, PUFFS = 6
  const frames = []
  for (let f = 0; f < F; f++) {
    const ops = []
    const puffs = []
    for (let i = 0; i < PUFFS; i++) {
      const ph = ((f / F) + i / PUFFS) % 1                         // 0 = vừa bốc lên, 1 = tan
      const y = 21 - ph * 19
      const x = 8 + Math.sin(ph * Math.PI * 2 + i * 1.7) * (1 + ph * 2.6) + (i % 2 ? 0.6 : -0.6) * ph
      const r = 1.1 + Math.sin(Math.min(1, ph * 1.1) * Math.PI) * 1.0 + ph * 0.7
      puffs.push({ x, y, r, ph })
    }
    puffs.sort((a, b) => b.ph - a.ph)                              // tan nhất vẽ trước
    for (const p of puffs) {
      const key = p.ph < 0.38 ? 'w' : p.ph < 0.72 ? 'Q' : 'q'      // đặc -> loãng
      const rx = Math.max(1, p.r * 1.15), ry = Math.max(1, p.r)
      ops.push({ op: 'ellipse', x: Math.round(p.x - rx), y: Math.round(p.y - ry), w: Math.max(2, Math.round(rx * 2)), h: Math.max(2, Math.round(ry * 2)), color: key, filled: true })
      if (p.ph < 0.55) ops.push({ op: 'pixel', x: Math.round(p.x - rx * 0.4), y: Math.round(p.y - ry * 0.5), color: 'w' })   // điểm sáng
      if (p.ph > 0.2 && p.ph < 0.9) ops.push({ op: 'pixel', x: Math.round(p.x + rx * 0.7), y: Math.round(p.y + ry * 0.3), color: 'S' })   // bóng nhẹ
    }
    frames.push({ name: `s${f}`, duration: 150, ops })
  }
  const recipe = { version: 1, name: 'pho_steam', width: W, height: H,
    palette: { w: '#fffaf0e6', Q: '#f2ecde b8'.replace(' ', ''), q: '#e4dcca80', S: '#bcb6a8a0' },
    frames, animations: { steam: { frames: frames.map((x) => x.name), loop: true } } }
  fs.writeFileSync(path.join(srcDir, 'pho_steam.recipe.json'), JSON.stringify(recipe, null, 1))
}

// ---------- mưa rào: ô lát 64x64, vệt mưa nghiêng rơi 16px mỗi khung, 4 khung => lặp trọn ----------
{
  const W = 64, H = 64, F = 4
  let seed = 7
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const N = 26, drops = []
  for (let i = 0; i < N; i++) drops.push({ x: Math.floor(rnd() * W), y: Math.floor(rnd() * H), len: 4 + Math.floor(rnd() * 4), big: rnd() < 0.35 })
  const frames = []
  for (let f = 0; f < F; f++) {
    const ops = []
    for (const d of drops) {
      const y0 = (d.y + f * 16) % H, x0 = (d.x - f * 5 + W * 4) % W                  // nghiêng: xuống 16, sang trái 5
      for (const ox of [-W, 0]) for (const oy of [-H, 0]) {
        const sx = x0 + ox, sy = y0 + oy, ex = sx - Math.round(d.len * 0.32), ey = sy + d.len
        if (ex < -1 || sx > W || ey < -1 || sy > H) continue
        ops.push({ op: 'line', x: sx, y: sy, x2: ex, y2: ey, color: d.big ? 'a' : 'b' })
        ops.push({ op: 'pixel', x: sx, y: sy, color: 'c' })                           // đầu giọt sáng
      }
    }
    frames.push({ name: `r${f}`, duration: 70, ops })
  }
  const recipe = { version: 1, name: 'rain', width: W, height: H,
    palette: { a: '#cfe8efd0', b: '#9cc4d0a0', c: '#f2fbffe0' }, frames, animations: { rain: { frames: frames.map((x) => x.name), loop: true } } }
  fs.writeFileSync(path.join(srcDir, 'rain.recipe.json'), JSON.stringify(recipe, null, 1))
}

const meta = {}
for (const [name, frameMs] of [['pho_steam', 150], ['rain', 70]]) {
  const rj = path.join(srcDir, name + '.recipe.json')
  const o = path.join(srcDir, 'out_' + name)
  fs.rmSync(o, { recursive: true, force: true })
  run('render', rj, '--out', o, '--look')
  // sheet = các khung xếp ngang? lấy theo atlas
  const files = fs.readdirSync(o)
  const sheet = files.find((f) => /\.png$/.test(f) && f !== 'look.png' && !/^frames?/.test(f) && f.startsWith(name))
  const atlasFile = files.find((f) => f.endsWith('.atlas.json'))
  const atlas = JSON.parse(fs.readFileSync(path.join(o, atlasFile), 'utf8'))
  const fr = Object.entries(atlas.frames)
  const w = fr[0][1].frame.w, h = fr[0][1].frame.h
  meta[name] = { w, h, frames: fr.length, frameMs, sheet: fr.map(([, v]) => [v.frame.x, v.frame.y]) }
  fs.copyFileSync(path.join(o, sheet), path.join(outDir, name + '.png'))
}
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta))
console.log('VFX xong', JSON.stringify(meta))
