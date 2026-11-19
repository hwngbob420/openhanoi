// ───────── sổ đăng ký sprite + người & xe dùng chung cho các mini-game ─────────
// def(name, w, h, frames, opt, draw): draw(f) trả về Cv (w x h) cho khung f.
// opt: { anchor:[x,y], fps, group, desc, replaces, recolor:'outfit' (đổi màu theo trang phục người chơi), dirs }
const MG = []
function def(name, w, h, frames, opt, draw) { MG.push({ name, w, h, frames, ...opt, draw }) }
const NEW = (w, h) => new Cv(w, h)
// ghép lớp: [{cv, ol:'ink'|'warm'|null, dx,dy, flip}] theo thứ tự vẽ
function comp(w, h, layers) {
  const out = NEW(w, h)
  for (const l of layers) { if (!l) continue; let c = l.cv; if (l.ol === 'ink') outlineInk(c); else if (l.ol === 'warm') c.outline(l.k || 0.55); blit(out, c, l.dx || 0, l.dy || 0, l.flip) }
  return out
}
const DIR4 = ['down', 'up', 'right', 'left']

// ===== người đi bộ: ped_<k>_<dir> 18x31, 4 khung, chân (9,29) =====
function pedFrame(look, dir, f, extra = {}) {
  const cv = NEW(18, 31), d = dir === 'left' ? 'right' : dir
  person(cv, 2, 4, look, { dir: d, f, ...extra })
  outlineInk(cv)
  return dir === 'left' ? flipCv(cv) : cv
}
PED_LOOKS.forEach((lk, k) => {
  for (const dir of DIR4) def(`ped_${k}_${dir}`, 18, 31, 4, { anchor: [9, 29], fps: 7, group: 'Người đi bộ (dùng chung)', desc: `${lk.name} — đi hướng ${dir}`, replaces: 'gfx.person / gfx.npc / npcPed (ship.js)' }, (f) => pedFrame(lk, dir, f))
})
// ===== khách ngồi ghế nhựa thấp: cust_<k>_<down|up> 18x31, 2 khung (0 ngồi chờ, 1 cầm cốc/ăn), chân (9,29) =====
const STOOLS = ['#d4382c', '#2f62c9', '#e0a52a', '#3a9a5a']
function stoolUnder(cv, bx, by, col, dir) {
  const a = col, d = sh(col, 0.3), l = hi(col, 0.3)
  if (dir === 'up') { cv.rect(bx + 2, by + 21, 10, 2, a); cv.rect(bx + 2, by + 21, 10, 1, l); cv.rect(bx + 2, by + 23, 1, 3, d); cv.rect(bx + 11, by + 23, 1, 3, d); cv.rect(bx + 4, by + 23, 6, 1, d) }
  else if (dir === 'down') { cv.rect(bx + 0, by + 22, 1, 4, d); cv.rect(bx + 13, by + 22, 1, 4, d); cv.rect(bx + 0, by + 21, 14, 1, a) }
  else { cv.rect(bx + 3, by + 21, 7, 2, a); cv.rect(bx + 3, by + 21, 7, 1, l); cv.rect(bx + 3, by + 23, 1, 3, d); cv.rect(bx + 9, by + 23, 1, 3, d); cv.rect(bx + 4, by + 24, 5, 1, d) }
}
function custFrame(look, dir, f, stool, extra = {}) {
  const st = NEW(18, 31), p = NEW(18, 31), d = dir === 'left' ? 'right' : dir
  stoolUnder(st, 2, 4, stool, d)
  const arms = d === 'right' ? { aS: f ? 'sip' : 'lapcup' } : d === 'down' ? { aL: 'down', aR: f ? 'cup' : 'hold' } : { aL: 'down', aR: 'down' }
  person(p, 2, 4, look, { dir: d, legs: 'sit', ...arms, ...extra })
  const c = comp(18, 31, [{ cv: st, ol: 'warm' }, { cv: p, ol: 'ink' }])
  return dir === 'left' ? flipCv(c) : c
}
PED_LOOKS.forEach((lk, k) => {
  for (const dir of ['down', 'up', 'right', 'left']) def(`cust_${k}_${dir}`, 18, 31, 2, { anchor: [9, 29], fps: 2, group: 'Khách ngồi ghế nhựa (phở, trà chanh)', desc: `${lk.name} ngồi ghế nhựa ${['đỏ', 'xanh', 'vàng', 'xanh lá'][k % 4]}, hướng ${dir}; khung 1 = cầm cốc/uống`, replaces: 'pho.js khách (npc ngồi), tc.js person khi khách ngồi' }, (f) => custFrame(lk, dir, f, STOOLS[k % 4], { cupT: '#e8c84a' }))
})
// ===== người chơi (đổi màu theo trang phục): player_<dir> 16x28 chân (8,26) — giống NPC thế giới =====
for (const dir of DIR4) def(`player_${dir}`, 16, 28, 4, { anchor: [8, 26], fps: 8, recolor: 'outfit', group: 'Người chơi (đổi màu theo trang phục)', desc: `Người chơi đi bộ hướng ${dir}`, replaces: 'gfx.person(..., env.outfit)' }, (f) => {
  const cv = NEW(16, 28), d = dir === 'left' ? 'right' : dir
  person(cv, 1, 1, KEY_LOOK, { dir: d, f }); outlineInk(cv); return dir === 'left' ? flipCv(cv) : cv
})
// bê ghế qua đầu (trà chanh): tay giơ cao; ghế vẽ riêng (tc_stool_*) đặt neo tay
for (const dir of DIR4) def(`player_carry_${dir}`, 16, 31, 4, { anchor: [8, 29], fps: 8, recolor: 'outfit', group: 'Người chơi (đổi màu theo trang phục)', desc: `Bê ghế qua đầu, hướng ${dir}. Đặt tc_stool_* sao cho đáy ghế ở hàng y=3 của sprite (tay ở hàng 3–4)`, replaces: 'tc.js person + chair cạnh người' }, (f) => {
  const cv = NEW(16, 31), d = dir === 'left' ? 'right' : dir
  person(cv, 1, 4, KEY_LOOK, d === 'right' ? { dir: d, f, aS: 'up' } : { dir: d, f, aL: 'up', aR: 'up' }); outlineInk(cv); return dir === 'left' ? flipCv(cv) : cv
})
def('player_serve', 16, 28, 2, { anchor: [8, 26], fps: 4, recolor: 'outfit', group: 'Người chơi (đổi màu theo trang phục)', desc: 'Người bán sau quầy: khung 0 đứng, khung 1 hai tay bưng ra', replaces: 'pho.js person(160,80, arms)' }, (f) => {
  const cv = NEW(16, 28); person(cv, 1, 1, KEY_LOOK, { dir: 'down', aL: f ? 'fwd' : 'down', aR: f ? 'fwd' : 'down' })
  // khăn vấn đầu trắng
  hl(cv, 2, 13, 4, '#f4efe2'); hl(cv, 3, 12, 5, '#d9d2c0')
  outlineInk(cv); return cv
})

// ===== xe máy nhìn ngang (trà chanh): veh_moto_<c>_<r|l> 30x26, 2 khung =====
const MOTO = [
  { name: 'Wave đỏ', body: '#c9302a', trim: '#26232a', helm: '#f2c23c', rider: PED_LOOKS[6] },
  { name: 'Dream nâu', body: '#7a3a2a', trim: '#c9c2b0', helm: '#e8e2d0', rider: PED_LOOKS[1], pillion: PED_LOOKS[0] },
  { name: 'Wave xanh', body: '#2f62c9', trim: '#26232a', helm: '#d4382c', rider: PED_LOOKS[2] },
  { name: 'Xe ga trắng', body: '#e8e2d0', trim: '#5a6470', helm: '#3a9a5a', rider: PED_LOOKS[4] },
]
function motoSide(m, f) {
  const W = 30, H = 36, OY = 10, wl0 = NEW(W, 26), bk = NEW(W, 26), ppl = NEW(W, H)
  const wl = wl0
  const ph = f * Math.PI / 3
  solidWheel(wl, 6.5, 21.5, 4.5, ph); solidWheel(wl, 23.5, 21.5, 4.5, ph)
  const a = m.body, d = sh(a, 0.3), l = hi(a, 0.3)
  // khung + yếm trước + yên + đuôi
  bk.poly([[5, 17], [12, 15], [16, 15], [18, 19], [11, 20], [5, 20]], a)       // thân sau (ốp)
  bk.rect(5, 19, 7, 1, d); bk.rect(6, 16, 5, 1, l)
  bk.rect(4, 14, 11, 2, '#2a2630'); bk.rect(5, 13, 9, 1, '#3a3540')            // yên
  bk.rect(2, 15, 3, 2, d); bk.set(1, 16, '#e0463a'); bk.set(2, 16, '#e0463a')   // đuôi + đèn hậu
  bk.rect(15, 18, 6, 2, m.trim)                                                 // sàn để chân
  bk.poly([[19, 9], [23, 9], [25, 19], [22, 20], [20, 16]], a)                  // yếm trước
  bk.line(20, 10, 22, 18, l); bk.rect(23, 18, 2, 3, '#7d8794')                 // phuộc
  bk.rect(21, 7, 4, 2, m.trim); bk.rect(24, 8, 2, 2, '#fff6c0')                // đầu đèn
  bk.rect(19, 6, 3, 1, '#3a3540'); bk.set(19, 5, '#9aa3ad')                     // tay lái + gương
  bk.rect(8, 21, 6, 1, '#9aa3ad'); bk.rect(13, 20, 3, 1, '#5a6470')             // ống xả
  // người lái ngồi
  const r = m.rider
  const pl = NEW(W, H)
  if (m.pillion) { person(pl, 0, 3, { ...m.pillion }, { dir: 'right', legs: 'sit', aS: 'lap' }); outlineInk(pl) }
  person(ppl, 5, 2, { ...r, hat: 'helmet', hatC: m.helm }, { dir: 'right', legs: 'sit', aS: 'fwd' })
  outlineInk(ppl)
  return comp(W, H, [{ cv: wl, dy: OY }, { cv: bk, ol: 'warm', dy: OY }, { cv: pl }, { cv: ppl }])
}
MOTO.forEach((m, k) => {
  def(`veh_moto_${k}_r`, 30, 36, 2, { anchor: [15, 35], fps: 10, group: 'Xe cộ nhìn ngang (trà chanh)', desc: `Xe máy ${m.name}${m.pillion ? ' chở người nón lá' : ''}, chạy sang phải`, replaces: 'gfx.scooter (tc.js)' }, (f) => motoSide(m, f))
  def(`veh_moto_${k}_l`, 30, 36, 2, { anchor: [15, 35], fps: 10, group: 'Xe cộ nhìn ngang (trà chanh)', desc: `Xe máy ${m.name}, chạy sang trái`, replaces: 'gfx.scooter (tc.js)' }, (f) => flipCv(motoSide(m, f)))
})
// ===== ô tô nhìn ngang: veh_car_<c>_<r|l> 38x20 =====
const CARS = [{ name: 'taxi trắng-xanh', a: '#eeeae0', s: '#3a9a5a' }, { name: 'sedan đỏ', a: '#c9302a' }, { name: 'SUV xanh than', a: '#2e4a6a' }]
function carSide(cc, f) {
  const W = 38, H = 20, wl = NEW(W, H), b = NEW(W, H)
  const a = cc.a, d = sh(a, 0.3), l = hi(a, 0.3)
  b.poly([[1, 9], [9, 8], [13, 3], [26, 3], [31, 8], [36, 9], [37, 15], [1, 15]], a)
  b.rect(1, 14, 36, 2, d); b.rect(2, 9, 34, 1, l)
  b.poly([[14, 4], [20, 4], [20, 8], [11, 8]], '#2a4a5a'); b.poly([[21, 4], [25, 4], [29, 8], [21, 8]], '#2a4a5a')
  b.set(15, 5, '#8cbfba'); b.set(22, 5, '#8cbfba'); b.set(16, 5, '#8cbfba')
  b.rect(20, 9, 1, 5, d); b.rect(12, 11, 2, 1, d); b.rect(23, 11, 2, 1, d)
  b.rect(35, 10, 2, 2, '#fff6c0'); b.rect(1, 10, 2, 2, '#d4382c')
  if (cc.s) { b.rect(2, 12, 34, 1, cc.s); b.rect(16, 1, 6, 2, '#f2c23c'); b.rect(17, 1, 4, 1, '#fbe08a') }
  b.outline(0.55)
  const ph = f * Math.PI / 3
  solidWheel(wl, 8.5, 15.5, 3.8, ph); solidWheel(wl, 29.5, 15.5, 3.8, ph)
  return comp(W, H, [{ cv: b }, { cv: wl }])
}
CARS.forEach((cc, k) => {
  def(`veh_car_${k}_r`, 38, 20, 2, { anchor: [19, 19], fps: 10, group: 'Xe cộ nhìn ngang (trà chanh)', desc: `Ô tô ${cc.name}, chạy sang phải`, replaces: 'gfx.car' }, (f) => carSide(cc, f))
  def(`veh_car_${k}_l`, 38, 20, 2, { anchor: [19, 19], fps: 10, group: 'Xe cộ nhìn ngang (trà chanh)', desc: `Ô tô ${cc.name}, chạy sang trái`, replaces: 'gfx.car' }, (f) => flipCv(carSide(cc, f)))
})
// ===== xe buýt Hà Nội vàng-đỏ: veh_bus_<r|l> 70x32 =====
function busSide(f, flip = false) {
  const W = 70, H = 32, wl = NEW(W, H), b = NEW(W, H)
  const Y = '#f2c23c', Yd = sh(Y, 0.25), R0 = '#c9302a', Rd = sh(R0, 0.3)
  b.rect(1, 2, 67, 24, Y); b.rect(2, 1, 64, 1, hi(Y, 0.3)); b.rect(1, 2, 67, 1, hi(Y, 0.4))
  b.rect(1, 18, 67, 8, R0); b.rect(1, 25, 67, 1, Rd); b.rect(1, 18, 67, 1, hi(R0, 0.25))
  for (let x = 4; x < 56; x += 9) { b.rect(x, 5, 7, 8, '#2a4a5a'); b.set(x + 1, 6, '#8cbfba'); b.set(x + 2, 6, '#8cbfba') }
  b.rect(59, 4, 8, 10, '#2a4a5a'); b.rect(60, 5, 2, 2, '#8cbfba')                  // kính lái
  b.rect(58, 15, 6, 10, '#3a4a58'); b.rect(60, 15, 1, 10, Yd); b.rect(22, 15, 6, 10, '#3a4a58'); b.rect(24, 15, 1, 10, Yd)   // cửa
  b.rect(60, 2, 7, 2, '#26232a'); b.rect(61, 2, 1, 1, '#ff9a2a'); b.rect(63, 2, 1, 1, '#ff9a2a'); b.rect(64, 2, 1, 1, '#ff9a2a') // biển số tuyến
  if (!flip) text2d(b, 34, 19, '09', '#fbf6e8')
  b.rect(66, 20, 2, 3, '#fff6c0'); b.rect(1, 20, 2, 3, '#e0463a')
  b.rect(1, 13, 67, 1, Yd)
  b.outline(0.55)
  const ph = f * Math.PI / 3
  solidWheel(wl, 12.5, 26.5, 5, ph); solidWheel(wl, 50.5, 26.5, 5, ph)
  const out = comp(W, H, [{ cv: b }, { cv: wl }])
  if (flip) { const o = flipCv(out); text2d(o, 29, 19, '09', '#fbf6e8'); return o }
  return out
}
def('veh_bus_r', 70, 32, 2, { anchor: [35, 31], fps: 10, group: 'Xe cộ nhìn ngang (trà chanh)', desc: 'Xe buýt Hà Nội vàng-đỏ tuyến 09, chạy sang phải', replaces: 'gfx.car (thêm loại xe to)' }, (f) => busSide(f))
def('veh_bus_l', 70, 32, 2, { anchor: [35, 31], fps: 10, group: 'Xe cộ nhìn ngang (trà chanh)', desc: 'Xe buýt Hà Nội vàng-đỏ, chạy sang trái', replaces: 'gfx.car' }, (f) => busSide(f, true))

// ===== xe nhìn từ trên (gác chắn): veh_moto_<c>_<down|up> 14x26; veh_car_<c>_<down|up> 18x30 =====
function motoTop(m, dir, f) {
  const W = 14, H = 26, c = NEW(W, H)
  const a = m.body, d = sh(a, 0.3), l = hi(a, 0.3), helm = m.helm, hd = sh(helm, 0.3), r = m.rider
  const T = '#26232a'
  if (dir === 'down') {
    // bánh sau (trên), thân, người, tay lái, yếm, bánh trước (dưới)
    c.rect(5, 0, 4, 4, T); c.rect(4, 3, 6, 5, a); c.rect(5, 2, 4, 1, '#e0463a')
    c.rect(3, 6, 8, 9, r.top[0]); c.rect(3, 6, 1, 9, r.top[1]); c.rect(10, 6, 1, 9, r.top[1])     // lưng/vai người lái
    c.ell(7, 6.5, 3.6, 3.6, helm); c.rect(5, 4, 2, 1, hi(helm, 0.35)); c.rect(4, 9, 6, 1, hd)
    c.rect(4, 10, 6, 2, r.skin[0]); c.set(5, 10, '#1c1a1f'); c.set(8, 10, '#1c1a1f')            // mặt
    c.rect(0, 14, 14, 1, '#3a3540'); c.set(0, 13, '#9aa3ad'); c.set(13, 13, '#9aa3ad'); c.rect(1, 13, 2, 2, r.skin[0]); c.rect(11, 13, 2, 2, r.skin[0])
    c.rect(4, 15, 6, 6, a); c.rect(4, 15, 6, 1, l); c.rect(9, 16, 1, 5, d); c.rect(5, 18, 4, 2, '#fff6c0')
    c.rect(5, 21, 4, 5, T); c.set(6, 22 + f, '#4a4652'); c.set(7, 24 - f, '#4a4652')
  } else {
    c.rect(5, 0, 4, 4, T); c.set(6, 1 + f, '#4a4652')
    c.rect(4, 3, 6, 5, a); c.rect(4, 3, 6, 1, l); c.rect(5, 5, 4, 1, '#fff6c0')
    c.rect(0, 7, 14, 1, '#3a3540'); c.set(0, 6, '#9aa3ad'); c.set(13, 6, '#9aa3ad'); c.rect(1, 7, 2, 2, r.skin[0]); c.rect(11, 7, 2, 2, r.skin[0])
    c.rect(3, 9, 8, 8, r.top[0]); c.rect(10, 9, 1, 8, r.top[1]); c.rect(3, 15, 8, 1, r.top[1])
    c.ell(7, 9.5, 3.6, 3.6, helm); c.rect(5, 7, 2, 1, hi(helm, 0.35)); c.rect(4, 12, 6, 1, hd)
    c.rect(4, 16, 6, 5, a); c.rect(9, 16, 1, 5, d); c.rect(5, 19, 4, 1, '#e0463a'); c.rect(5, 20, 4, 1, '#efe6d2')
    c.rect(5, 21, 4, 5, T); c.set(6, 22 + f, '#4a4652')
  }
  c.outline(0.6); return c
}
MOTO.forEach((m, k) => {
  for (const dir of ['down', 'up']) def(`veh_motot_${k}_${dir}`, 14, 26, 2, { anchor: [7, 13], fps: 10, group: 'Xe cộ nhìn từ trên (gác chắn)', desc: `Xe máy ${m.name} nhìn từ trên, chạy ${dir === 'down' ? 'xuống' : 'lên'}; neo = tâm xe`, replaces: 'gfx.scooter (rail.js)' }, (f) => motoTop(m, dir, f))
})
function carTop(cc, dir, f) {
  const W = 18, H = 30, c = NEW(W, H), a = cc.a, d = sh(a, 0.3), l = hi(a, 0.35), G = '#2a4a5a', T = '#26232a'
  for (const [x, y] of [[0, 4], [15, 4], [0, 21], [15, 21]]) { c.rect(x, y, 3, 6, T); c.set(x + 1, y + 1 + f * 2, '#4a4652') }
  c.rect(2, 1, 14, 28, a); c.rect(3, 0, 12, 1, a); c.rect(3, 29, 12, 1, a)
  c.rect(2, 1, 1, 28, l); c.rect(15, 1, 1, 28, d)
  const front = dir === 'down'
  // kính trước / sau + mui
  const wf = front ? 18 : 7, wb = front ? 7 : 19
  c.rect(4, wf, 10, 4, G); c.rect(5, wf + 1, 3, 1, '#8cbfba')
  c.rect(4, wb, 10, 3, G)
  c.rect(4, front ? 10 : 10, 10, 8, hi(a, 0.15)); c.rect(4, 10, 1, 8, l)
  if (cc.s) { c.rect(7, 12, 4, 2, '#f2c23c') }
  if (front) { c.rect(3, 28, 3, 1, '#fff6c0'); c.rect(12, 28, 3, 1, '#fff6c0') } else { c.rect(3, 0, 3, 1, '#d4382c'); c.rect(12, 0, 3, 1, '#d4382c') }
  if (front) { c.rect(3, 0, 3, 1, '#d4382c'); c.rect(12, 0, 3, 1, '#d4382c') } else { c.rect(3, 29, 3, 1, '#fff6c0'); c.rect(12, 29, 3, 1, '#fff6c0') }
  c.outline(0.6); return c
}
CARS.forEach((cc, k) => {
  for (const dir of ['down', 'up']) def(`veh_cart_${k}_${dir}`, 18, 30, 2, { anchor: [9, 15], fps: 10, group: 'Xe cộ nhìn từ trên (gác chắn)', desc: `Ô tô ${cc.name} nhìn từ trên, chạy ${dir === 'down' ? 'xuống (đầu xe ở dưới)' : 'lên'}; neo = tâm xe`, replaces: 'rail.js ô tô khối chữ nhật' }, (f) => carTop(cc, dir, f))
})

// ===== món ăn (pho) =====
function food(kind, f) {
  const c = NEW(16, 14)
  const bowl = (col, rim) => { c.ell(8, 9, 7, 3.6, rim); c.ell(8, 8.5, 6, 2.6, col); c.rect(3, 11, 10, 2, '#e8e2d6'); c.rect(4, 13, 8, 1, '#c9c2b0'); c.rect(2, 9, 1, 2, '#c9c2b0') }
  if (kind === 'pho') {
    bowl('#e9d4a0', '#f4efe6'); c.rect(4, 7, 3, 1, '#a85a3c'); c.rect(9, 8, 3, 1, '#a85a3c'); c.rect(6, 8, 2, 1, '#f4ead2'); c.set(5, 9, '#5aa84a'); c.set(10, 7, '#5aa84a'); c.set(8, 7, '#e8f0d0'); c.set(11, 9, '#d4382c')
    c.line(11, 5, 14, 1, '#b07a3c'); c.line(12, 5, 15, 1, '#b07a3c')
    if (f === 0) { c.set(5, 3, '#fbf6e8'); c.set(6, 2, '#fbf6e8'); c.set(5, 1, '#fbf6e8') } else { c.set(6, 3, '#fbf6e8'); c.set(5, 2, '#fbf6e8'); c.set(6, 1, '#fbf6e8') }
  } else if (kind === 'quay') {
    for (const [x, y] of [[2, 4], [6, 3], [10, 4]]) { c.rect(x, y, 4, 9, '#d99a3a'); c.rect(x, y, 4, 1, '#f0c26a'); c.rect(x + 3, y + 1, 1, 8, '#a8701e'); c.set(x + 1, y + 3, '#f0c26a'); c.set(x + 1, y + 6, '#f0c26a') }
    c.rect(1, 12, 14, 2, '#c9c2b0')
  } else if (kind === 'tra') {
    c.rect(4, 2, 8, 11, '#d8e8e0'); c.rect(5, 4, 6, 8, '#c98a2a'); c.rect(5, 4, 6, 1, '#e0a84a'); c.set(6, 6, '#eef6f2'); c.set(8, 5, '#eef6f2'); c.set(7, 8, '#eef6f2'); c.rect(4, 12, 8, 1, '#a8b8b0'); c.rect(11, 3, 1, 9, '#a8b8b0')
  } else if (kind === 'chanh') {
    c.rect(4, 2, 8, 11, '#d8e8e0'); c.rect(5, 4, 6, 8, '#e8c84a'); c.rect(5, 4, 6, 1, '#f6e08a'); c.set(6, 6, '#fbf6e8'); c.set(8, 8, '#fbf6e8'); c.rect(9, 2, 3, 3, '#7ac04a'); c.set(10, 3, '#c8e890'); c.rect(4, 12, 8, 1, '#a8b8b0'); c.line(7, 0, 8, 6, '#d4382c')
  } else if (kind === 'bm' || kind === 'bmtrung') {
    c.poly([[1, 9], [3, 5], [13, 4], [15, 8], [13, 11], [3, 11]], '#d49a4a'); c.rect(3, 5, 10, 1, '#e8b866'); c.rect(4, 6, 8, 1, '#f0c87a')
    c.rect(3, 9, 11, 1, kind === 'bm' ? '#5aa84a' : '#f7f3e8'); c.rect(3, 8, 10, 1, kind === 'bm' ? '#c2503a' : '#f0b429'); if (kind === 'bm') { c.set(6, 8, '#e8a0a0'); c.set(10, 8, '#e8a0a0') } else { c.rect(6, 8, 3, 1, '#f7f3e8'); c.set(7, 8, '#f0b429') }
    c.rect(3, 10, 11, 1, '#a8763a'); c.rect(0, 12, 16, 2, '#e8e2d6'); c.set(2, 12, '#c9c2b0')
  } else if (kind === 'mia') {
    c.rect(4, 2, 8, 11, '#d8e8e0'); c.rect(5, 4, 6, 8, '#b8d86a'); c.rect(5, 4, 6, 1, '#d8ec98'); c.set(6, 7, '#e8f6d0'); c.set(9, 9, '#e8f6d0'); c.rect(4, 12, 8, 1, '#a8b8b0'); c.rect(9, 0, 1, 6, '#4a8f3a'); c.rect(10, 0, 1, 2, '#6ab84a'); c.set(7, 3, '#f2c23c')
  }
  c.outline(0.55); return c
}
for (const [k, nm] of [['pho', 'Tô phở bò (khói bốc)'], ['quay', 'Quẩy giòn'], ['tra', 'Ly trà đá'], ['chanh', 'Cốc trà chanh'], ['bm', 'Bánh mì pate'], ['bmtrung', 'Bánh mì trứng'], ['mia', 'Ly nước mía']])
  def(`food_${k}`, 16, 14, k === 'pho' ? 2 : 1, { anchor: [8, 13], fps: 3, group: 'Món ăn (phở / bánh mì / trà chanh)', desc: nm + '; neo = giữa đáy', replaces: 'gfx.icon(kind)' }, (f) => food(k, f))
