// Dựng sprite cho 5 mini-game + dáng NPC đời sống phố, nhúng base64 để build ra 1 file.
//   node tools/make_minigames.mjs            -> tất cả
//   node tools/make_minigames.mjs --no-review   (bỏ ảnh duyệt)
// Nguồn vẽ: assets/src/minigames/*.js (lõi Cv của thế giới assets/src/lib/core.js — cùng lõi claude-pxl dùng cho thế giới)
//           assets/src/characters/poses_src.js (dáng NPC)
// Ra:  src/assets/minigames/mg-bundle.js   (+ PNG dải khung ở assets/src/minigames/out/)
//      src/assets/characters/poses-bundle.js (+ PNG ở assets/src/characters/out/poses/)
//      assets/review/minigames_sheet.png, assets/review/npc_poses_sheet.png, assets/review/mock_*.png
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const pal = rd('palette/hanoi_palette.json')
const SRC = ['assets/src/lib/core.js', 'assets/src/minigames/lib2d.js', 'assets/src/minigames/people.js', 'assets/src/minigames/mg_common.js',
  'assets/src/minigames/mg_cyclo.js', 'assets/src/minigames/mg_rail.js', 'assets/src/minigames/mg_ship.js', 'assets/src/minigames/mg_tc.js', 'assets/src/minigames/mg_pho.js',
  'assets/src/characters/poses_src.js', 'assets/src/minigames/mock.js']
const lib = SRC.filter((f) => fs.existsSync(path.join(root, f))).map(rd).join('\n;\n').replace('__PAL__', pal)
const env = new Function(lib + '\n;return { MG, POSES: typeof POSES !== "undefined" ? POSES : [], MOCKS: typeof MOCKS !== "undefined" ? MOCKS : [], Cv, blit }')()

// ---------- PNG ----------
const hexRGBA = new Map()
function rgba(c) {
  if (!c) return [0, 0, 0, 0]
  let v = hexRGBA.get(c); if (v) return v
  const n = parseInt(c.slice(1, 7), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255]
  hexRGBA.set(c, v); return v
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0)
  return Buffer.concat([len, td, crc])
}
function png(w, h, getPx) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const p = getPx(x, y), o = y * (w * 4 + 1) + 1 + x * 4; raw[o] = p[0]; raw[o + 1] = p[1]; raw[o + 2] = p[2]; raw[o + 3] = p[3] } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; ih[10] = 0; ih[11] = 0; ih[12] = 0
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}
// dải khung ngang: frames[] Cv cùng cỡ
function stripPng(frames) {
  const w = frames[0].w, h = frames[0].h
  return png(w * frames.length, h, (x, y) => rgba(frames[Math.floor(x / w)].b[y * w + (x % w)]))
}

// ---------- mini-game ----------
const outMG = path.join(root, 'assets/src/minigames/out'); fs.mkdirSync(outMG, { recursive: true })
for (const f of fs.readdirSync(outMG)) if (f.endsWith('.png')) fs.unlinkSync(path.join(outMG, f))
const meta = {}, pngs = {}
const seen = new Set()
for (const s of env.MG) {
  if (seen.has(s.name)) throw new Error('trùng tên ' + s.name); seen.add(s.name)
  const frames = []
  for (let f = 0; f < s.frames; f++) { const cv = s.draw(f); if (cv.w !== s.w || cv.h !== s.h) throw new Error(`${s.name}: khung ${f} ${cv.w}x${cv.h} khác ${s.w}x${s.h}`); frames.push(cv) }
  const buf = stripPng(frames)
  fs.writeFileSync(path.join(outMG, s.name + '.png'), buf)
  pngs[s.name] = 'data:image/png;base64,' + buf.toString('base64')
  meta[s.name] = { w: s.w, h: s.h, frames: s.frames, fps: s.fps || 0, anchor: s.anchor || [0, 0], group: s.group, desc: s.desc, replaces: s.replaces || '', recolor: s.recolor || null }
}
const mgFile = path.join(root, 'src/assets/minigames/mg-bundle.js'); fs.mkdirSync(path.dirname(mgFile), { recursive: true })
fs.writeFileSync(mgFile, `// SINH TỰ ĐỘNG bởi tools/make_minigames.mjs — đừng sửa tay. Mỗi PNG là dải khung xếp ngang (khung i ở x = i*w).\nexport default ${JSON.stringify({ meta, png: pngs })}\n`)
console.log(`mini-game: ${env.MG.length} sprite, ${(fs.statSync(mgFile).size / 1024).toFixed(0)} KB`)

// ---------- dáng NPC ----------
const outP = path.join(root, 'assets/src/characters/out/poses'); fs.mkdirSync(outP, { recursive: true })
for (const f of fs.readdirSync(outP)) if (f.endsWith('.png')) fs.unlinkSync(path.join(outP, f))
const pmeta = {}, ppng = {}
// đổi màu khoá -> look (định dạng NPC_LOOK) — giống recolor() của thế giới, chỉ dùng cho ảnh duyệt
const KEYC = { t: '#3a8f8a', T: '#2a6a6c', u: '#6cc1b0', p: '#3d4c7a', P: '#2b3558', h: '#2b2230', H: '#443449' }
function recolorCv(cv, look) {
  const M = new Map([[KEYC.t, look.sh[0]], [KEYC.T, look.sh[1]], [KEYC.u, look.sh[2]], [KEYC.p, look.pa[0]], [KEYC.P, look.pa[1]], [KEYC.h, look.ha[0]], [KEYC.H, look.ha[1]]])
  const o = new env.Cv(cv.w, cv.h); o.b = cv.b.map((c) => (c && M.get(c)) || c); return o
}
const revP = path.join(outP, '_review'); fs.mkdirSync(revP, { recursive: true })
const EXTRA_LOOKS = [
  { sh: ['#e8e2d0', '#b9b2a0', '#fbf6e8'], pa: ['#2f2f33', '#1c1c20'], ha: ['#8a8a92', '#b0b0b8'] },
  { sh: ['#c94a3a', '#8f3328', '#e78a78'], pa: ['#2f2f33', '#1c1c20'], ha: ['#2b2230', '#443449'] },
  { sh: ['#8a6bb0', '#634a86', '#b394d6'], pa: ['#2b3558', '#1c2438'], ha: ['#5a3a2a', '#7a5238'] },
  { sh: ['#5aa56a', '#3a7a48', '#8acb98'], pa: ['#3d4c7a', '#2b3558'], ha: ['#2b2230', '#443449'] },
]
for (const p of env.POSES) {
  for (const dir of p.dirs) {
    const frames = []; for (let f = 0; f < p.frames; f++) frames.push(p.look ? recolorCv(p.draw(dir, f), p.look) : p.draw(dir, f))
    fs.writeFileSync(path.join(revP, `${p.name}_${dir}.png`), stripPng(frames))
  }
}
{ // nhóm tập thể dục: 4 người khác màu, lệch pha
  const ex = env.POSES.find((p) => p.name === 'exercise')
  if (ex) {
    const frames = []
    for (const f of [0, 2, 4, 6]) { const g = new env.Cv(ex.w * 4, ex.h); EXTRA_LOOKS.forEach((lk, i) => env.blit(g, recolorCv(ex.draw(i === 3 ? 'right' : 'down', (f + i) % ex.frames), lk), i * ex.w, 0)); frames.push(g) }
    fs.writeFileSync(path.join(revP, '_group.png'), stripPng(frames))
  }
}
for (const p of env.POSES) {
  pmeta[p.name] = { w: p.w, h: p.h, frames: p.frames, fps: p.fps, anchor: p.anchor, dirs: p.dirs, loop: p.loop !== false, desc: p.desc, look: p.look || null, keyed: p.keyed !== false }
  for (const dir of p.dirs) {
    const frames = []; for (let f = 0; f < p.frames; f++) { const cv = p.draw(dir, f); if (cv.w !== p.w || cv.h !== p.h) throw new Error(`${p.name}/${dir}: sai cỡ`); frames.push(cv) }
    const buf = stripPng(frames), key = `${p.name}_${dir}`
    fs.writeFileSync(path.join(outP, key + '.png'), buf)
    ppng[key] = 'data:image/png;base64,' + buf.toString('base64')
  }
}
const pFile = path.join(root, 'src/assets/characters/poses-bundle.js')
fs.writeFileSync(pFile, `// SINH TỰ ĐỘNG bởi tools/make_minigames.mjs — đừng sửa tay. PNG dải khung ngang theo hướng: <dáng>_<hướng>.\nexport default ${JSON.stringify({ meta: pmeta, png: ppng })}\n`)
console.log(`dáng NPC: ${env.POSES.length} dáng, ${(fs.statSync(pFile).size / 1024).toFixed(0)} KB`)

// ---------- README (sinh tự động, luôn khớp bundle) ----------
{
  const L = []
  L.push('# Sprite mini-game + dáng NPC (art) — SINH TỰ ĐỘNG bởi `node tools/make_minigames.mjs`, đừng sửa tay', '')
  L.push('Cùng phong cách thế giới: ánh sáng ấm từ trái-trên, bóng ngả teal, viền 1px tối (người: viền mực `#1c1a1f` như NPC; đồ vật: viền tối theo màu kề). Người cùng tỷ lệ NPC thế giới (người 14x26 + viền = 16x28).')
  L.push('Khung logic mini-game 320x180. Nguồn vẽ: `assets/src/minigames/*.js` (lõi Cv của `assets/src/lib/core.js`). Ảnh duyệt: `assets/review/minigames_sheet.png`, `assets/review/minigames_mock.png` (cảnh dựng thử), `assets/review/npc_poses_sheet.png`.', '')
  L.push('## Cách dùng (đợt sau thay vào code vẽ)', '```js', "import { getMG, getMGFrames, drawMG, MG_META, mgReady } from '../../assets/minigames/index.js'",
    "drawMG(g, 'cyclo', CX + 4, by + 3, { t: S.crank * 0.4, outfit: env.outfit })   // vẽ đặt ĐIỂM NEO vào (x,y); t (giây) tự chọn khung theo fps; frame: chọn khung cố định; flip: lật ngang",
    "const frames = getMGFrames('ped_0_down')  // luôn là mảng canvas; getMG(tên) trả canvas nếu 1 khung, mảng nếu nhiều khung", '```')
  L.push('- Canvas có ngay (rỗng) và tự vẽ khi ảnh giải mã xong; `mgReady` là Promise. Không cần gọi init (tự nạp khi import). Test: `window.__mg`.')
  L.push('- `recolor: outfit` = sprite người chơi vẽ bằng màu khoá (áo `#3a8f8a/#2a6a6c/#6cc1b0`, quần `#3d4c7a/#2b3558`, tóc `#2b2230/#443449`); truyền `outfit = env.outfit` ({top,pants,hair} mã màu) để đổi màu theo trang phục.')
  L.push('- Neo = điểm (x,y) trong sprite đặt vào toạ độ game: người = giữa hai bàn chân; xe = điểm chạm đất giữa; nền lát = góc trên-trái.', '')
  const groups = {}
  for (const [n, m] of Object.entries(meta)) (groups[m.group] = groups[m.group] || []).push([n, m])
  for (const [g, list] of Object.entries(groups)) {
    L.push(`## ${g}`, '', '| tên | cỡ | khung | fps | neo | mô tả | thay cho |', '|---|---|---|---|---|---|---|')
    for (const [n, m] of list) L.push(`| \`${n}\` | ${m.w}x${m.h} | ${m.frames} | ${m.fps || '-'} | (${m.anchor.join(',')}) | ${m.desc}${m.recolor ? ' **[đổi màu trang phục]**' : ''} | ${m.replaces || ''} |`)
    L.push('')
  }
  L.push('Ghi chú tên: `ped_<0..7>_<down|up|left|right>` 8 kiểu người (0 cô bán hàng nón lá áo bà ba, 1 anh công sở mũ bảo hiểm, 2 cô gái tóc dài váy, 3 cụ ông mũ cối, 4 học sinh đeo cặp, 5 cụ bà tóc búi, 6 thanh niên mũ lưỡi trai, 7 khách Tây); `cust_<k>_<dir>` cùng người đó ngồi ghế nhựa. Xe: `veh_moto_<0..3>_<r|l>`, `veh_car_<0..2>_<r|l>`, `veh_bus_<r|l>` (nhìn ngang); `veh_motot_<k>_<down|up>`, `veh_cart_<k>_<down|up>` (nhìn từ trên).', '')
  L.push('## Dáng NPC đời sống phố — `window.__npcPoses` (src/assets/characters/poses.js, đăng ký trong `init()` của characters)', '')
  L.push('`__npcPoses[tên] = { w, h, anchor, fps, loop, dirs:{hướng:[canvas…]}, frames, desc, look }` — `frames` = hướng `down` (hoặc hướng duy nhất). `__npcPoses.get(tên, hướng, look)` đổi màu theo `look` dạng NPC_LOOK `{sh:[3], pa:[2], ha:[2]}`; `__npcPoses.raw(tên, hướng)` = khung màu khoá gốc để thế giới tự gọi `recolor()` như người đi bộ. `__npcPoses.ready` = Promise.')
  L.push('Thế giới đang vẽ NPC cứng `w:16 h:28, dy = sy - 26`: với dáng cỡ khác, đặt `dx = sx - anchor[0]`, `dy = sy - anchor[1]`. Người thứ hai trong `coupleSit`/`chess` màu cố định (không đổi theo look).', '')
  L.push('| tên | cỡ | khung | fps | neo | hướng | mô tả |', '|---|---|---|---|---|---|---|')
  for (const [n, m] of Object.entries(pmeta)) L.push(`| \`${n}\` | ${m.w}x${m.h} | ${m.frames} | ${m.fps} | (${m.anchor.join(',')}) | ${m.dirs.join(', ')} | ${m.desc} |`)
  fs.writeFileSync(path.join(root, 'src/assets/minigames/README.md'), L.join('\n') + '\n')
}

// ---------- cảnh dựng thử 320x180 ----------
const revDir = path.join(root, 'assets/review'); fs.mkdirSync(revDir, { recursive: true })
const mockFiles = []
for (const m of env.MOCKS) {
  const cv = m.draw((name, f = 0) => { const s = env.MG.find((q) => q.name === name); if (!s) throw new Error('mock: thiếu ' + name); return { cv: s.draw(f % s.frames), s } })
  const file = path.join(revDir, `mock_${m.name}.png`); fs.writeFileSync(file, png(cv.w, cv.h, (x, y) => rgba(cv.b[y * cv.w + x]))); mockFiles.push({ label: m.label, file })
}

// ---------- ảnh duyệt ----------
if (!process.argv.includes('--no-review')) {
  const { makeSheet } = await import('./make_review_sheet.mjs')
  const W = (n) => path.join(root, 'assets/world', n + '.png')
  const refs = [
    { label: 'THẾ GIỚI: người chơi pl_down', files: [0, 1, 2, 3].map((i) => path.join(root, 'assets/player', `pl_down_${i}.png`)), group: 'So tỷ lệ với sprite thế giới (cùng phóng 3x)' },
    { label: 'THẾ GIỚI: xe máy mo_0_px', file: W('mo_0_px'), group: 'So tỷ lệ với sprite thế giới (cùng phóng 3x)' },
    { label: 'THẾ GIỚI: xích lô p_cyclo', file: W('p_cyclo'), group: 'So tỷ lệ với sprite thế giới (cùng phóng 3x)' },
  ]
  const mgItems = [...refs]
  for (const s of env.MG) if (!/_(left|l)$/.test(s.name) && !(/^(ped|cust)_\d+_/.test(s.name) && !/_(0|3|7)_/.test(s.name) && !/_down$/.test(s.name)))
    mgItems.push({ label: s.name + (s.frames > 1 ? `  (${s.frames} khung)` : ''), file: path.join(outMG, s.name + '.png'), frames: s.frames, group: s.group })
  await makeSheet({ title: 'Sprite mini-game mới (phóng 3x, nền xám trung tính) — Hà Nội Pixel', scale: 3, maxW: 2000, items: mgItems }, path.join(revDir, 'minigames_sheet.png'))
  if (mockFiles.length) await makeSheet({ title: 'Cảnh dựng thử 320x180 (phóng 3x) từ sprite mới', scale: 3, maxW: 2000, items: mockFiles.map((m) => ({ label: m.label, file: m.file, group: 'Cảnh thử' })) }, path.join(revDir, 'minigames_mock.png'))
  const pItems = [refs[0], { label: 'THẾ GIỚI: xe máy mo_0_px', file: W('mo_0_px'), group: refs[0].group }, { label: 'THẾ GIỚI: ghế đá p_bench_x', file: W('p_bench_x'), group: refs[0].group }]
  if (fs.existsSync(path.join(revP, '_group.png'))) pItems.push({ label: 'nhóm tập dưỡng sinh: 4 người khác màu áo, lệch nhịp (4 khung tiêu biểu)', file: path.join(revP, '_group.png'), frames: 4, group: 'Ví dụ nhóm tập thể dục buổi sáng (đổi màu bằng NPC_LOOK)' })
  for (const p of env.POSES) for (const dir of p.dirs) pItems.push({ label: `${p.name} · ${dir} (${p.frames} khung)`, file: path.join(revP, `${p.name}_${dir}.png`), frames: p.frames, group: p.name + ' — ' + p.desc })
  await makeSheet({ title: 'Dáng NPC đời sống phố (phóng 3x, nền xám) — __npcPoses', scale: 3, maxW: 2000, items: pItems }, path.join(revDir, 'npc_poses_sheet.png'))
  console.log('ảnh duyệt: assets/review/')
}
