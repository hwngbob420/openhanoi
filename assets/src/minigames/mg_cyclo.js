// ───────── Mini-game xích lô Hồ Gươm (nhìn ngang bờ hồ, khung logic 320x180) ─────────
const G_CY = 'Xích lô Hồ Gươm (nhìn ngang)'

// chân đạp: hông (hx,hy) -> bàn đạp (px,py), đùi a, cẳng b; đầu gối nhô về phía trước (+x)
function legIK(cv, hx, hy, px, py, a, b, col, shoe) {
  const dx = px - hx, dy = py - hy, d = Math.min(Math.hypot(dx, dy), a + b - 0.01)
  const t = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - t * t))
  const ux = dx / d, uy = dy / d
  const kx = hx + ux * t + uy * h, ky = hy + uy * t - ux * h          // gối lệch về phía trước-trên
  const thick = (x0, y0, x1, y1) => { cv.line(x0, y0, x1, y1, col); cv.line(x0 + 1, y0, x1 + 1, y1, col); cv.line(x0, y0 + 1, x1, y1 + 1, col) }
  thick(hx, hy, kx, ky); thick(kx, ky, px, py)
  cv.rect(Math.round(px) - 1, Math.round(py), 3, 1, shoe)
}
// Xích lô: người đạp ngồi sau (màu khoá => đổi theo trang phục), khách Tây ngồi trước dưới mui. 64x48, chân xe ở (32,47)
function cyclo(f) {
  const W = 64, H = 48
  const wheelsB = NEW(W, H), frame = NEW(W, H), legsFar = NEW(W, H), rider = NEW(W, H), legsNear = NEW(W, H), pax = NEW(W, H), wheelsF = NEW(W, H), hood = NEW(W, H)
  const ph = f * Math.PI / 16
  // bánh: sau to (người đạp), hai bánh trước nhỏ dưới thùng khách (bánh xa tối hơn, lệch nhẹ)
  spokeWheel(wheelsB, 52, 40.5, 6.5, ph, { tire: '#1c1a1f', rim: '#6a7480', spoke: '#5a6470' })
  spokeWheel(wheelsB, 13, 38.5, 9, ph)
  spokeWheel(wheelsF, 47, 41, 6.5, ph)
  // khung sắt
  const T = '#3a3d48', Tl = '#5a5e6c'
  frame.line(14, 25, 13, 38, T); frame.line(15, 25, 14, 38, T)                // cọc yên -> trục bánh sau
  frame.line(15, 26, 23, 38, T); frame.line(16, 26, 24, 38, Tl)               // ống chéo -> giò đạp
  frame.line(13, 38, 23, 38, T)                                                // gióng xích
  frame.line(23, 38, 36, 36, T); frame.line(23, 37, 36, 35, Tl)               // ống ngang -> gầm thùng
  frame.rect(11, 23, 8, 2, '#2a2630'); frame.rect(12, 22, 6, 1, '#4a4652')      // yên xe
  frame.ell(23.5, 38.5, 2.2, 2.2, '#7d8794'); frame.set(23, 38, '#c8ced6')       // đĩa xích
  frame.line(20, 25, 28, 23, T); frame.rect(27, 22, 3, 2, T)                   // ghi-đông nối lưng thùng
  frame.rect(22, 22, 2, 2, '#e0b030'); frame.set(22, 22, '#fbe08a')             // chuông
  // thùng khách: ghế đệm, lưng cong, thành sườn đỏ sẫm, bậc để chân trước
  const R0 = '#b23a2e', Rd = sh(R0, 0.32), Rl = hi(R0, 0.28), CR = '#efe6d2'
  frame.poly([[28, 22], [33, 20], [36, 28], [56, 30], [60, 36], [58, 38], [34, 38], [29, 34]], R0)
  frame.poly([[29, 23], [32, 22], [34, 29], [31, 33]], Rd)                       // lưng ghế (trong)
  frame.rect(34, 28, 20, 3, CR); frame.rect(34, 28, 20, 1, '#fffaf0')            // nệm ghế
  frame.line(29, 34, 58, 37, Rd); frame.line(30, 24, 34, 21, Rl); frame.line(36, 31, 55, 33, Rl)
  frame.rect(36, 33, 3, 2, '#e0b030'); frame.rect(52, 34, 3, 2, '#e0b030')       // đinh tán đồng
  frame.rect(55, 38, 8, 2, '#5a5e6c'); frame.rect(56, 37, 6, 1, '#7d8794')       // bậc để chân
  frame.line(58, 38, 52, 41, T)                                                  // càng trước
  // mui che: vải xanh sẫm, khung nan, xếp nếp phía sau
  const M = '#2e4a5e', Md = sh(M, 0.35), Ml = hi(M, 0.22)
  hood.poly([[27, 22], [26, 14], [29, 7], [35, 4], [50, 4], [53, 6], [52, 8], [36, 8], [32, 11], [31, 22]], M)
  hood.line(27, 21, 27, 14, Md); hood.line(28, 13, 30, 9, Md)
  hood.line(35, 5, 50, 5, Ml); hood.line(31, 9, 34, 6, Ml)
  for (const x of [33, 39, 45]) hood.line(x, 5, x - 1, 8, Md)
  hood.rect(50, 7, 3, 1, Md); hood.line(52, 8, 54, 26, '#5a5e6c')               // thanh chống mui
  // khách: khách Tây ngồi ghế, mũ cói
  person(pax, 33, 9, { ...PED_LOOKS[7], hat: 'cap', hatC: '#d8c088' }, { dir: 'right', legs: 'sit', aS: 'lap' })
  outlineInk(pax)
  // người đạp: thân trên (màu khoá) ngồi yên, tay vươn tới ghi-đông, chân đạp theo pha
  person(rider, 9, 2, KEY_LOOK, { dir: 'right', legs: 'none', aS: 'fwd', U: 1 })
  const hipX = 15, hipY = 23
  const a = f * Math.PI / 2, rr = 3.2
  const pN = [23.5 + Math.cos(a) * rr, 38.5 + Math.sin(a) * rr], pF = [23.5 - Math.cos(a) * rr, 38.5 - Math.sin(a) * rr]
  legIK(legsFar, hipX, hipY, pF[0], pF[1], 8.5, 9, KEY.pants[1], '#b9ae96')
  legIK(legsNear, hipX + 1, hipY, pN[0], pN[1], 8.5, 9, KEY.pants[0], '#efe6d2')
  rider.rect(10, 22, 7, 2, KEY.pants[0]); rider.rect(10, 23, 7, 1, KEY.pants[1])  // mông trên yên
  legsFar.rect(Math.round(pF[0]) - 1, Math.round(pF[1]) + 1, 3, 1, '#5a5e6c'); legsNear.rect(Math.round(pN[0]) - 1, Math.round(pN[1]) + 1, 3, 1, '#7d8794')  // bàn đạp
  const body = comp(W, H, [{ cv: legsFar }, { cv: rider }, { cv: legsNear }])
  outlineInk(body)
  return comp(W, H, [{ cv: wheelsB }, { cv: frame, ol: 'warm', k: 0.5 }, { cv: hood, ol: 'warm', k: 0.5 }, { cv: pax }, { cv: wheelsF }, { cv: body }])
}
def('cyclo', 64, 48, 4, { anchor: [32, 47], fps: 10, recolor: 'outfit', group: G_CY, desc: 'Xích lô có mui che, bánh nan quay, người đạp (màu theo trang phục) + khách Tây; khung 0–3 = một vòng đạp. Đặt chân xe (32,47) xuống mặt đường', replaces: 'cyclo.js: thùng xe + wheel() + person người đạp + npc khách' }, (f) => cyclo(f))

// Tháp Rùa trên gò giữa hồ (xa)
def('cy_turtle_tower', 34, 40, 1, { anchor: [17, 39], group: G_CY, desc: 'Tháp Rùa xa trên gò cỏ, cây xanh; neo = giữa đáy (đặt ngang mặt hồ)', replaces: 'cyclo.js lm(400)/lm(3300) Tháp Rùa' }, () => {
  const c = NEW(34, 40), S = '#d8c8a0', Sd = sh(S, 0.3), Sl = hi(S, 0.3), WIN = '#4a3a2e'
  c.ell(17, 37, 16, 3, '#4a7a48'); c.ell(17, 36, 14, 2.4, '#5a8f50'); c.rect(4, 38, 26, 2, '#2f5a45')
  c.ell(5, 30, 4, 5, '#3a8040'); c.ell(29, 31, 4, 4.5, '#3a8040'); c.ell(4, 29, 2, 2, '#6aa84a'); c.ell(28, 30, 2, 2, '#6aa84a')
  // 3 tầng thu nhỏ dần
  const tier = (x0, x1, y0, y1, arch) => { c.rect(x0, y0, x1 - x0, y1 - y0, S); c.rect(x1 - 2, y0, 2, y1 - y0, Sd); c.rect(x0, y0, 1, y1 - y0, Sl); for (const ax of arch) { c.rect(ax, y0 + 2, 2, y1 - y0 - 2, WIN); c.set(ax, y0 + 1, WIN) } }
  tier(9, 25, 26, 35, [12, 16, 20]); c.rect(8, 25, 18, 1, Sd)
  tier(11, 23, 18, 25, [14, 18]); c.rect(10, 17, 14, 1, Sd)
  tier(13, 21, 11, 17, [16]); c.rect(12, 10, 10, 1, Sd)
  c.poly([[13, 10], [17, 3], [21, 10]], '#3a6a50'); c.line(17, 3, 21, 10, sh('#3a6a50')); c.rect(16, 0, 2, 3, '#e0b030')
  c.outline(0.45); return c
})
// Đền Ngọc Sơn + cầu Thê Húc đỏ (xa)
def('cy_ngocson', 96, 34, 1, { anchor: [48, 33], group: G_CY, desc: 'Cầu Thê Húc cong đỏ dẫn vào đền Ngọc Sơn mái ngói, cây đa; neo = giữa đáy', replaces: 'cyclo.js lm(1250) + lm(2300)' }, () => {
  const c = NEW(96, 34), RD = '#c9302a', RDd = sh(RD, 0.3)
  c.ell(70, 31, 26, 3, '#4a7a48'); c.rect(46, 31, 50, 3, '#2f5a45')
  c.ell(84, 17, 10, 10, '#2f6a3a'); c.ell(80, 13, 6, 6, '#3a8040'); c.ell(88, 12, 4, 4, '#6aa84a')      // cây đa
  // đền: tường vàng, mái ngói 2 tầng cong
  c.rect(58, 20, 24, 11, '#e0c078'); c.rect(80, 20, 2, 11, sh('#e0c078')); for (const x of [61, 67, 73]) c.rect(x, 23, 3, 8, '#5a2a22')
  c.poly([[55, 21], [57, 16], [83, 16], [85, 21]], '#8a3a2a'); c.rect(56, 20, 29, 1, '#6a2a20'); c.set(55, 21, '#a84a32'); c.set(85, 21, '#a84a32')
  c.rect(62, 12, 16, 4, '#e0c078'); c.poly([[60, 13], [62, 9], [78, 9], [80, 13]], '#8a3a2a'); c.set(59, 12, '#a84a32'); c.set(80, 12, '#a84a32'); c.rect(69, 7, 2, 2, '#e0b030')
  // cầu cong
  for (let x = 2; x <= 58; x++) { const t = (x - 2) / 56, y = Math.round(26 - Math.sin(t * Math.PI) * 9); c.rect(x, y, 1, 2, RD); c.set(x, y + 2, RDd); if (x % 4 === 0) c.rect(x, y - 3, 1, 3, RD) }
  for (let x = 2; x <= 58; x++) { const t = (x - 2) / 56, y = Math.round(23 - Math.sin(t * Math.PI) * 9); c.set(x, y, hi(RD, 0.2)) }
  for (const x of [10, 22, 34, 46]) { const t = (x - 2) / 56, y = Math.round(28 - Math.sin(t * Math.PI) * 9); c.rect(x, y, 2, 33 - y, RDd) }
  c.rect(0, 25, 4, 7, '#d8c8a0'); c.rect(0, 22, 4, 3, '#8a3a2a')               // cổng Đắc Nguyệt
  c.outline(0.45); return c
})
// bờ xa: dãy phố cổ + cây, lát ngang liền mạch 160px
def('cy_far_shore', 160, 36, 1, { anchor: [0, 35], group: G_CY, desc: 'Bờ hồ bên kia: nhà ống mái ngói, ban công, cây; ghép ngang liền (lặp mỗi 160px); đáy = mép nước', replaces: 'cyclo.js vòng for nhà cổ + cây' }, () => {
  const c = NEW(160, 36), r = rngOf(77)
  const walls = ['#d9b070', '#e8cfa0', '#c9a0a0', '#a8c0a8', '#e0c88a', '#d8b8a0']
  let x = 0, i = 0
  while (x < 160) {
    const w = 14 + Math.floor(r() * 8), h = 14 + Math.floor(r() * 12), col = walls[i % walls.length], y0 = 33 - h
    for (let k = 0; k < w; k++) { const X = (x + k) % 160; c.rect(X, y0, 1, h, k >= w - 2 ? sh(col, 0.2) : col) }
    const roof = r() < 0.6
    for (let k = -1; k <= w; k++) { const X = (x + k + 160) % 160; if (roof) { c.rect(X, y0 - 3, 1, 3, k % 3 === 0 ? '#8a3a2a' : '#a84a32'); c.set(X, y0 - 3, '#c4603c') } else { c.set(X, y0 - 1, '#9b856b') } }
    for (let wy = y0 + 3; wy < 30; wy += 6) for (let wx = 2; wx < w - 3; wx += 5) { const X = (x + wx) % 160; c.rect(X, wy, 2, 3, '#2f5a45'); c.set(X, wy, '#4a7d5c'); if (r() < 0.35) c.set((X + 1) % 160, wy + 1, '#fbe08a') }
    if (h > 18) { const by = y0 + 9; for (let k = 1; k < w - 1; k++) c.set((x + k) % 160, by, '#2a2630') }
    x += w; i++
  }
  for (let t = 0; t < 9; t++) { const tx = Math.floor(r() * 160), rad = 4 + r() * 4; for (let yy = -rad; yy <= rad; yy++) for (let xx = -rad - 1; xx <= rad + 1; xx++) if ((xx * xx) / ((rad + 1) * (rad + 1)) + (yy * yy) / (rad * rad) <= 1) c.set(((tx + xx) % 160 + 160) % 160, Math.round(30 + yy - rad * 0.4), yy < -rad * 0.3 && xx < 0 ? '#6aa84a' : '#3a8040') }
  c.rect(0, 33, 160, 3, '#4a7a48'); for (let k = 0; k < 160; k += 3) c.set(k, 33, '#6aa84a')
  return c
})
// mặt hồ lát 64x52, 4 khung lăn tăn
def('cy_water', 64, 52, 4, { anchor: [0, 0], fps: 4, group: G_CY, desc: 'Mặt hồ xanh lục (Hồ Gươm), sóng lăn tăn + phản chiếu; ghép ngang liền; neo = góc trên-trái', replaces: 'cyclo.js R(... #5f9fb8) + vệt sóng' }, (f) => {
  const c = NEW(64, 52), A = '#52949a', r = rngOf(9)
  for (let y = 0; y < 52; y++) { const t = y / 52; c.rect(0, y, 64, 1, t < 0.15 ? '#8cbfba' : t < 0.4 ? '#6aa8a8' : t < 0.75 ? A : '#3f8088') }
  for (let k = 0; k < 26; k++) {
    const y = Math.floor(r() * 50), x0 = Math.floor(r() * 64), len = 2 + Math.floor(r() * (3 + y / 10)), sp = 1 + (k % 3)
    const x = (x0 + f * sp) % 64, col = y < 20 ? '#c6e3d8' : '#8cbfba'
    for (let i = 0; i < len; i++) c.set((x + i) % 64, y, col)
    if (y > 25 && k % 2) for (let i = 1; i < len - 1; i++) c.set((x + i + 1) % 64, y + 1, '#2f7080')
  }
  return c
})
// liễu rủ đung đưa
def('cy_willow', 40, 54, 4, { anchor: [20, 53], fps: 4, group: G_CY, desc: 'Cây liễu bên hồ, cành rủ đung đưa 4 khung; neo = gốc cây', replaces: 'gfx.willow' }, (f) => {
  const c = NEW(40, 54), B = '#5a3d22', Bd = sh(B, 0.3)
  c.rect(18, 22, 4, 31, B); c.rect(21, 22, 1, 31, Bd); c.rect(17, 50, 6, 3, B); c.line(20, 24, 13, 15, B); c.line(21, 24, 27, 14, B); c.set(19, 30, Bd); c.set(19, 38, Bd)
  c.ell(20, 9, 14, 6, '#3a8040'); c.ell(16, 7, 8, 4, '#5a9a4a'); c.ell(26, 8, 6, 3.5, '#4a8f45'); c.ell(14, 5, 4, 2, '#8ac860')
  const sw = [0, 1, 0, -1][f]
  // cành rủ dài như rèm, ngoài sáng trong tối, ngọn đung đưa
  for (let x = 4; x <= 36; x++) {
    if (x % 3 === 2) continue
    const edge = Math.abs(x - 20) / 16, len = Math.round(30 - edge * 14 + ((x * 7) % 5)), y0 = 9 + Math.round(edge * 4)
    const back = (x % 2 === 1)
    for (let k = 0; k < len; k++) { const dx = Math.round(sw * (k / len) * (1 + edge) * 1.5 + Math.sin((x + k) * 0.6) * 0.4); c.set(x + dx, y0 + k, back ? '#3a7a3a' : k % 5 === 0 ? '#b8e080' : k > len - 4 ? '#8ac860' : '#5aa040') }
  }
  c.outline(0.5); return c
})
// cột đèn Hồ Gươm (gang đen, chụp đèn tròn)
def('cy_lamp', 12, 46, 2, { anchor: [6, 45], fps: 1, group: G_CY, desc: 'Cột đèn gang bờ hồ; khung 0 tắt, khung 1 sáng (tối); neo = chân cột', replaces: 'mới' }, (f) => {
  const c = NEW(12, 46), K = '#2a3b4a'
  c.rect(5, 8, 2, 34, K); c.set(5, 10, '#4a6070'); c.rect(3, 40, 6, 3, K); c.rect(2, 43, 8, 2, K); c.rect(4, 22, 4, 2, K)
  c.line(6, 8, 2, 5, K); c.line(6, 8, 10, 5, K)
  for (const x of [2, 10]) { c.ell(x, 3, 2.2, 2.6, f ? '#fff2b0' : '#e8e2d0'); c.set(x - 1, 2, '#fffaf0') }
  c.outline(0.5); return c
})
def('cy_bench', 24, 12, 1, { anchor: [12, 11], group: G_CY, desc: 'Ghế đá bờ hồ nhìn ngang; neo = giữa đáy', replaces: 'mới (ghế đá)' }, () => {
  const c = NEW(24, 12), S = '#b8b2a6', Sd = sh(S, 0.3)
  c.rect(1, 4, 22, 3, S); c.rect(1, 4, 22, 1, hi(S, 0.3)); c.rect(1, 6, 22, 1, Sd); c.rect(3, 7, 3, 5, Sd); c.rect(18, 7, 3, 5, Sd); c.rect(2, 0, 20, 2, S); c.rect(3, 2, 2, 2, Sd); c.rect(19, 2, 2, 2, Sd)
  c.outline(0.5); return c
})
// bờ cỏ + kè đá, lát ngang 32
def('cy_bank', 32, 14, 1, { anchor: [0, 0], group: G_CY, desc: 'Dải cỏ + kè đá sát mép hồ; ghép ngang liền (32px)', replaces: 'cyclo.js R(... #6aa850)' }, () => {
  const c = NEW(32, 14)
  c.rect(0, 0, 32, 3, '#9b9488'); for (let x = 0; x < 32; x += 8) { c.rect(x, 0, 1, 3, '#6e6a62'); c.rect(x + 1, 0, 6, 1, '#c4bcae') }
  c.rect(0, 3, 32, 11, '#5a9a40'); noise(c, 0, 3, 32, 11, '#6aa84a', 0.25, 4); noise(c, 0, 5, 32, 9, '#3a8040', 0.12, 5)
  for (const x of [5, 19, 27]) { c.set(x, 6, '#f2c23c'); c.set(x + 1, 9, '#e8e2d0') }
  c.rect(0, 13, 32, 1, '#c4ae8e'); return c
})
// vỉa hè đá + mặt đường, lát ngang 32x58
def('cy_road', 32, 58, 1, { anchor: [0, 0], group: G_CY, desc: 'Vỉa hè lát đá (trên) + đường nhựa có vạch (dưới); ghép ngang liền; neo = góc trên-trái (y=122)', replaces: 'cyclo.js mặt đường + vạch' }, () => {
  const c = NEW(32, 58)
  c.rect(0, 0, 32, 12, '#c4ae8e'); for (let x = 0; x < 32; x += 8) { c.rect(x, 0, 1, 12, '#9b856b'); } c.rect(0, 5, 32, 1, '#9b856b'); c.rect(0, 0, 32, 1, '#e0d0b0')
  for (let x = 4; x < 32; x += 8) c.rect(x, 6, 1, 6, '#9b856b')
  c.rect(0, 12, 32, 2, '#7d8a9a'); c.rect(0, 12, 32, 1, '#a6b1bd')
  c.rect(0, 14, 32, 44, '#566478'); noise(c, 0, 14, 32, 44, '#4a586a', 0.18, 11); noise(c, 0, 14, 32, 44, '#62708a', 0.08, 12)
  c.rect(4, 34, 14, 2, '#e0d8b8')
  return c
})
def('cy_cloud', 34, 12, 1, { anchor: [0, 0], group: G_CY, desc: 'Đám mây trắng ấm', replaces: 'cyclo.js mây' }, () => {
  const c = NEW(34, 12); c.ell(10, 7, 9, 4.5, '#fbf6e8'); c.ell(20, 5, 9, 5, '#fbf6e8'); c.ell(27, 8, 6, 3.5, '#fbf6e8'); c.rect(3, 9, 29, 2, '#e3ecef'); c.ell(16, 4, 4, 2, '#ffffff'); return c
})
def('ico_warn', 8, 15, 2, { anchor: [4, 14], fps: 5, group: G_CY, desc: 'Dấu ! cảnh báo người sắp sang đường (nháy 2 khung); neo = giữa đáy, đặt trên đầu người', replaces: 'cyclo.js dấu ! đỏ' }, (f) => {
  const c = NEW(8, 15), col = f ? '#ff8a3a' : '#e0302a'
  c.rect(1, 0, 6, 15, '#fbf6e8'); c.rect(0, 1, 8, 13, '#fbf6e8'); c.rect(3, 2, 2, 7, col); c.rect(2, 2, 4, 5, col); c.rect(3, 10, 2, 2, col)
  c.outline(0.7); return c
})
def('fx_bell', 16, 12, 2, { anchor: [8, 11], fps: 6, group: G_CY, desc: 'Hiệu ứng chuông "kính coong" (chuông + vòng sóng); neo = giữa đáy', replaces: 'cyclo.js chấm vàng khi rung chuông' }, (f) => {
  const c = NEW(16, 12), Y = '#f2c23c'
  c.poly([[5, 9], [6, 3], [8, 2], [10, 3], [11, 9]], Y); c.rect(4, 9, 8, 1, sh(Y, 0.3)); c.set(7, 4, '#fbe08a'); c.rect(7, 10, 2, 1, '#b8801c'); c.set(8, 1, sh(Y))
  const arc = f ? 3 : 1
  c.set(2 - arc + 1, 3, '#fbf6e8'); c.set(1 - arc + 1, 5, '#fbf6e8'); c.set(2 - arc + 1, 7, '#fbf6e8'); c.set(13 + arc - 1, 3, '#fbf6e8'); c.set(14 + arc - 1, 5, '#fbf6e8'); c.set(13 + arc - 1, 7, '#fbf6e8')
  c.outline(0.6); return c
})
