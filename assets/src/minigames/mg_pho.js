// ───────── Mini-game phụ quán phở / bánh mì (nhìn chính diện quầy; tường y 0..72, quầy 72..110, sàn khách 110..180) ─────────
const G_PH = 'Quán phở / bánh mì (chính diện)'

function shopWall(kind) {
  const W = 320, H = 72, c = NEW(W, H)
  const isPho = kind === 'pho'
  const wall = isPho ? '#e8d8b0' : '#d8e0c8'
  c.rect(0, 0, W, H, wall)
  // gạch men ốp chân tường + vết thời gian
  for (let y = 24; y < H; y += 8) for (let x = ((y / 8) % 2) * 8; x < W; x += 16) { c.rect(x, y, 15, 7, hi(wall, 0.12)); c.rect(x, y + 7, 16, 1, sh(wall, 0.12)) }
  noise(c, 0, 24, W, 48, sh(wall, 0.08), 0.04, 61)
  // mái hiên sọc đỏ-trắng có diềm sóng
  for (let x = 0; x < W; x++) { const red = (x % 16) < 8; for (let y = 0; y < 16; y++) c.set(x, y, red ? (y < 2 ? '#e0463a' : '#c9302a') : (y < 2 ? '#fffaf0' : '#f4efe2')) }
  for (let x = 0; x < W; x++) { const k = x % 8; const yy = 16 + (k < 4 ? k >> 1 : (7 - k) >> 1); for (let y = 16; y <= yy; y++) c.set(x, y, (x % 16) < 8 ? '#c9302a' : '#f4efe2'); c.set(x, yy + 1, '#8c2a20') }
  for (let x = 0; x < W; x++) c.set(x, 15, '#a3202a')
  // biển hiệu lớn chữ 2x
  const txt = isPho ? 'PHỞ BÒ GIA TRUYỀN' : 'BÁNH MÌ PATE', tw = textW2(txt, 2)
  const sx = Math.round(W / 2 - tw / 2) - 6
  c.rect(sx, 24, tw + 12, 18, '#7a2a22'); c.rect(sx + 1, 25, tw + 10, 16, isPho ? '#f2c23c' : '#2f5d3a'); c.rect(sx + 1, 25, tw + 10, 1, isPho ? '#fbe08a' : '#4a7d5c')
  text2d(c, sx + 6, 31, txt, isPho ? '#a3202a' : '#fbe08a', 2)
  // đèn treo
  for (const x of [40, 280]) { c.rect(x, 18, 1, 6, '#3a3540'); c.poly([[x - 4, 28], [x - 2, 24], [x + 3, 24], [x + 5, 28]], '#2f5d3a'); c.rect(x - 1, 28, 3, 2, '#fff2b0') }
  // bảng giá treo tường: bảng đen TRỐNG — chữ tên món + giá do code vẽ lúc chạy từ economy-config (không bao giờ vẽ số cứng ở đây)
  const mx = 236
  c.rect(mx, 46, 60, 22, '#3a3540'); c.rect(mx + 1, 47, 58, 20, '#2f4a3a'); c.rect(mx + 1, 47, 58, 1, '#3d5c4a')
  for (const [x, y] of [[mx + 6, 63], [mx + 40, 50], [mx + 50, 64]]) c.set(x, y, '#46624f')                       // vết phấn cũ
  c.rect(mx + 22, 68, 16, 1, '#8a5a3a'); c.rect(mx + 24, 67, 3, 1, '#f4efe2')                                    // máng phấn + viên phấn
  // kệ gia vị bên trái: lọ tỏi ớt, chai nước mắm, rổ chanh
  c.rect(70, 52, 50, 2, '#8a5a3a'); c.rect(70, 54, 50, 1, '#5a3a22')
  for (const [x, col, h] of [[72, '#c9302a', 8], [78, '#e8d8a0', 6], [84, '#7a3a1a', 10], [90, '#c9302a', 7], [96, '#3a8040', 9], [104, '#e8e2d0', 6], [110, '#a85a3c', 8]]) { c.rect(x, 52 - h, 4, h, col); c.rect(x, 52 - h, 4, 1, hi(col, 0.3)); c.rect(x + 3, 52 - h + 1, 1, h - 1, sh(col, 0.3)) }
  // lịch treo + bàn thờ ông địa nhỏ (đỏ)
  c.rect(8, 40, 14, 18, '#fbf6e8'); c.rect(8, 40, 14, 4, '#c9302a'); text2d(c, 11, 46, '18', '#c9302a'); c.rect(9, 52, 12, 1, '#c9c2b0')
  c.rect(176, 48, 20, 12, '#a3202a'); c.rect(177, 49, 18, 10, '#c9302a'); c.rect(184, 52, 4, 6, '#e0b030'); c.rect(180, 46, 12, 2, '#e0b030')
  return c
}
def('pho_wall', 320, 72, 1, { anchor: [0, 0], group: G_PH, desc: 'Tường quán phở: mái hiên sọc đỏ-trắng, biển "PHỞ BÒ GIA TRUYỀN", bảng giá TRỐNG (code ghi tên món + giá thật vào ô x 237..294, y 47..66), kệ gia vị, lịch, đèn treo; neo = (0,0)', replaces: 'pho.js tường + mái hiên + biển (variant pho)' }, () => shopWall('pho'))
def('bm_wall', 320, 72, 1, { anchor: [0, 0], group: G_PH, desc: 'Tường quán bánh mì: biển "BÁNH MÌ PATE" xanh, bảng giá TRỐNG (code ghi giá thật như pho_wall)', replaces: 'pho.js tường (variant banhmi)' }, () => shopWall('bm'))
def('pho_pot', 42, 32, 3, { anchor: [21, 31], fps: 6, group: G_PH, desc: 'Nồi nước dùng nhôm to trên bếp than, nước sôi sủi bọt + muôi (3 khung); khói dùng vfx pho_steam; neo = giữa đáy', replaces: 'pho.js nồi + hơi' }, (f) => {
  const c = NEW(42, 32), AL = '#a6b1bd'
  c.rect(6, 26, 30, 6, '#3a3540'); c.rect(8, 27, 26, 3, '#c9302a'); for (let x = 9; x < 33; x += 3) c.set(x + (f % 2), 28, '#f2c23c')          // bếp than hồng
  c.rect(4, 8, 34, 19, AL); c.rect(4, 8, 34, 1, '#d8dde2'); c.rect(5, 9, 3, 17, hi(AL, 0.3)); c.rect(33, 9, 5, 18, sh(AL, 0.3)); c.rect(4, 22, 34, 1, sh(AL, 0.2))
  c.rect(1, 12, 4, 2, '#7d8a9a'); c.rect(37, 12, 4, 2, '#7d8a9a')
  c.ell(21, 8, 16, 3, '#c98a2a'); c.ell(21, 8, 14, 2, '#d9a53c')
  for (const [x, y] of [[12, 7], [20, 8], [27, 7], [16, 9], [24, 9]]) { if ((x + f) % 3) c.set(x + (f === 2 ? 1 : 0), y, '#f6d890') }
  c.rect(10, 7, 3, 1, '#a85a3c'); c.rect(25, 8, 4, 1, '#a85a3c')
  c.line(28, 7, 36, 0, '#5a5e6c'); c.rect(26, 6, 4, 2, '#7d8794')                                                                             // muôi
  c.outline(0.5); return c
})
function counter(kind) {
  const W = 320, H = 38, c = NEW(W, H), Wd = '#8a5a2a'
  c.rect(0, 0, W, 6, '#b07a3c'); c.rect(0, 0, W, 1, '#d09a54'); c.rect(0, 5, W, 1, '#7a4c22')
  c.rect(0, 6, W, 32, Wd); for (let x = 0; x < W; x += 32) { c.rect(x + 2, 10, 28, 24, '#7a4c22'); c.rect(x + 2, 10, 28, 1, sh(Wd, 0.4)); c.rect(x + 3, 33, 28, 1, hi(Wd, 0.2)) }
  // mặt quầy: dải gạch men xanh, tấm vải đỏ treo giữa có chữ, móc treo khăn
  c.rect(0, 30, W, 4, '#3a8f8a'); for (let x = 0; x < W; x += 6) { c.rect(x, 30, 5, 3, '#5aa8a0'); c.set(x + 1, 31, '#a8d8d0') } c.rect(0, 34, W, 4, '#5a3a22')
  const ban = kind === 'pho' ? 'PHỞ NGON' : 'BÁNH MÌ NÓNG', bw = textW2(ban) + 10
  c.rect(W / 2 - bw / 2, 9, bw, 14, '#c9302a'); c.rect(W / 2 - bw / 2, 9, bw, 1, '#e0463a'); c.rect(W / 2 - bw / 2, 22, bw, 1, '#8c2a20'); for (let x = W / 2 - bw / 2; x < W / 2 + bw / 2; x += 3) c.set(x, 23, '#e0b030'); text2dC(c, W / 2, 14, ban, '#f2c23c')
  for (const x of [40, 270]) { c.rect(x, 8, 12, 2, '#c8ced6'); c.rect(x + 2, 10, 8, 12, '#f4efe2'); c.rect(x + 2, 18, 8, 1, '#c9302a'); c.rect(x + 2, 20, 8, 1, '#c9302a') }
  if (kind === 'pho') {
    // tủ kính bánh phở + thịt bò + hành, rổ quẩy, rổ chanh ớt
    c.rect(96, -0, 64, 1, '#eef6f6')
    for (const [x, col, l] of [[100, '#f4efe6', '#ffffff'], [116, '#c4604a', '#e0907a'], [132, '#a85a3c', '#cc7f50'], [148, '#6aa84a', '#a8cf6a']]) { c.rect(x, 1, 12, 4, col); c.set(x + 2, 1, l); c.set(x + 7, 2, l) }
    c.ell(196, 2, 10, 2.4, '#c9a060'); for (let x = 188; x < 204; x += 3) c.rect(x, 0, 2, 3, '#d99a3a')
    c.ell(226, 3, 6, 2, '#c9a060'); c.set(223, 2, '#9ad04a'); c.set(226, 2, '#d4382c'); c.set(229, 2, '#9ad04a')
    for (let x = 250; x < 290; x += 7) { c.ell(x + 3, 3, 3, 1.5, '#f4efe6'); c.rect(x, 4, 6, 1, '#c9c2b0') }                                    // chồng bát
  } else {
    // tủ kính bánh mì: bánh mì xếp, hộp pate, chả, rau thơm
    c.rect(90, 0, 110, 6, '#c8e0e0')
    for (let x = 94; x < 150; x += 9) { c.rect(x, 2, 7, 3, '#d49a4a'); c.rect(x, 2, 7, 1, '#e8b866') }
    c.rect(154, 2, 8, 3, '#a8763a'); c.rect(166, 2, 8, 3, '#e8a0a0'); c.rect(178, 2, 8, 3, '#6aa84a'); c.rect(190, 2, 6, 3, '#f0b429')
  }
  return c
}
def('pho_counter', 320, 38, 1, { anchor: [0, 0], group: G_PH, desc: 'Quầy gỗ quán phở: tủ bánh phở/thịt bò/hành, rổ quẩy, rổ chanh ớt, chồng bát; đặt y=72', replaces: 'pho.js quầy gỗ' }, () => counter('pho'))
def('bm_counter', 320, 38, 1, { anchor: [0, 0], group: G_PH, desc: 'Quầy bánh mì: tủ kính bánh mì, pate, chả, rau, trứng; đặt y=72', replaces: 'pho.js quầy (banhmi)' }, () => counter('bm'))
def('pho_floor', 32, 70, 1, { anchor: [0, 0], group: G_PH, desc: 'Sàn gạch hoa cũ chỗ khách ngồi; lát ngang liền; đặt y=110', replaces: 'pho.js sàn nâu' }, () => {
  const c = NEW(32, 70)
  for (let y = 0; y < 70; y += 8) for (let x = 0; x < 32; x += 8) { const k = ((x + y) / 8) % 2; c.rect(x, y, 8, 8, k ? '#c4ae8e' : '#b8a080'); c.set(x + 3, y + 3, k ? '#a85a3c' : '#8a7a5a'); c.set(x + 4, y + 4, k ? '#a85a3c' : '#8a7a5a'); c.rect(x, y, 8, 1, '#9b856b') }
  return c
})
def('pho_table', 34, 16, 1, { anchor: [17, 15], group: G_PH, desc: 'Bàn gấp inox thấp: ống đũa, lọ tương ớt, giấy ăn; neo = giữa đáy (đặt trước khách)', replaces: 'pho.js bệ ghế khách' }, () => {
  const c = NEW(34, 16), S = '#c8ced6'
  c.rect(1, 5, 32, 4, S); c.rect(1, 5, 32, 1, '#eef2f6'); c.rect(1, 8, 32, 1, '#8a929a'); c.rect(3, 9, 2, 7, '#8a929a'); c.rect(29, 9, 2, 7, '#8a929a'); c.line(5, 10, 28, 15, '#7d8794')
  c.rect(6, 0, 4, 6, '#c9302a'); for (let x = 6; x < 10; x++) c.set(x, 0, '#e8d8a0'); c.rect(14, 2, 3, 4, '#c9302a'); c.rect(14, 2, 3, 1, '#e8e2d0'); c.rect(19, 2, 3, 4, '#7a3a1a'); c.rect(25, 3, 5, 3, '#f4efe6')
  c.outline(0.55); return c
})
