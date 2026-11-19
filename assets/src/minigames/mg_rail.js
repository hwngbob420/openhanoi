// ───────── Mini-game gác chắn đường tàu (nhìn từ trên xuống kiểu 3/4, khung 320x180, ray ngang ở y=96) ─────────
const G_RL = 'Gác chắn đường tàu (nhìn từ trên)'

// Tàu Thống Nhất: thân xanh lam, sọc kem-vàng dọc cửa sổ, nóc xám. Nhìn 3/4 từ trên: nóc (trên) + hông gần (dưới).
function trainCar(kind, f, W) {
  const H = 22, c = NEW(W, H)
  const B = '#2f5fa8', Bd = sh(B, 0.3), Bl = hi(B, 0.25), RF = '#9aa7b8', RFd = sh(RF, 0.25), CRM = '#f2e2b0', YL = '#f2c23c'
  // nóc
  c.rect(1, 1, W - 2, 8, RF); c.rect(1, 1, W - 2, 1, hi(RF, 0.35)); c.rect(1, 8, W - 2, 1, RFd)
  // hông
  c.rect(1, 9, W - 2, 10, B); c.rect(1, 9, W - 2, 1, Bl); c.rect(1, 17, W - 2, 2, Bd)
  c.rect(1, 15, W - 2, 1, CRM); c.rect(1, 16, W - 2, 1, YL)
  const GL = '#2a4a5a', GLl = '#8cbfba'
  if (kind === 'coach') {
    for (let x = 6; x < W - 8; x += 7) { c.rect(x, 11, 5, 3, GL); c.set(x + 1, 11, GLl); if (f && (x / 7) % 2 < 1) c.set(x + 3, 12, '#fbe08a') }
    c.rect(2, 10, 3, 6, Bd); c.rect(W - 5, 10, 3, 6, Bd); c.set(3, 12, '#c9c2b0'); c.set(W - 4, 12, '#c9c2b0')      // cửa hai đầu
    for (let x = 5; x < W - 5; x += 8) c.rect(x, 3, 4, 2, RFd)                                                    // quạt thông gió nóc
  } else {
    // đầu máy: buồng lái phía phải (mũi xe), cửa sổ buồng lái, đèn pha, sọc đỏ ở mũi
    c.rect(W - 9, 10, 6, 4, GL); c.set(W - 8, 10, GLl); c.set(W - 7, 10, GLl)
    c.rect(4, 11, 4, 3, GL); for (let x = 11; x < W - 12; x += 4) c.rect(x, 11, 2, 4, Bd)                       // lá tản nhiệt
    c.rect(W - 3, 9, 2, 10, '#c9302a'); c.rect(W - 3, 16, 2, 1, YL); c.rect(W - 2, 12, 1, 2, '#fff6c0')
    c.rect(6, 2, 10, 5, RFd); c.rect(7, 3, 8, 3, '#7d8a9a'); c.rect(W - 12, 3, 6, 3, RFd)                           // quạt két mát trên nóc
    c.rect(20, 2, 3, 2, '#3a3d48')                                                                                   // ống xả
  }
  // giá chuyển hướng + bánh (chạy: vệt sáng trên bánh đổi chỗ)
  const T = '#26232a'
  for (const bx of [4, W - 14]) { c.rect(bx, 19, 10, 2, T); c.set(bx + 2 + f * 4, 19, '#7d8794'); c.set(bx + 6 - f * 4 + 1, 20, '#5a6470') }
  c.rect(0, 12, 1, 3, '#3a3d48'); c.rect(W - 1, 12, 1, 3, '#3a3d48')                                                // móc nối
  c.outline(0.55)
  return c
}
def('rail_loco_r', 42, 22, 2, { anchor: [0, 21], fps: 8, group: G_RL, desc: 'Đầu máy tàu Thống Nhất (xanh, sọc kem-vàng, mũi đỏ) chạy sang phải; neo = góc dưới-trái; đặt đáy ở TRACK_Y+9. Loco+2 toa = 130px = TRAIN_LEN', replaces: 'rail.js khối tàu xanh' }, (f) => trainCar('loco', f, 42))
def('rail_loco_l', 42, 22, 2, { anchor: [0, 21], fps: 8, group: G_RL, desc: 'Đầu máy chạy sang trái (lật)', replaces: 'rail.js khối tàu xanh' }, (f) => flipCv(trainCar('loco', f, 42)))
def('rail_coach', 44, 22, 2, { anchor: [0, 21], fps: 8, group: G_RL, desc: 'Toa khách Thống Nhất (cửa sổ, quạt nóc, khung 1 có đèn trong toa); dùng cho cả 2 chiều', replaces: 'rail.js cửa sổ toa' }, (f) => trainCar('coach', f, 44))

// đường ray lát ngang 16x22: đá ba-lát, tà vẹt bê tông, 2 thanh ray (ray ở hàng 5 và 15 — khớp TRACK_Y-6 và TRACK_Y+4)
function trackTile(cross) {
  const c = NEW(16, 22)
  c.rect(0, 0, 16, 22, '#7a6e60'); noise(c, 0, 0, 16, 22, '#8e8270', 0.3, 3); noise(c, 0, 0, 16, 22, '#5e544a', 0.18, 4)
  if (cross) { c.rect(0, 0, 16, 22, '#566478'); noise(c, 0, 0, 16, 22, '#4a586a', 0.2, 5); c.rect(0, 0, 16, 1, '#7d8a9a') }
  else for (const x of [1, 9]) { c.rect(x, 2, 5, 18, '#a8a49a'); c.rect(x, 2, 5, 1, '#c8c4ba'); c.rect(x + 4, 3, 1, 17, '#7a766e') }
  for (const y of [5, 15]) { c.rect(0, y, 16, 1, '#d8dde2'); c.rect(0, y + 1, 16, 1, '#7d8794'); c.rect(0, y + 2, 16, 1, '#3a3d48') }
  return c
}
def('rail_track', 16, 22, 1, { anchor: [0, 0], group: G_RL, desc: 'Đường ray ghép ngang (ba-lát, tà vẹt, 2 ray); neo = góc trên-trái, đặt y = TRACK_Y-11', replaces: 'rail.js vẽ ray + tà vẹt' }, () => trackTile(false))
def('rail_track_cross', 16, 22, 1, { anchor: [0, 0], group: G_RL, desc: 'Đoạn ray qua mặt đường nhựa (chỗ giao cắt x 134..186)', replaces: 'rail.js đoạn giao cắt' }, () => trackTile(true))

// cột đèn + biển chéo cảnh báo, 2 khung nháy luân phiên
def('rail_signal', 14, 26, 2, { anchor: [7, 25], fps: 4, group: G_RL, desc: 'Cột tín hiệu: biển chữ X trắng viền đỏ + 2 đèn đỏ nháy luân phiên (khung 0/1); khi không cảnh báo dùng khung 0 và tô tối đèn bằng code hoặc dùng rail_signal_off', replaces: 'rail.js drawBar: cột + đèn' }, (f) => {
  const c = NEW(14, 26)
  c.rect(6, 6, 2, 19, '#f4efe2'); for (let y = 7; y < 24; y += 4) c.rect(6, y, 2, 2, '#26232a'); c.rect(4, 23, 6, 2, '#5a5e6c')
  c.line(1, 0, 12, 5, '#f4efe2'); c.line(12, 0, 1, 5, '#f4efe2'); c.line(1, 1, 12, 6, '#d4382c'); c.line(12, 1, 1, 6, '#d4382c')
  c.rect(1, 8, 12, 4, '#26232a'); const on = '#ff3b2f', off = '#5a2020'
  c.ell(3.5, 10, 1.8, 1.8, f ? off : on); c.ell(10.5, 10, 1.8, 1.8, f ? on : off); if (!f) c.set(3, 9, '#ffb0a0'); else c.set(10, 9, '#ffb0a0')
  c.outline(0.6); return c
})
def('rail_signal_off', 14, 26, 1, { anchor: [7, 25], group: G_RL, desc: 'Cột tín hiệu khi không có tàu (đèn tắt)', replaces: 'rail.js drawBar: cột + đèn' }, () => {
  const c = NEW(14, 26)
  c.rect(6, 6, 2, 19, '#f4efe2'); for (let y = 7; y < 24; y += 4) c.rect(6, y, 2, 2, '#26232a'); c.rect(4, 23, 6, 2, '#5a5e6c')
  c.line(1, 0, 12, 5, '#f4efe2'); c.line(12, 0, 1, 5, '#f4efe2'); c.line(1, 1, 12, 6, '#d4382c'); c.line(12, 1, 1, 6, '#d4382c')
  c.rect(1, 8, 12, 4, '#26232a'); c.ell(3.5, 10, 1.8, 1.8, '#5a2020'); c.ell(10.5, 10, 1.8, 1.8, '#5a2020')
  c.outline(0.6); return c
})
// cần chắn sọc đỏ-trắng, 5 khung từ dựng đứng (0) tới nằm ngang (4); trục quay ở (4,21)
function boom(ang) {
  const c = NEW(58, 24), px = 4, py = 21
  const ex = px + 50 * ang, ey = py - (1 - ang) * 18
  const n = 30
  for (let i = 0; i <= n; i++) { const t = i / n, x = px + (ex - px) * t, y = py + (ey - py) * t; c.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 2, Math.floor(i / 4) % 2 ? '#f4efe2' : '#d4382c') }
  c.outline(0.55)
  c.rect(1, 17, 7, 7, '#5a5e6c'); c.rect(1, 17, 7, 1, '#7d8794'); c.rect(3, 19, 3, 3, '#3a3d48'); c.set(4, 20, '#e0b030')
  return c
}
def('rail_boom', 58, 24, 5, { anchor: [4, 21], fps: 0, group: G_RL, desc: 'Cần chắn barie + hộp trục: khung 0 dựng lên … khung 4 hạ ngang (dài 50px sang phải). Chọn khung = round(S.bar*4); neo = trục quay (4,21) — đặt vào (px,py) của drawBar', replaces: 'rail.js drawBar (cần chắn)' }, (f) => boom(f / 4))
def('rail_boom_l', 58, 24, 5, { anchor: [53, 21], fps: 0, group: G_RL, desc: 'Cần chắn quay sang trái (lật); neo = trục (53,21)', replaces: 'rail.js drawBar (sx=-1)' }, (f) => flipCv(boom(f / 4)))

// nhà ống nhìn từ trên 3/4: mái (ngói / sân thượng có bồn nước inox) + mặt tiền 2 tầng ban công + tầng trệt cửa hàng có biển chữ
const HOUSES = [
  { wall: '#d9a441', roof: 'tile', sign: 'PHỞ', signC: '#c9302a', awn: '#3a9a5a', shut: '#2f5d3a' },
  { wall: '#e8d8b0', roof: 'flat', sign: 'TẠP HÓA', signC: '#2f62c9', awn: '#d4382c', shut: '#2f5d3a' },
  { wall: '#c98a78', roof: 'flat', sign: 'CÀ PHÊ', signC: '#26232a', awn: '#e0a52a', shut: '#3a6a7a' },
  { wall: '#a8c8a8', roof: 'tile', sign: 'SỬA XE', signC: '#e0a52a', awn: '#2f62c9', shut: '#2f5d3a' },
]
function houseTop(h, W = 60, H = 56) {
  const c = NEW(W, H), A = h.wall, Ad = sh(A, 0.25), Al = hi(A, 0.25)
  // mái / sân thượng (y 0..13)
  if (h.roof === 'tile') {
    c.rect(0, 0, W, 14, '#a85a3c'); for (let y = 1; y < 14; y += 3) c.rect(0, y, W, 1, '#7d3a2c'); for (let x = 2; x < W; x += 4) for (let y = 0; y < 14; y += 3) c.set(x + (y % 2) * 2, y + 1, '#cc7f50')
    c.rect(0, 0, W, 1, '#cc7f50'); c.rect(0, 12, W, 2, '#7d3a2c'); c.rect(40, 3, 6, 6, '#c4ae8e'); c.rect(40, 3, 6, 1, '#e0d0b0')
  } else {
    c.rect(0, 0, W, 14, '#b8ae9e'); noise(c, 0, 0, W, 14, '#a69c8c', 0.2, 9); c.rect(0, 0, W, 1, '#d8d0c0'); c.rect(0, 12, W, 2, '#8a8070')
    c.rect(6, 2, 10, 6, '#d4d9de'); c.rect(6, 2, 10, 1, '#f4f6f8'); c.rect(6, 7, 10, 1, '#8a929a'); c.rect(15, 2, 1, 6, '#9aa3ad')   // bồn nước inox
    c.rect(24, 4, 3, 3, '#a85a3c'); c.ell(25.5, 3.5, 2.5, 2, '#4a8f45'); c.rect(30, 4, 3, 3, '#a85a3c'); c.ell(31.5, 3.5, 2.5, 2, '#6aa84a')  // chậu cây
    c.line(38, 9, 56, 9, '#5a5e6c'); for (const [x, col] of [[41, '#e07a9a'], [45, '#f4efe2'], [49, '#3f6fb0'], [53, '#e0a52a']]) c.rect(x, 9, 3, 3, col)   // dây phơi quần áo
  }
  // tường mặt tiền
  c.rect(0, 14, W, H - 14, A); c.rect(0, 14, W, 1, Al); c.rect(W - 2, 14, 2, H - 14, Ad)
  // tầng 2: 2 cửa sổ chớp xanh + ban công lan can
  for (const x of [6, 34]) { c.rect(x, 17, 18, 9, '#3a2e2a'); c.rect(x, 17, 4, 9, h.shut); c.rect(x + 14, 17, 4, 9, h.shut); for (let y = 18; y < 26; y += 2) { c.set(x + 1, y, hi(h.shut, 0.25)); c.set(x + 15, y, hi(h.shut, 0.25)) } c.rect(x + 5, 18, 8, 7, '#5a4a3a'); c.set(x + 7, 19, '#fbe08a') }
  c.rect(2, 26, W - 4, 2, '#c4ae8e'); c.rect(2, 26, W - 4, 1, '#e0d0b0')
  for (let x = 3; x < W - 3; x += 3) c.rect(x, 22, 1, 4, '#26232a'); c.rect(2, 21, W - 4, 1, '#26232a')
  for (const x of [8, 24, 44]) { c.rect(x, 19, 4, 3, '#a85a3c'); c.ell(x + 2, 18, 3, 2, x === 24 ? '#d9629a' : '#3a8040') }        // chậu hoa ban công
  c.rect(W - 9, 15, 5, 3, '#e8e8ea'); c.rect(W - 9, 17, 5, 1, '#9aa3ad')                                                       // cục nóng điều hoà
  // biển hiệu
  c.rect(3, 30, W - 6, 9, h.signC); c.rect(3, 30, W - 6, 1, hi(h.signC, 0.3)); c.rect(3, 38, W - 6, 1, sh(h.signC, 0.35))
  text2dC(c, W / 2, 32, h.sign, h.signC === '#e0a52a' ? '#26232a' : '#fbf6e8')
  // mái hiên
  for (let x = 0; x < W; x++) c.set(x, 40, x % 6 < 3 ? h.awn : '#f4efe2'); for (let x = 0; x < W; x++) c.set(x, 41, x % 6 < 3 ? sh(h.awn, 0.25) : '#d8d2c0')
  // tầng trệt: cửa cuốn mở, trong tối có hàng hoá
  c.rect(4, 42, W - 8, 14, '#3a302c'); c.rect(4, 42, W - 8, 2, '#8a929a'); for (let x = 6; x < W - 6; x += 5) { c.rect(x, 46, 3, 2, ['#e0a52a', '#d4382c', '#3f6fb0', '#6aa84a'][(x / 5) % 4 | 0]) } c.rect(4, 50, W - 8, 1, '#5a4a3a')
  c.rect(0, 42, 4, 14, Ad); c.rect(W - 4, 42, 4, 14, Ad)
  return c
}
HOUSES.forEach((h, k) => def(`rail_house_${k}`, 60, 56, 1, { anchor: [0, 0], group: G_RL, desc: `Nhà ống nhìn từ trên: ${h.roof === 'tile' ? 'mái ngói' : 'sân thượng bồn nước inox, dây phơi'}, ban công hoa, biển "${h.sign}"; neo = góc trên-trái (thay house(x,y,60,56))`, replaces: 'rail.js house()' }, () => houseTop(h)))
def('ico_angry', 11, 12, 2, { anchor: [5, 11], fps: 6, group: G_RL, desc: 'Bong bóng bóp còi giục (tút tút!) trên đầu xe chờ lâu; neo = giữa đáy', replaces: 'rail.js dấu ! đỏ trên xe' }, (f) => {
  const c = NEW(11, 12)
  c.rect(1, 0, 9, 8, '#fbf6e8'); c.rect(0, 1, 11, 6, '#fbf6e8'); c.rect(4, 8, 3, 1, '#fbf6e8'); c.set(5, 9, '#fbf6e8')
  c.rect(2, 2, 2, 3, '#d4382c'); c.rect(7, 2, 2, 3, '#d4382c'); c.rect(2, 6, 2, 1, '#d4382c'); c.rect(7, 6, 2, 1, '#d4382c')
  if (f) { c.set(0, 0, '#f2c23c'); c.set(10, 0, '#f2c23c') }
  c.outline(0.7); return c
})
