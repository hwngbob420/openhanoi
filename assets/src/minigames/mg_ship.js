// ───────── Mini-game shipper ngõ sâu (nhìn từ trên, cuộn dọc; ngõ x 92..228, tường hai bên rộng 92) ─────────
const G_SH = 'Shipper ngõ sâu (nhìn từ trên)'

// khối nhà hai bên ngõ, lát dọc 40px: mái + mép tường quay ra ngõ (cửa sổ, cục nóng, chậu cây, dây phơi)
function alleyWall(side, v) {
  const W = 92, H = 40, c = NEW(W, H), r = rngOf(31 + v * 7 + (side > 0 ? 50 : 0))
  const roofs = [['#a85a3c', '#7d3a2c', '#cc7f50'], ['#b8ae9e', '#8a8070', '#d8d0c0'], ['#8c4a38', '#6a3428', '#a85a3c']]
  const walls = ['#d9a441', '#e8d8b0', '#c98a78', '#a8c8a8', '#d8b8a0']
  // 2 căn mỗi ô: căn 0 (y 0..19), căn 1 (y 20..39)
  for (let k = 0; k < 2; k++) {
    const y0 = k * 20, rf = roofs[(v + k + (side > 0 ? 1 : 0)) % 3], wall = walls[(v * 2 + k + (side > 0 ? 2 : 0)) % 5]
    const edge = side < 0 ? W - 10 : 0                      // phần tường nhìn thấy, sát ngõ
    const rx0 = side < 0 ? 0 : 10, rw = W - 10
    c.rect(rx0, y0, rw, 17, rf[0])
    if (rf[0] === '#b8ae9e') { noise(c, rx0, y0, rw, 17, '#a69c8c', 0.2, v * 3 + k); c.rect(rx0 + 10 + k * 30, y0 + 3, 8, 5, '#d4d9de'); c.rect(rx0 + 10 + k * 30, y0 + 3, 8, 1, '#f4f6f8'); c.rect(rx0 + 30 - k * 10, y0 + 9, 3, 3, '#a85a3c'); c.ell(rx0 + 31.5 - k * 10, y0 + 8.5, 2.5, 2, '#4a8f45') }
    else for (let y = y0 + 1; y < y0 + 17; y += 3) { c.rect(rx0, y, rw, 1, rf[1]); for (let x = rx0 + 1; x < rx0 + rw; x += 4) c.set(x + (y % 2) * 2, y + 1, rf[2]) }
    c.rect(rx0, y0 + 16, rw, 1, rf[1]); c.rect(rx0, y0 + 17, rw, 3, sh(wall, 0.3))         // mặt tường hướng nam (thấy một dải)
    // mép tường dọc ngõ
    c.rect(edge, y0, 10, 20, wall); c.rect(side < 0 ? edge + 9 : edge, y0, 1, 20, sh(wall, 0.35)); c.rect(edge, y0, 10, 1, hi(wall, 0.3))
    const wx = side < 0 ? edge + 2 : edge + 3
    c.rect(wx, y0 + 4, 5, 7, '#2f5d3a'); c.rect(wx + 1, y0 + 5, 3, 5, '#3a2e2a'); c.set(wx + 1, y0 + 5, '#fbe08a')
    if (r() < 0.6) { c.rect(wx, y0 + 13, 5, 3, '#e8e8ea'); c.rect(wx, y0 + 15, 5, 1, '#9aa3ad') }                     // cục nóng
    else { c.rect(wx + 1, y0 + 13, 3, 3, '#a85a3c'); c.ell(wx + 2.5, y0 + 12.5, 2.5, 2, '#d9629a') }                    // chậu hoa giấy
  }
  // dây điện/ống nước bò trên tường
  c.line(side < 0 ? W - 2 : 1, 0, side < 0 ? W - 2 : 1, H - 1, '#3a3d48')
  return c
}
for (const v of [0, 1]) {
  def(`ship_wall_l_${v}`, 92, 40, 1, { anchor: [0, 0], group: G_SH, desc: `Dãy nhà bên TRÁI ngõ (mái ngói/sân thượng + mép tường cửa sổ, cục nóng, chậu hoa); lát dọc liền 40px, mẫu ${v}`, replaces: 'ship.js wall(0,92,-1)' }, () => alleyWall(-1, v))
  def(`ship_wall_r_${v}`, 92, 40, 1, { anchor: [0, 0], group: G_SH, desc: `Dãy nhà bên PHẢI ngõ; lát dọc liền 40px, mẫu ${v}; đặt x=228`, replaces: 'ship.js wall(228,92,1)' }, () => alleyWall(1, v))
}
def('ship_floor', 136, 48, 1, { anchor: [0, 0], group: G_SH, desc: 'Mặt ngõ bê tông: rãnh thoát nước 2 bên, nắp cống, vết nứt; lát dọc liền 48px; đặt x=92', replaces: 'ship.js mặt ngõ + vạch' }, () => {
  const c = NEW(136, 48)
  c.rect(0, 0, 136, 48, '#9b9488'); noise(c, 0, 0, 136, 48, '#8a8478', 0.22, 21); noise(c, 0, 0, 136, 48, '#aca598', 0.12, 22)
  c.rect(0, 0, 4, 48, '#6e6a62'); c.rect(132, 0, 4, 48, '#6e6a62'); c.rect(1, 0, 2, 48, '#4a4740'); c.rect(133, 0, 2, 48, '#4a4740')
  for (let y = 0; y < 48; y += 4) { c.set(1, y, '#7a766e'); c.set(134, y + 2, '#7a766e') }
  c.rect(62, 9, 12, 7, '#5a5850'); c.rect(63, 10, 10, 5, '#4a4740'); for (let x = 64; x < 72; x += 2) c.rect(x, 10, 1, 5, '#6e6a62')
  c.line(20, 3, 26, 8, '#7a766e'); c.line(26, 8, 24, 13, '#7a766e'); c.line(100, 30, 108, 36, '#7a766e'); c.line(40, 40, 46, 42, '#7a766e'); c.rect(20, 30, 3, 2, '#6aa84a'); c.set(112, 8, '#6aa84a')
  for (const y of [23, 47]) c.rect(4, y, 128, 1, '#8e887c')
  return c
})
def('ship_wires', 136, 14, 1, { anchor: [0, 0], group: G_SH, desc: 'Dây điện chằng chịt vắt ngang ngõ (vẽ trên cùng); đặt x=92, cuộn theo ngõ hoặc cố định', replaces: 'ship.js dây điện' }, () => {
  const c = NEW(136, 14)
  for (const [y0, y1, col] of [[2, 6, '#26232a'], [4, 3, '#3a3d48'], [6, 9, '#26232a'], [9, 7, '#2a3b4a']]) for (let x = 0; x < 136; x++) { const t = x / 135, y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 3); c.set(x, y, col) }
  c.rect(40, 7, 4, 3, '#3a3d48'); c.rect(41, 10, 2, 1, '#26232a')                     // hộp nối
  c.rect(90, 6, 2, 2, '#4a4652'); c.rect(91, 4, 2, 2, '#4a4652'); c.set(93, 4, '#e0a52a')  // chim sẻ đậu dây
  return c
})
// cửa nhà có biển số xanh (biển trống — code ghi số): khung 0 thường, 1 sáng (tới lượt giao), 2 đã giao (đèn xanh)
function door(side, st) {
  const c = NEW(16, 32)
  c.rect(1, 8, 14, 24, '#3a2e2a'); c.rect(2, 9, 12, 23, st === 2 ? '#4a8f5a' : st === 1 ? '#e8c060' : '#8a5a3a')
  for (let y = 11; y < 31; y += 3) c.rect(2, y, 12, 1, st === 2 ? '#3a7a48' : st === 1 ? '#f6e08a' : '#6e4428')
  c.rect(7, 9, 1, 23, sh(st === 1 ? '#e8c060' : '#8a5a3a', 0.4)); c.set(6, 20, '#e0b030'); c.set(9, 20, '#e0b030')
  c.rect(2, 0, 12, 7, '#1f4a9a'); c.rect(3, 1, 10, 5, '#2f62c9'); c.rect(3, 1, 10, 1, '#4a7ad8')                // biển số nhà xanh (trống: code ghi số trắng 3x5 vào ô x 3..12, y 1..5)
  if (st === 1) { c.rect(0, 7, 16, 1, '#fbe08a') }
  c.outline(0.55); return side > 0 ? flipCv(c) : c
}
def('ship_door_l', 16, 32, 3, { anchor: [8, 31], fps: 0, group: G_SH, desc: 'Cửa nhà bên trái ngõ + biển số nhà xanh trống (code ghi số trắng 3x5 vào ô x 3..12, y 1..5); khung 0 thường / 1 sáng tới lượt / 2 đã giao', replaces: 'ship.js cửa nhà' }, (f) => door(-1, f))
def('ship_door_r', 16, 32, 3, { anchor: [8, 31], fps: 0, group: G_SH, desc: 'Cửa nhà bên phải ngõ (như trên)', replaces: 'ship.js cửa nhà' }, (f) => door(1, f))
def('ship_parcel', 12, 12, 1, { anchor: [6, 11], group: G_SH, desc: 'Gói hàng thùng các-tông dán băng keo + nhãn; neo = giữa đáy', replaces: 'ship.js parcel' }, () => {
  const c = NEW(12, 12), A = '#d9a45a'
  c.rect(1, 3, 10, 8, A); c.rect(1, 1, 10, 3, hi(A, 0.25)); c.rect(9, 3, 2, 8, sh(A, 0.25)); c.rect(5, 1, 2, 10, '#c8b890'); c.rect(2, 6, 3, 2, '#f4efe2'); c.set(3, 6, '#2f62c9')
  c.outline(0.55); return c
})
def('ship_parcel_s', 8, 8, 1, { anchor: [4, 4], group: G_SH, desc: 'Gói hàng nhỏ khi ném (tâm)', replaces: 'ship.js gói bay' }, () => { const c = NEW(8, 8), A = '#d9a45a'; c.rect(1, 2, 6, 5, A); c.rect(1, 1, 6, 2, hi(A, 0.25)); c.rect(3, 1, 2, 6, '#c8b890'); c.outline(0.55); return c })
for (const v of [0, 1]) def(`ship_pot_${v}`, 14, 20, 1, { anchor: [7, 19], group: G_SH, desc: v ? 'Chậu hoa giấy hồng' : 'Chậu cây cảnh (cây lưỡi hổ)', replaces: 'ship.js pot' }, () => {
  const c = NEW(14, 20), P = '#b5562f'
  c.rect(3, 12, 8, 7, P); c.rect(2, 11, 10, 2, hi(P, 0.25)); c.rect(9, 13, 2, 6, sh(P, 0.3)); c.rect(3, 18, 8, 1, sh(P, 0.4))
  if (v) { c.ell(7, 7, 6, 5, '#3a8040'); for (const [x, y] of [[3, 5], [6, 3], [9, 5], [5, 8], [10, 8], [7, 6]]) c.rect(x, y, 2, 2, '#d9629a'); c.set(6, 3, '#f09ac0') }
  else for (const [x, h] of [[4, 8], [6, 11], [8, 9], [10, 7]]) { c.rect(x, 12 - h, 2, h, '#3a8040'); c.set(x, 12 - h, '#a8cf6a'); c.set(x + 1, 12 - h + 3, '#d8c860') }
  c.outline(0.55); return c
})
// mèo cam đi ngang ngõ (nhìn ngang, 4 khung)
function cat(f) {
  const c = NEW(16, 12), O = '#e0903a', Od = sh(O, 0.3), Ol = hi(O, 0.3)
  c.rect(3, 4, 9, 4, O); c.rect(3, 4, 9, 1, Ol); for (const x of [5, 8]) c.set(x, 5, Od)
  c.rect(11, 1, 4, 4, O); c.set(11, 0, O); c.set(14, 0, O); c.set(13, 2, '#26232a'); c.set(15, 3, '#e8a0a0'); c.set(12, 4, '#fbf6e8')
  const tail = [[2, 3], [1, 2], [1, 1]][f % 3]; c.line(3, 4, tail[0], tail[1], O); c.set(0, f % 2, Od)
  const legs = [[4, 6, 9, 11], [5, 7, 8, 10], [4, 6, 9, 11], [3, 7, 10, 10]][f]
  for (const x of legs) c.rect(x, 8, 1, 3, x % 2 ? Od : O)
  c.outline(0.5); return c
}
def('ship_cat', 16, 12, 4, { anchor: [8, 11], fps: 8, group: G_SH, desc: 'Mèo cam đi ngang (quay mặt phải; lật để đi trái); neo = giữa đáy', replaces: 'ship.js cat' }, (f) => cat(f))
def('ship_cart', 28, 26, 1, { anchor: [14, 25], group: G_SH, desc: 'Xe đẩy bán hoa quả rong (dưa hấu, chuối, xoài) có ô che; neo = giữa đáy', replaces: 'ship.js cart' }, () => {
  const c = NEW(28, 26), Wd = '#8a5a3a'
  c.rect(2, 13, 24, 7, Wd); c.rect(2, 13, 24, 1, hi(Wd, 0.3)); c.rect(2, 19, 24, 1, sh(Wd, 0.3)); c.rect(0, 12, 28, 2, '#a8763a')
  c.ell(7, 11, 4, 3, '#3a8040'); c.rect(4, 10, 6, 1, '#6aa84a'); c.ell(15, 11, 3, 2.5, '#f2c23c'); c.rect(13, 10, 4, 1, '#fbe08a'); c.ell(21, 11, 3.5, 2.5, '#e0903a'); c.set(20, 10, '#f2b060')
  c.rect(4, 20, 4, 4, '#26232a'); c.rect(20, 20, 4, 4, '#26232a'); c.set(5, 21, '#7d8794'); c.set(21, 21, '#7d8794')
  c.rect(13, 2, 1, 10, '#5a5e6c'); c.poly([[4, 4], [13, 0], [23, 4], [22, 6], [5, 6]], '#2f62c9'); for (let x = 6; x < 22; x += 4) c.rect(x, 4, 2, 2, '#f4efe2')
  c.outline(0.55); return c
})
// shipper chạy xe máy nhìn từ sau (đi lên): áo khoác xanh lá, mũ bảo hiểm, thùng hàng sau xe
function shipper(f) {
  // áo khoác = màu KHOÁ áo người chơi (#3a8f8a/#2a6a6c/#6cc1b0) -> đổi theo trang phục (recolor:'outfit'); mũ bảo hiểm xanh lá cố định
  const c = NEW(22, 38), J = '#3a8f8a', Jd = '#2a6a6c', Jl = '#6cc1b0', HM = '#2fae5a', BOX = '#e8a03a'
  const lean = f === 2 ? -1 : f === 3 ? 1 : 0, vib = f === 1 ? 1 : 0
  const X = (x) => x + lean
  // bánh trước (xa, phía trên) + tay lái + gương
  c.rect(9 + lean, 1, 4, 5, '#26232a'); c.rect(X(2), 8, 18, 2, '#3a3540'); c.rect(X(1), 6, 2, 2, '#9aa3ad'); c.rect(X(19), 6, 2, 2, '#9aa3ad')
  // người: mũ, vai, lưng áo khoác (logo trống), tay ra ghi-đông
  c.ell(X(11), 9.5 + vib, 4.6, 4.2, HM); c.rect(X(8), 7 + vib, 3, 1, hi(HM, 0.35)); c.rect(X(7), 12 + vib, 9, 1, sh(HM, 0.3))
  c.rect(X(5), 13 + vib, 12, 10, J); c.rect(X(5), 13 + vib, 12, 1, Jl); c.rect(X(15), 14 + vib, 2, 9, Jd); c.rect(X(8), 16 + vib, 6, 3, Jl)
  c.rect(X(3), 10, 2, 6, J); c.rect(X(17), 10, 2, 6, J); c.rect(X(3), 9, 2, 1, '#f0c49a'); c.rect(X(17), 9, 2, 1, '#f0c49a')
  // yên + thân xe + thùng hàng sau
  c.rect(X(7), 23 + vib, 8, 2, '#2a2630'); c.rect(X(6), 25, 10, 3, '#c9302a')
  c.rect(X(3), 26, 16, 9, BOX); c.rect(X(3), 26, 16, 1, hi(BOX, 0.3)); c.rect(X(17), 27, 2, 8, sh(BOX, 0.3)); c.rect(X(3), 30, 16, 1, sh(BOX, 0.25)); c.rect(X(8), 28, 6, 2, '#fbf6e8')
  c.rect(X(9), 35, 4, 3, '#26232a'); c.set(X(10), 35 + (vib ? 1 : 0), '#4a4652'); c.rect(X(9), 34, 4, 1, '#e0463a')
  c.outline(0.55); return c
}
def('ship_rider', 22, 38, 4, { anchor: [11, 37], fps: 12, recolor: 'outfit', group: G_SH, desc: 'Shipper nhìn từ sau: áo khoác theo màu áo trang phục, mũ bảo hiểm, thùng hàng cam. Khung 0–1 chạy thẳng (rung), 2 nghiêng trái, 3 nghiêng phải; neo = bánh sau', replaces: 'ship.js người chơi trên xe' }, (f) => shipper(f))
