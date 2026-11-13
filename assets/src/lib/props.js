LAYOUT.gate = LAYOUT.bridge = LAYOUT.temple = LAYOUT.turtle_tower = LAYOUT.struct
LAYOUT.bridge_gate = LAYOUT.prop = LAYOUT.free

// ───────── đồ phố, quầy hàng, thanh chắn tàu ─────────
// Toạ độ cục bộ: gốc (0,0,0) = giữa chân vật, nằm ở (px,py) của ảnh.
const WOOD = '#8a5a34', STEEL = '#aeb4ba', GREEN_IRON = '#2f5a45'
function umbrella(cv, I, z, r, cols, h = 9) {
  const [cx, cy] = I.P(0, 0, z), top = [cx, cy - h], n = 8
  const arc = (a) => [cx + r * Math.cos(a), cy + r * 0.5 * Math.sin(a)]
  for (let i = 0; i < n; i++) {        // nan ô: tô các múi tối trước, sáng sau để có chiều sâu
    const a0 = i / n * 6.283, a1 = (i + 1) / n * 6.283, mid = (a0 + a1) / 2
    const lit = Math.cos(mid - 2.4) > 0
    const c = cols[i % cols.length]
    cv.poly([top, arc(a0), arc(a1)], lit ? lite(c, 0.12) : mix(dark(c, 0.15), SHADOW_TEAL, 0.15))
  }
  I.cv.set(cx, cy - h - 1, STEEL)
}
const stool = (I, x, y, col) => { I.box(x - 3, y - 3, 0, x + 3, y + 3, 7, null, faceCols(col)) }
const table = (I, x0, y0, x1, y1, h, col = WOOD) => { I.box(x0, y0, 0, x1, y1, h - 2, null, faceCols(dark(col, 0.25))); I.box(x0 - 1, y0 - 1, h - 2, x1 + 1, y1 + 1, h, null, faceCols(col)) }

DRAW.prop = (cv, s, I) => {
  const t = s.type, rnd = rngOf(hashStr(s.name))
  if (t === 'lamp') {
    groundShadow(cv, I.ox + 4, I.oy + 1, 8, 3)
    I.box(-4, -4, 0, 4, 4, 5, null, faceCols('#4a5a4a')); I.post(0, 0, 5, 66, 3, '#3f4f45')
    I.box(-9, -3, 66, 5, 3, 69, null, faceCols('#3f4f45')); I.box(-9, -3, 63, -4, 3, 66, null, { top: '#fff6c0', left: '#fff6c0', right: '#e8d89a' })
  } else if (t === 'pole') {
    groundShadow(cv, I.ox + 4, I.oy + 1, 7, 3)
    I.post(0, 0, 0, 104, 5, '#8d8a84'); I.post(0, 0, 0, 24, 6, '#767068')
    for (const z of [96, 84]) I.box(-1.5, -14, z, 1.5, 14, z + 3, null, faceCols('#5a4a3a'))
    for (const y of [-12, -6, 6, 12]) I.post(0, y, 99, 104, 2, '#e8e2d0')
  } else if (t === 'bench') {
    const ax = s.axis, L = 28, W = 9, B = (a0, a1, b0, b1, z0, z1, col) => ax === 'x' ? I.box(a0, b0, z0, a1, b1, z1, col, null) : I.box(b0, a0, z0, b1, a1, z1, col, null)
    for (const a of [-L / 2 + 2, L / 2 - 4]) B(a, a + 2, -W / 2, W / 2, 0, 6, '#3f4f45')
    B(-L / 2, L / 2, -W / 2, W / 2, 6, 8, WOOD); B(-L / 2, L / 2, -W / 2, -W / 2 + 2, 8, 16, dark(WOOD, 0.1))
  } else if (t === 'bin') {
    groundShadow(cv, I.ox + 3, I.oy + 1, 7, 3)
    I.box(-4, -4, 0, 4, 4, 15, null, faceCols('#2f7a58')); I.box(-5, -5, 15, 5, 5, 18, null, faceCols('#3f9a6e')); I.box(-3, 4, 7, 3, 4.5, 11, null, faceCols('#e8e2d0'))
  } else if (t === 'shelter') {
    const ax = s.axis, L = 56, W = 18, B = (a0, a1, b0, b1, z0, z1, col, c2) => ax === 'x' ? I.box(a0, b0, z0, a1, b1, z1, col, c2) : I.box(b0, a0, z0, b1, a1, z1, col, c2)
    groundShadow(cv, I.ox + 6, I.oy + 2, 34, 8)
    B(-L / 2, L / 2, -W / 2, -W / 2 + 1, 6, 40, null, glassCols())
    B(-L / 2 + 4, L / 2 - 4, -W / 2 + 2, -W / 2 + 6, 0, 7, '#8a5a34')
    for (const a of [-L / 2, L / 2 - 2]) for (const b of [-W / 2, W / 2 - 2]) B(a, a + 2, b, b + 2, 0, 42, '#2a4a6a')
    B(-L / 2 - 2, L / 2 + 2, -W / 2 - 2, W / 2 + 2, 42, 46, '#2f62c9')
    I.post(ax === 'x' ? L / 2 + 6 : W / 2 + 6, ax === 'x' ? W / 2 + 6 : L / 2 + 6, 0, 36, 2, STEEL)
    const p = ax === 'x' ? [L / 2 + 6, W / 2 + 6] : [W / 2 + 6, L / 2 + 6]; I.box(p[0] - 5, p[1] - 1, 32, p[0] + 5, p[1] + 1, 44, null, faceCols('#2f62c9')); I.box(p[0] - 3, p[1] + 1, 36, p[0] + 3, p[1] + 1.5, 41, null, faceCols('#fbe08a'))
  } else if (t === 'pho') {
    groundShadow(cv, I.ox + 8, I.oy + 2, 34, 12)
    table(I, -16, -8, 14, 8, 13)
    I.box(-12, -4, 13, -2, 4, 21, null, faceCols('#23252b'))                  // nồi nước dùng
    I.box(2, -5, 13, 10, 5, 17, null, faceCols('#e8e2d0')); I.box(3, -4, 17, 9, 4, 18, null, faceCols('#e0a52a'))
    for (const [x, y] of [[-24, 12], [-8, 17], [14, 16]]) stool(I, x, y, [RAMP.flag_red[2], '#2f62c9', '#2f8f59'][Math.floor(rnd() * 3)])
    I.post(-18, -10, 13, 46, 1.5, STEEL); umbrella(cv, I, 46, 26, ['#d4382c', '#efe6d2'])
    I.box(-18, -9, 28, 12, -8, 36, null, faceCols('#d4382c')); for (let a = -15; a < 8; a += 6) I.fL(-8, a, a + 3, 30, 34, '#efe6d2')
  } else if (t === 'banhmi') {
    groundShadow(cv, I.ox + 6, I.oy + 2, 26, 9)
    I.box(-14, -8, 6, 14, 8, 16, null, faceCols('#d4382c')); I.box(-14, -8, 16, 14, 8, 17, null, faceCols('#e8e2d0'))
    I.box(-13, -7, 17, 13, 7, 29, null, glassCols()); for (let x = -10; x < 10; x += 6) I.box(x, -4, 17, x + 4, 0, 21, null, faceCols('#e0a52a'))
    for (const y of [-9, 7]) I.box(-9, y, 0, -3, y + 2, 7, null, faceCols('#23252b')); I.box(14, -2, 8, 24, 2, 10, null, faceCols('#8a929a'))
    I.post(-12, -6, 29, 52, 1.5, STEEL); umbrella(cv, I, 52, 22, ['#f2c23c', '#fbf6e8'])
  } else if (t === 'umbrella') {
    groundShadow(cv, I.ox + 8, I.oy + 2, 32, 12)
    table(I, -14, -9, 14, 9, 12, '#a07040')
    for (let i = 0; i < 6; i++) { const x = -11 + i * 4.4 + (rnd() - 0.5), y = -6 + Math.floor(rnd() * 3) * 5; I.box(x, y, 12, x + 4, y + 4, 12 + 3 + Math.floor(rnd() * 4), null, faceCols(s.goods[i % s.goods.length])) }
    I.post(0, -10, 12, 44, 1.5, STEEL); umbrella(cv, I, 44, 25, s.cols, 10)
  } else if (t === 'fruit') {
    groundShadow(cv, I.ox + 6, I.oy + 2, 28, 10)
    I.box(-18, -9, 0, 18, 9, 10, null, faceCols(WOOD))
    for (let i = 0; i < 12; i++) { const x = -16 + (i % 6) * 5.6, y = -7 + Math.floor(i / 6) * 9; I.box(x, y, 10, x + 5, y + 7, 14, null, faceCols([RAMP.flag_red[3], RAMP.sun_yellow[2], RAMP.foliage[3], RAMP.bougainvillea[2], '#e08a2a'][i % 5])) }
    I.post(-18, -9, 10, 38, 1.5, STEEL); I.post(18, -9, 10, 38, 1.5, STEEL)
    I.quad([-20, -11, 38], [20, -11, 38], [20, 11, 30], [-20, 11, 30], '#2f7a58')
    for (let x = -18; x < 20; x += 8) I.line3([x, -11, 38], [x, 11, 30], '#efe6d2')
  } else if (t === 'cafe') {
    groundShadow(cv, I.ox + 6, I.oy + 2, 22, 9)
    I.post(0, 0, 0, 12, 3, '#3f4f45'); I.box(-7, -7, 12, 7, 7, 14, null, faceCols('#e8e2d0'))
    stool(I, -12, 6, '#d4382c'); stool(I, 8, 12, '#d4382c'); stool(I, 12, -6, '#2f62c9')
    I.post(0, 0, 14, 40, 1.5, STEEL); umbrella(cv, I, 40, 16, [s.col, '#fbf6e8'], 8)
  } else if (t === 'stools') {
    for (const [x, y, c] of [[-8, 0, '#d4382c'], [4, 6, '#2f62c9'], [8, -6, '#2f8f59']]) stool(I, x, y, c)
    I.box(-2, -12, 0, 12, -4, 9, null, faceCols('#aeb4ba'))
  } else if (t === 'kiosk') {
    groundShadow(cv, I.ox + 6, I.oy + 2, 26, 9)
    I.box(-14, -10, 0, 14, 10, 38, null, faceCols('#4a7d5c'))
    I.fR(14, -7, 7, 8, 26, glassCols().right); I.fL(10, -11, 11, 8, 26, glassCols().left); I.fL(10, -12, 12, 26, 32, '#d4382c')
    I.box(-16, -12, 38, 16, 12, 42, null, faceCols('#efe6d2'))
  } else if (t === 'cyclo') {
    groundShadow(cv, I.ox + 6, I.oy + 2, 26, 9)
    for (const y of [-9, 9]) I.box(-12, y - 1, 0, -4, y + 1, 9, null, faceCols('#23252b'))
    I.box(4, -1, 0, 10, 1, 8, null, faceCols('#23252b'))
    I.box(-10, -8, 8, 4, 8, 14, null, faceCols('#c94a3a')); I.box(-12, -8, 14, -8, 8, 26, null, faceCols('#c94a3a')); I.box(-12, -8, 26, 0, 8, 29, null, faceCols('#2f62c9'))
    I.box(6, -2, 8, 12, 2, 22, null, faceCols('#3a6bb5')); I.box(6, -2, 22, 12, 2, 30, null, faceCols('#f0c49a'))
  } else if (t === 'planter') {
    groundShadow(cv, I.ox + 3, I.oy + 1, 12, 5)
    I.box(-9, -9, 0, 9, 9, 8, null, faceCols(RAMP.stone_cream[3])); I.box(-7, -7, 8, 7, 7, 10, null, faceCols(RAMP.foliage[1]))
    for (let i = 0; i < 14; i++) { const [px, py] = I.P((rnd() - 0.5) * 12, (rnd() - 0.5) * 12, 10 + rnd() * 8); cv.circ(px, py, 2, [RAMP.foliage[3], RAMP.foliage[4], RAMP.bougainvillea[2]][i % 3]) }
  } else if (t === 'flagpole') {
    I.box(-3, -3, 0, 3, 3, 4, null, faceCols('#8a929a')); I.post(0, 0, 4, 78, 1.6, '#e8e2d0')
    I.quad([0, 0, 76], [0, 22, 76], [0, 22, 56], [0, 0, 56], RAMP.flag_red[2]); const [sx, sy] = I.P(0, 11, 66); cv.set(sx, sy, '#fbe08a'); cv.set(sx - 1, sy, '#fbe08a'); cv.set(sx + 1, sy, '#fbe08a'); cv.set(sx, sy - 1, '#fbe08a'); cv.set(sx, sy + 1, '#fbe08a')
  } else if (t === 'barrier') {
    // thanh chắn đường ngang: trụ ở gốc, cần dài 2 ô theo trục x (dir=+1) hoặc -x (dir=-1); đèn đỏ nháy
    const d = s.dir, up = s.state === 'up', arm = 72
    groundShadow(cv, I.ox + 4, I.oy + 1, 8, 3)
    I.box(-4, -4, 0, 4, 4, 16, null, faceCols('#e8e2d0')); I.post(0, 0, 16, 58, 2.6, '#aeb4ba')
    I.box(-6, -6, 44, 6, 6, 58, null, faceCols('#23252b'))                       // hộp đèn
    const lampL = s.state === 'a' ? '#ff5a48' : '#5a2a28', lampR = s.state === 'b' ? '#ff5a48' : '#5a2a28'
    I.fL(6, -4, -0.5, 47, 53, up ? '#5a2a28' : lampL); I.fL(6, 0.5, 4, 47, 53, up ? '#5a2a28' : lampR)
    I.fR(6, -4, 4, 47, 53, up ? '#5a2a28' : (s.state === 'a' ? '#c8382c' : '#7a2a28'))
    if (up) { for (let k = 0; k < 6; k++) I.box(d * 3 - 1.5, -1.5, 14 + k * 8, d * 3 + 1.5, 1.5, 22 + k * 8, null, faceCols(k % 2 ? '#e8e2d0' : '#d4382c')) }
    else for (let k = 0; k < 8; k++) { const x0 = d > 0 ? 3 + k * 9 : -3 - (k + 1) * 9, x1 = x0 + 9; I.box(x0, -1.5, 26, x1, 1.5, 29.5, null, faceCols(k % 2 ? '#e8e2d0' : '#d4382c')) }
    I.box(-7, 5, 22, 7, 6, 36, null, faceCols('#e8e2d0')); I.line3([-6, 6, 24], [6, 6, 34], '#d4382c'); I.line3([-6, 6, 34], [6, 6, 24], '#d4382c')   // biển chữ X
  }
  if (s.outline !== 0) cv.outline(0.5)
}
