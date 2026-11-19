// ───────── Mini-game xếp ghế trà chanh (vỉa hè trên y 0..55, đường y 56..141, vỉa hè dưới y 142..180) ─────────
const G_TC = 'Trà chanh vỉa hè (nhìn từ trên)'

// mặt tiền dãy phố phía trên (320x24): quán trà chanh giữa (biển TRÀ CHANH, mái hiên), hai bên cửa hàng khác
def('tc_shopfront', 320, 26, 1, { anchor: [0, 0], group: G_TC, desc: 'Dãy mặt tiền trên cùng: tiệm điện thoại, quán TRÀ CHANH (biển vàng chữ đỏ, mái hiên xanh-trắng), tạp hoá; neo = (0,0)', replaces: 'tc.js dải nhà xanh + biển' }, () => {
  const c = NEW(320, 26)
  const shop = (x0, w, wall, sign, signBg, signFg, awn) => {
    c.rect(x0, 0, w, 26, wall); c.rect(x0, 0, w, 1, hi(wall, 0.3)); c.rect(x0 + w - 1, 0, 1, 26, sh(wall, 0.3))
    for (let x = x0 + 4; x < x0 + w - 8; x += 12) { c.rect(x, 2, 6, 4, '#2f5d3a'); c.rect(x + 1, 2, 4, 4, '#3a2e2a'); c.set(x + 2, 3, '#fbe08a') }
    c.rect(x0 + 2, 7, w - 4, 8, signBg); c.rect(x0 + 2, 7, w - 4, 1, hi(signBg, 0.3)); c.rect(x0 + 2, 14, w - 4, 1, sh(signBg, 0.3)); text2dC(c, x0 + w / 2, 9, sign, signFg)
    for (let x = x0; x < x0 + w; x++) { c.set(x, 16, (x - x0) % 8 < 4 ? awn : '#f4efe2'); c.set(x, 17, (x - x0) % 8 < 4 ? sh(awn, 0.25) : '#d8d2c0') }
    c.rect(x0 + 2, 18, w - 4, 8, '#3a302c'); for (let x = x0 + 4; x < x0 + w - 4; x += 5) c.rect(x, 20, 3, 3, ['#e0a52a', '#d4382c', '#3f6fb0', '#6aa84a', '#e8e2d0'][((x - x0) / 5) % 5 | 0])
  }
  shop(0, 88, '#c98a78', 'ĐIỆN THOẠI', '#2f62c9', '#fbf6e8', '#2f62c9')
  shop(88, 144, '#d9a441', 'TRÀ CHANH', '#f2c23c', '#c9302a', '#3a9a5a')
  shop(232, 88, '#a8c8a8', 'TẠP HÓA', '#c9302a', '#fbf6e8', '#e0a52a')
  // dây đèn nháy treo trước quán trà chanh
  for (let x = 92; x < 228; x += 6) c.set(x, 6 + (x % 12 === 2 ? 1 : 0), ['#f2c23c', '#e0463a', '#3aa0d0', '#6aa84a'][(x / 6) % 4 | 0])
  return c
})
def('tc_cart', 26, 30, 1, { anchor: [13, 29], group: G_TC, desc: 'Quầy/xe nước trà chanh: tủ kính có chanh, bình trà, thùng đá xanh, chồng cốc; neo = giữa đáy', replaces: 'tc.js quầy / xe nước' }, () => {
  const c = NEW(26, 30), Wd = '#8a5a3a'
  c.rect(1, 14, 24, 13, Wd); c.rect(1, 14, 24, 1, hi(Wd, 0.3)); c.rect(23, 15, 2, 12, sh(Wd, 0.3)); c.rect(3, 17, 20, 7, '#6e4428'); text2d(c, 5, 18, 'TRÀ', '#f2c23c')
  c.rect(2, 4, 22, 10, '#c8e0e0'); c.rect(2, 4, 22, 1, '#eef6f6'); c.rect(23, 5, 1, 9, '#8aa8a8')        // tủ kính
  for (const [x, y] of [[4, 9], [7, 10], [5, 11], [9, 9]]) { c.rect(x, y, 2, 2, '#9ad04a'); c.set(x, y, '#c8e890') }      // chanh
  c.rect(12, 6, 4, 7, '#c98a2a'); c.rect(12, 6, 4, 1, '#e0a84a'); c.rect(13, 5, 2, 1, '#8a5a3a')                    // bình trà
  for (let y = 7; y < 13; y += 2) c.rect(18, y, 4, 2, '#eef6f6'); c.rect(18, 13, 4, 1, '#a8b8b0')                    // chồng cốc
  c.rect(0, 22, 7, 7, '#2f8fd0'); c.rect(0, 22, 7, 1, '#6ac0f0'); c.rect(6, 23, 1, 6, '#1f6aa0')                      // thùng đá
  c.rect(5, 27, 3, 3, '#26232a'); c.rect(18, 27, 3, 3, '#26232a')
  c.outline(0.55); return c
})
// ghế nhựa thấp (nhìn 3/4 từ trên): mặt ghế vuông có lỗ tay cầm, 4 chân choãi
const TCC = [['đỏ', '#d4382c'], ['xanh', '#2f8fd0'], ['vàng', '#e0b020'], ['xanh lá', '#4aa860']]
function stool(col) {
  const c = NEW(12, 12), d = sh(col, 0.3), l = hi(col, 0.3)
  c.rect(1, 1, 10, 5, col); c.rect(1, 1, 10, 1, l); c.rect(1, 5, 10, 1, d); c.rect(5, 3, 2, 1, d)
  c.rect(1, 6, 2, 5, d); c.rect(9, 6, 2, 5, d); c.rect(2, 6, 8, 1, col); c.rect(3, 7, 6, 1, d); c.set(0, 10, d); c.set(11, 10, d)
  c.outline(0.55); return c
}
TCC.forEach(([nm, col], k) => def(`tc_stool_${k}`, 12, 12, 1, { anchor: [6, 11], group: G_TC, desc: `Ghế nhựa thấp ${nm}; neo = giữa đáy`, replaces: 'gfx.chair' }, () => stool(col)))
def('tc_stack', 14, 24, 1, { anchor: [7, 23], group: G_TC, desc: 'Chồng ghế nhựa nhiều màu (chỗ lấy ghế); neo = giữa đáy', replaces: 'tc.js chồng ghế' }, () => {
  const c = NEW(14, 24)
  for (let i = 0; i < 5; i++) { const col = TCC[(4 - i) % 4][1], y = 13 - i * 3; c.rect(2, y, 10, 4, col); c.rect(2, y, 10, 1, hi(col, 0.3)); c.rect(2, y + 3, 10, 1, sh(col, 0.3)); c.rect(1, y + 3, 1, 2, sh(col, 0.3)); c.rect(12, y + 3, 1, 2, sh(col, 0.3)) }
  c.rect(1, 17, 2, 6, sh(TCC[0][1], 0.3)); c.rect(11, 17, 2, 6, sh(TCC[0][1], 0.3)); c.rect(3, 17, 8, 1, TCC[0][1])
  c.outline(0.55); return c
})
def('tc_table', 20, 14, 1, { anchor: [10, 13], group: G_TC, desc: 'Bàn nhựa thấp xanh dương: 2 cốc trà chanh, đĩa hướng dương; neo = giữa đáy', replaces: 'mới' }, () => {
  const c = NEW(20, 14), B = '#3f6fb0'
  c.rect(1, 4, 18, 5, B); c.rect(1, 4, 18, 1, hi(B, 0.3)); c.rect(1, 8, 18, 1, sh(B, 0.3)); c.rect(2, 9, 2, 5, sh(B, 0.35)); c.rect(16, 9, 2, 5, sh(B, 0.35))
  for (const x of [4, 13]) { c.rect(x, 1, 3, 5, '#e8c84a'); c.rect(x, 1, 3, 1, '#fbf0b0'); c.set(x + 1, 0, '#d4382c') }
  c.ell(10, 6, 2.5, 1.2, '#f4efe2'); c.set(9, 6, '#3a3540'); c.set(11, 6, '#3a3540')
  c.outline(0.55); return c
})
def('tc_slot', 14, 8, 2, { anchor: [7, 7], fps: 3, group: G_TC, desc: 'Ô trống chờ đặt ghế (khung nét đứt nhấp nháy 2 khung)', replaces: 'tc.js khung vàng ô trống' }, (f) => {
  const c = NEW(14, 8), col = f ? '#fff2a0' : '#f2c23c'
  for (let x = 0; x < 14; x++) if ((x + f) % 3 !== 2) { c.set(x, 0, col); c.set(x, 7, col) }
  for (let y = 0; y < 8; y++) if ((y + f) % 3 !== 2) { c.set(0, y, col); c.set(13, y, col) }
  return c
})
// nền: gạch vỉa hè, mặt đường có/không vạch, bó vỉa
def('tc_pave', 16, 16, 1, { anchor: [0, 0], group: G_TC, desc: 'Gạch lát vỉa hè Hà Nội (gạch đỏ nâu ô vuông, mạch xám); lát liền', replaces: 'tc.js nền vỉa hè' }, () => {
  const c = NEW(16, 16), A = '#b87a5a'
  c.rect(0, 0, 16, 16, A); for (const [x, y] of [[0, 0], [8, 0], [0, 8], [8, 8]]) { c.rect(x, y, 8, 1, '#8a8478'); c.rect(x, y, 1, 8, '#8a8478'); c.rect(x + 1, y + 1, 6, 1, hi(A, 0.18)); c.set(x + 6, y + 6, sh(A, 0.2)) }
  noise(c, 1, 1, 15, 15, sh(A, 0.12), 0.08, 41); return c
})
for (const [name, dash] of [['tc_road', false], ['tc_road_dash', true]]) def(name, 32, 26, 1, { anchor: [0, 0], group: G_TC, desc: dash ? 'Mặt đường nhựa có vạch đứt giữa làn; lát liền' : 'Mặt đường nhựa trơn; lát liền', replaces: 'tc.js mặt đường' }, () => {
  const c = NEW(32, 26)
  c.rect(0, 0, 32, 26, '#566478'); noise(c, 0, 0, 32, 26, '#4a586a', 0.2, 51); noise(c, 0, 0, 32, 26, '#62708a', 0.07, 52)
  if (dash) c.rect(4, 12, 14, 2, '#e0d8b8')
  return c
})
def('tc_curb', 32, 4, 1, { anchor: [0, 0], group: G_TC, desc: 'Bó vỉa đá (giữa vỉa hè và đường); lát ngang liền', replaces: 'tc.js mép đường' }, () => {
  const c = NEW(32, 4); c.rect(0, 0, 32, 4, '#a6b1bd'); c.rect(0, 0, 32, 1, '#d8dde2'); c.rect(0, 3, 32, 1, '#566478'); for (let x = 0; x < 32; x += 8) c.rect(x, 0, 1, 3, '#7d8a9a'); return c
})
def('tc_zebra', 8, 4, 1, { anchor: [0, 0], group: G_TC, desc: 'Một vạch kẻ đường đi bộ (lát dọc mỗi 8px)', replaces: 'tc.js vạch đi bộ nhạt' }, () => { const c = NEW(8, 4); c.rect(0, 0, 8, 4, '#e8e4d2'); c.rect(0, 3, 8, 1, '#c8c4b2'); return c })
