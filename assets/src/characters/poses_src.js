// ───────── Dáng NPC đời sống phố (window.__npcPoses) — cùng tỷ lệ NPC thế giới (người 14x26 + viền) ─────────
// Người CHÍNH vẽ bằng MÀU KHOÁ (áo #3a8f8a/#2a6a6c/#6cc1b0, quần #3d4c7a/#2b3558, tóc #2b2230/#443449, túi #b5733f/#7d4a28)
// => thế giới đổi màu bằng chính hàm recolor(img, NPC_LOOK[i]) đang dùng cho người đi bộ. Người thứ hai (đôi tình nhân, bạn cờ) dùng màu cố định.
// look = màu mặc định khi xuất frames (định dạng NPC_LOOK: sh[3], pa[2], ha[2]).
const POSES = []
function pose(name, w, h, frames, opt, draw) { POSES.push({ name, w, h, frames, ...opt, draw }) }
const KL = (o = {}) => ({ ...KEY_LOOK, ...o })
const sideDir = (dir) => (dir === 'left' ? 'right' : dir)
const finishP = (cv, dir) => (dir === 'left' ? flipCv(cv) : cv)

// 1) Tập thể dục buổi sáng (dưỡng sinh: giơ tay chậm lên cao rồi hạ) — 8 khung lặp
const EX_DOWN = [['down', 'down', 1], ['dl', 'dl', 0], ['out', 'out', 0], ['du', 'du', 0], ['up', 'up', 0], ['du', 'du', 0], ['out', 'out', 0], ['dl', 'dl', 0]]
const EX_SIDE = ['swing', 'dl', 'fwd', 'du', 'up', 'du', 'fwd', 'dl']
pose('exercise', 26, 32, 8, { anchor: [13, 30], fps: 4, dirs: DIR4, desc: 'tập dưỡng sinh bên hồ: hít vào giơ tay lên cao, thở ra hạ tay (8 khung lặp, ~2 giây/vòng)', look: { sh: ['#e8e2d0', '#b9b2a0', '#fbf6e8'], pa: ['#2f2f33', '#1c1c20'], ha: ['#8a8a92', '#b0b0b8'] } }, (dir, f) => {
  const cv = NEW(26, 32), d = sideDir(dir), [aL, aR, sq] = EX_DOWN[f]
  const L = KL({ ts: 'tee', ps: 'long' })
  if (d === 'right') person(cv, 6, 5, L, { dir: d, f: 0, aS: EX_SIDE[f], U: sq })
  else person(cv, 6, 5, L, { dir: d, f: 0, aL, aR, legs: sq ? 'squat' : 'walk', U: sq })
  outlineInk(cv); return finishP(cv, dir)
})
// 2) Vươn vai nghiêng lườn (một tay lên cao, tay kia chống hông, đổi bên) — 4 khung
pose('stretch', 24, 32, 4, { anchor: [12, 30], fps: 2, dirs: DIR4, desc: 'vươn vai nghiêng lườn đổi bên (4 khung lặp)', look: { sh: ['#d94a4a', '#a83030', '#ef7a6a'], pa: ['#2b3558', '#1c2438'], ha: ['#2b2230', '#443449'] } }, (dir, f) => {
  const cv = NEW(24, 32), d = sideDir(dir), L = KL({ ts: 'tee' })
  const seq = [['up', 'hip', 1], ['down', 'down', 0], ['hip', 'up', -1], ['down', 'down', 0]][f]
  if (d === 'right') person(cv, 5, 5, L, { dir: d, aS: f % 2 ? 'swing' : 'up', lean: 0 })
  else person(cv, 5, 5, L, { dir: d, aL: seq[0], aR: seq[1], lean: d === 'up' ? -seq[2] : seq[2] })
  outlineInk(cv); return finishP(cv, dir)
})
// 3) Chạy bộ (băng đô, áo ba lỗ, quần short) — 4 khung, 16x28 như người đi bộ
pose('jog', 16, 28, 4, { anchor: [8, 26], fps: 10, dirs: DIR4, desc: 'chạy bộ quanh hồ: băng đô đỏ, áo ba lỗ, quần short; nhún người theo bước (thay khung đi, tốc độ ~2 lần người đi)', look: { sh: ['#3a7bd5', '#2a58a0', '#7fb0f2'], pa: ['#2f2f33', '#1c1c20'], ha: ['#2b2230', '#443449'] } }, (dir, f) => {
  const cv = NEW(16, 28), d = sideDir(dir), L = KL({ ts: 'tank', ps: 'short', hat: 'band', hatC: '#e04a4a' })
  const U = f % 2 === 0 ? 1 : 0
  if (d === 'right') person(cv, 1, 1, L, { dir: d, f, legs: 'run', aS: f < 2 ? 'run0' : 'run1', U })
  else person(cv, 1, 1, L, { dir: d, f, legs: 'run', aL: f < 2 ? 'fwd' : 'down', aR: f < 2 ? 'down' : 'fwd', U })
  outlineInk(cv); return finishP(cv, dir)
})
// 4) Đôi tình nhân ngồi ghế đá, cô gái tựa vai — 4 khung (0 ngồi, 1–3 tựa vai, khung 2 có trái tim nhỏ)
const GIRL = { skin: SKIN3, hair: ['#3a2418', '#5a3a28'], hs: 'long', top: ['#e07a9a', '#a85070', '#f2a8c0'], ts: 'tee', pants: ['#f4efe6', '#c9c2b0'], ps: 'skirt', shoe: ['#efe6d2', '#b9ae96'] }
function heart(cv, x, y) { const R = '#e0463a'; cv.rect(x, y, 2, 2, R); cv.rect(x + 3, y, 2, 2, R); cv.rect(x, y + 1, 5, 2, R); cv.rect(x + 1, y + 3, 3, 1, R); cv.set(x + 2, y + 4, R); cv.set(x + 1, y, '#f2a8c0') }
pose('coupleSit', 30, 31, 4, { anchor: [15, 29], fps: 1, dirs: DIR4, desc: 'đôi tình nhân ngồi ghế đá (không kèm ghế: đặt lên p_bench, mông ở hàng y≈25), cô gái tựa vai; anh = màu khoá, cô = váy trắng áo hồng', look: { sh: ['#2f2f33', '#1c1c20', '#55555c'], pa: ['#3d4c7a', '#2b3558'], ha: ['#2b2230', '#443449'] } }, (dir, f) => {
  const d = sideDir(dir), girl = NEW(30, 31), man = NEW(30, 31), lean = f > 0
  const M = KL({ ts: 'shirt' })
  if (d === 'right') {
    person(girl, 4, 3, GIRL, { dir: d, legs: 'sit', aS: 'lap', lean: lean ? 2 : 0, hdy: lean ? 1 : 0 })
    person(man, 11, 4, M, { dir: d, legs: 'sit', aS: 'lap' })
  } else {
    const gx = d === 'down' ? 14 : 2, mx = d === 'down' ? 2 : 14
    const gl = (d === 'down' ? -2 : 2)
    person(girl, gx, 4, GIRL, { dir: d, legs: 'sit', aL: 'down', aR: 'down', lean: lean ? gl : 0, hdy: lean ? 1 : 0, eyesClosed: lean && d === 'down', blush: lean })
    person(man, mx, 4, M, { dir: d, legs: 'sit', aL: d === 'up' && lean ? 'out' : 'down', aR: d === 'down' && lean ? 'out' : 'down' })
  }
  outlineInk(girl); outlineInk(man)
  const order = d === 'down' ? [man, girl] : d === 'up' ? [man, girl] : [girl, man]
  const cv = comp(30, 31, order.map((c) => ({ cv: c })))
  if (f === 2) { heart(cv, 13, 0); }
  return finishP(cv, dir)
})
// 5) Cụ ông ngồi ghế nhựa uống trà (nâng chén, nhấp, hạ) — 4 khung
const ELDER = KL({ hair: ['#c8c8cc', '#e8e8ea'], hairDark: '#a0a0a8', ts: 'shirt', skin: SKIN2, beard: '#d8d8dc', hat: 'pith' })
pose('elderTea', 18, 31, 4, { anchor: [9, 29], fps: 2, dirs: DIR4, desc: 'cụ ông mũ cối ngồi ghế nhựa thấp xanh uống trà: cầm chén, nâng lên, nhấp (nhắm mắt), hạ xuống', look: { sh: ['#ece6d6', '#bdb5a2', '#fffaf0'], pa: ['#b99d68', '#8a7348'], ha: ['#2b2230', '#443449'] } }, (dir, f) => {
  const st = NEW(18, 31), p = NEW(18, 31), d = sideDir(dir)
  stoolUnder(st, 2, 4, '#2f62c9', d)
  if (d === 'right') person(p, 2, 4, ELDER, { dir: d, legs: 'sit', aS: ['lapcup', 'cup', 'sip', 'lapcup'][f], eyesClosed: f === 2, cupT: '#b07a3c' })
  else if (d === 'down') person(p, 2, 4, ELDER, { dir: d, legs: 'sit', aL: 'down', aR: ['hold', 'cup', 'cup', 'hold'][f], eyesClosed: f === 2, cupT: '#b07a3c' })
  else person(p, 2, 4, ELDER, { dir: d, legs: 'sit', aL: 'down', aR: f === 1 || f === 2 ? 'fwd' : 'down', hdy: f === 2 ? -1 : 0 })
  return finishP(comp(18, 31, [{ cv: st, ol: 'warm' }, { cv: p, ol: 'ink' }]), dir)
})
// 6) Hai cụ đánh cờ tướng trên ghế đẩu — 4 khung, nhìn chính diện (chỉ 1 hướng: 'down')
const ELDER2 = { skin: SKIN, hair: ['#a8a8b0', '#d0d0d6'], hs: 'bald', top: ['#e8e2d0', '#b9b2a0', '#fbf6e8'], ts: 'baba', pants: ['#2a2a30', '#18181c'], ps: 'long', shoe: ['#5a4a3a', '#3a2e24'], beard: '#d0d0d6' }
pose('chess', 40, 31, 4, { anchor: [20, 29], fps: 1, dirs: ['down'], desc: 'hai cụ đánh cờ tướng trên ghế đẩu, nhìn chính diện (chỉ 1 hướng). Khung: 0 suy nghĩ, 1 cụ trái đi quân, 2 quân đã đi, 3 cụ phải gãi cằm. Cụ trái = màu khoá', look: { sh: ['#6a7fc0', '#4a5a90', '#9aaee0'], pa: ['#2f2f33', '#1c1c20'], ha: ['#c8c8cc', '#e8e8ea'] } }, (dir, f) => {
  const bd = NEW(40, 31), a = NEW(18, 31), b = NEW(18, 31), st = NEW(40, 31)
  // ghế đẩu + bàn cờ
  const W0 = '#a87a48', Wd = sh(W0, 0.3)
  bd.rect(16, 22, 8, 1, Wd); bd.rect(17, 23, 1, 6, Wd); bd.rect(22, 23, 1, 6, Wd)
  bd.rect(14, 19, 12, 3, '#e0c088'); bd.rect(14, 21, 12, 1, sh('#e0c088', 0.25)); for (let x = 15; x < 26; x += 2) bd.set(x, 20, '#a87a48'); bd.rect(14, 20, 12, 1, '#c8a060'); bd.set(19, 19, '#a87a48')
  const red = '#d4382c', blk = '#26232a'
  bd.set(16, 19, red); bd.set(18, 20, blk); bd.set(23, 19, blk); bd.set(24, 20, red); bd.set(f >= 2 ? 21 : 17, f >= 2 ? 20 : 21, red)
  stoolUnder(st, 2, 4, '#d4382c', 'right'); stoolUnder(st, 24, 4, '#2f62c9', 'right')
  person(a, 2, 4, { ...ELDER, hat: null, hs: 'short' }, { dir: 'right', legs: 'sit', aS: f === 1 ? 'fwd' : 'lap' })
  person(b, 2, 4, ELDER2, { dir: 'right', legs: 'sit', aS: f === 3 ? 'chin' : f === 0 ? 'chin' : 'lap' })
  outlineInk(a); outlineInk(b)
  const cv = NEW(40, 31)
  const st2 = st; st2.outline(0.55); blit(cv, st2, 0, 0)
  blit(cv, a, -1, 0); blit(cv, b, 23, 0, true)
  bd.outline(0.55); blit(cv, bd, 0, 0)
  return cv
})
// 7) Ngồi ghế nhựa uống trà chanh vỉa hè — 4 khung (cầm cốc, hút, cầm cốc, vẫy tay nói chuyện)
pose('sitStool', 18, 31, 4, { anchor: [9, 29], fps: 2, dirs: DIR4, desc: 'ngồi ghế nhựa đỏ thấp uống trà chanh (cốc vàng): cầm cốc, uống, cầm cốc, vẫy tay tán gẫu', look: { sh: ['#e08a2a', '#a8601a', '#f2b060'], pa: ['#3d4c7a', '#2b3558'], ha: ['#2b2230', '#443449'] } }, (dir, f) => {
  const st = NEW(18, 31), p = NEW(18, 31), d = sideDir(dir)
  stoolUnder(st, 2, 4, '#d4382c', d)
  const o = { dir: d, legs: 'sit', cupT: '#e8c84a' }
  if (d === 'right') person(p, 2, 4, KEY_LOOK, { ...o, aS: ['lapcup', 'sip', 'lapcup', 'chin'][f] })
  else if (d === 'down') person(p, 2, 4, KEY_LOOK, { ...o, aL: f === 3 ? 'wave' : 'down', aR: ['hold', 'cup', 'hold', 'hold'][f] })
  else person(p, 2, 4, KEY_LOOK, { ...o, aL: f === 3 ? 'wave' : 'down', aR: f === 1 ? 'fwd' : 'down' })
  return finishP(comp(18, 31, [{ cv: st, ol: 'warm' }, { cv: p, ol: 'ink' }]), dir)
})
