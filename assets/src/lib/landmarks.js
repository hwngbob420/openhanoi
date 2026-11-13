// ───────── công trình mốc: Ô Quan Chưởng, cầu Thê Húc, đền Ngọc Sơn, Tháp Rùa ─────────
LAYOUT.struct = (s) => { const L = blockLayout(TILE * s.w, TILE * s.d, s.hup); L.fp = [s.w, s.d]; return L }

const TCR = RAMP.terracotta
function brickFace(I, F, a0, a1, z0, z1, base, rnd, wu, du) {
  const fq = (x0, x1, y0, y1, col) => F === 'R' ? I.fR(wu, x0, x1, y0, y1, col) : I.fL(du, x0, x1, y0, y1, col)
  fq(a0, a1, z0, z1, base)
  for (let z = z0 + 3; z < z1; z += 4) fq(a0, a1, z, z + 1, dark(base, 0.22))
  for (let z = z0; z < z1; z += 4) for (let a = a0 + ((z / 4) % 2) * 5; a < a1; a += 10) if (rnd() < 0.5) fq(a, a + 9, z + 1, z + 3, rnd() < 0.5 ? lite(base, 0.1) : dark(base, 0.08))
}
function hipRoof(I, x0, y0, x1, y1, z, rise, near1, near2, far, line) {
  const i = (y1 - y0) / 2, ym = (y0 + y1) / 2, A = [x0 + i, ym, z + rise], B = [x1 - i, ym, z + rise]
  const cv = I.cv
  I.quad([x0, y0, z], [x1, y0, z], B, A, far)
  cv.poly([I.P(x0, y0, z), I.P(x0, y1, z), I.P(...A)], far)
  cv.poly([I.P(x1, y0, z), I.P(x1, y1, z), I.P(...B)], near1)
  I.quad([x0, y1, z], [x1, y1, z], B, A, near2)
  for (let k = 1; k < 4; k++) { const t = k / 4; I.line3([x0 + (A[0] - x0) * t, y1 + (ym - y1) * t, z + rise * t], [x1 + (B[0] - x1) * t, y1 + (ym - y1) * t, z + rise * t], line) }
  I.line3([x1, y0 + 0, z], [B[0], B[1], B[2]], lite(near1, 0.1)); I.line3([x1, y1, z], B, lite(near2, 0.05))
  I.line3([x0, y1, z], [x1, y1, z], dark(near2, 0.25)); I.line3([x1, y1, z], [x1, y0, z], dark(near1, 0.25))
}

// ── Ô Quan Chưởng: tường gạch 3 cổng, lầu 2 tầng mái ngói; đường đi qua cổng giữa (trục x) ──
DRAW.gate = (cv, s, I) => {
  const wu = TILE * s.w, du = TILE * s.d, rnd = rngOf(77), Hb = 92
  const f = faceCols(TCR[2])
  I.fL(du, 0, wu, 0, Hb, f.left); I.fR(wu, 0, du, 0, Hb, f.right)
  I.topq(0, wu, 0, du, Hb, mix(TCR[3], RAMP.stone_cream[2], 0.3))
  brickFace(I, 'R', 0, du, 0, Hb, f.right, rnd, wu, du); brickFace(I, 'L', 0, wu, 0, Hb, f.left, rnd, wu, du)
  const arch = (yc, hw, zs, zt, col) => {        // cổng vòm trên mặt phải
    const pts = [[wu, yc + hw, 0], [wu, yc + hw, zs]]
    for (let t = 0; t <= 12; t++) { const a = t / 12 * Math.PI; pts.push([wu, yc + hw * Math.cos(a), zs + (zt - zs) * Math.sin(a)]) }
    pts.push([wu, yc - hw, zs], [wu, yc - hw, 0])
    cv.poly(pts.map((p) => I.P(...p)), col)
  }
  const OPEN = mix(INK, TCR[1], 0.3)
  arch(du / 2, 54, 38, 70, lite(f.right, 0.35)); arch(du / 2, 49, 38, 66, OPEN)                           // vòm giữa (viền đá sáng)
  {                                                  // nhìn xuyên cổng: thấy ánh sáng phía bên kia (cổng đi qua được, không phải tường kín)
    const far = new Cv(cv.w, cv.h), I2 = new Iso(far, I.ox, I.oy), pts = [[0, du / 2 + 49, 0], [0, du / 2 + 49, 38]]
    for (let t = 0; t <= 12; t++) { const a = t / 12 * Math.PI; pts.push([0, du / 2 + 49 * Math.cos(a), 38 + 28 * Math.sin(a)]) }
    pts.push([0, du / 2 - 49, 38], [0, du / 2 - 49, 0])
    far.poly(pts.map((p) => I2.P(...p)), '#f2e2b8')
    for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) if (far.get(x, y) && cv.get(x, y) === OPEN) cv.set(x, y, y % 2 && x % 3 === 0 ? '#e6d3a4' : '#f2e2b8')
  }
  for (const yc of [36, du - 36]) { arch(yc, 20, 22, 44, lite(f.right, 0.3)); arch(yc, 16, 22, 40, OPEN) }
  I.fR(wu, 0, du, Hb - 2, Hb + 2, lite(f.right, 0.2)); I.fL(du, 0, wu, Hb - 2, Hb + 2, lite(f.left, 0.25))
  // lầu trên
  const L = 4, U = 26, y0 = 84, y1 = du - 84, wc = '#eadfc6', wf = faceCols(wc)
  I.box(L, y0, Hb + 2, wu - L, y1, Hb + 2 + U, null, wf)
  for (let a = y0 + 10; a < y1 - 10; a += 22) { I.fR(wu - L, a, a + 12, Hb + 8, Hb + 24, RAMP.moss_shutter[1]); I.fR(wu - L, a + 2, a + 10, Hb + 10, Hb + 22, RAMP.moss_shutter[2]) }
  I.fL(y1, L, wu - L, Hb + 8, Hb + 24, RAMP.moss_shutter[2]); I.fR(wu - L, y0, y1, Hb + 2 + U - 4, Hb + 2 + U - 3, dark(wf.right, 0.2))
  const z1 = Hb + 2 + U
  hipRoof(I, 0, y0 - 8, wu, y1 + 8, z1, 20, TCR[2], TCR[3], TCR[1], dark(TCR[3], 0.28))
  const z2 = z1 + 14, mw = 6
  I.box(mw + 4, y0 + 36, z2 - 6, wu - mw - 4, y1 - 36, z2 + 14, null, wf)
  I.fR(wu - mw - 4, y0 + 42, y1 - 42, z2 - 2, z2 + 10, RAMP.moss_shutter[1])
  hipRoof(I, 2, y0 + 28, wu - 2, y1 - 28, z2 + 14, 16, TCR[2], TCR[3], TCR[1], dark(TCR[3], 0.28))
  cv.outline(0.5)
}

// ── cầu Thê Húc: đoạn cầu gỗ đỏ dọc trục x, rộng 2 ô ──
DRAW.bridge = (cv, s, I) => {
  const wu = TILE * s.w, du = TILE * s.d, z = s.z
  const RED = RAMP.flag_red, wood = faceCols(RED[1]), deck = RED[2]
  const rail = (y, front) => {
    for (let x = 4; x < wu; x += 12) I.post(x, y, z, z + 14, 3, front ? RED[2] : RED[1])
    I.box(0, y - 1.5, z + 12, wu, y + 1.5, z + 16, null, faceCols(front ? RED[3] : RED[2]))
  }
  for (const x of [6, wu - 6]) for (const y of [8, du - 8]) I.post(x, y, 0, z - 3, 5, mix(RED[0], INK, 0.3))     // cọc dưới nước
  rail(2, false)
  I.box(0, 0, z - 4, wu, du, z, null, { top: deck, left: RED[2], right: mix(RED[0], SHADOW_TEAL, 0.25) })
  for (let x = 0; x < wu; x += 6) I.line3([x, 0, z], [x, du, z], RED[1])                                       // ván cầu
  rail(du - 2, true)
  cv.outline(0.55)
}
DRAW.bridge_gate = (cv, s, I) => {              // cổng cầu: 2 trụ đỏ có mái nhỏ ở đầu cầu
  const du = TILE * 2, RED = RAMP.flag_red
  for (const y of [4, du - 4]) { I.box(-5, y - 5, 0, 5, y + 5, 8, null, faceCols(RAMP.stone_cream[2])); I.box(-3, y - 3, 8, 3, y + 3, 56, null, faceCols(RED[2])); I.box(-6, y - 6, 56, 6, y + 6, 61, null, faceCols(RAMP.sun_yellow[2])); I.box(-3, y - 3, 61, 3, y + 3, 66, null, faceCols(RED[1])) }
  I.box(-2, 4, 44, 2, du - 4, 50, null, faceCols(RED[1]))
  cv.outline(0.5)
}

// ── đền Ngọc Sơn trên đảo ──
DRAW.temple = (cv, s, I) => {
  const wu = TILE * s.w, du = TILE * s.d, rnd = rngOf(5)
  I.box(0, 0, 0, wu, du, 6, null, faceCols(RAMP.stone_cream[2]))
  const wc = '#efe4cb', wf = faceCols(wc), RED = RAMP.flag_red
  I.box(10, 10, 6, wu - 10, du - 10, 46, null, wf)
  for (const F of ['R', 'L']) {
    const span = (F === 'R' ? du : wu) - 20, off = 10, X = wu - 10, Y = du - 10
    const fq = (a0, a1, z0, z1, col) => F === 'R' ? I.fR(X, a0, a1, z0, z1, col) : I.fL(Y, a0, a1, z0, z1, col)
    for (let a = 0; a <= span; a += span / 4) fq(off + a - 2, off + a + 2, 6, 46, F === 'R' ? mix(dark(RED[2], 0.3), SHADOW_TEAL, 0.2) : RED[2])
    const dw = 18, dc = off + span / 2 - dw / 2
    fq(dc, dc + dw, 6, 34, mix(INK, RED[1], 0.35)); fq(dc + 2, dc + dw - 2, 6, 32, mix(INK, RED[1], 0.15)); fq(dc - 2, dc + dw + 2, 34, 38, RAMP.sun_yellow[2])
    fq(off, off + span, 38, 42, RED[1])
  }
  hipRoof(I, 2, 2, wu - 2, du - 2, 46, 24, TCR[2], TCR[3], TCR[1], dark(TCR[3], 0.28))
  I.box(wu / 2 - 14, du / 2 - 14, 62, wu / 2 + 14, du / 2 + 14, 78, null, wf)
  for (const F of ['R', 'L']) { const a = (F === 'R' ? du : wu) / 2 - 7; if (F === 'R') I.fR(wu / 2 + 14, a, a + 14, 64, 74, RAMP.moss_shutter[1]); else I.fL(du / 2 + 14, a, a + 14, 64, 74, RAMP.moss_shutter[2]) }
  hipRoof(I, wu / 2 - 20, du / 2 - 20, wu / 2 + 20, du / 2 + 20, 78, 22, TCR[2], TCR[3], TCR[1], dark(TCR[3], 0.28))
  I.post(wu / 2, du / 2, 100, 112, 2, RAMP.sun_yellow[2])
  cv.outline(0.5)
}

// ── Tháp Rùa: 3 tầng đá xám rêu, cửa vòm, mái nhọn nhỏ ──
DRAW.turtle_tower = (cv, s, I) => {
  const wu = TILE, base = '#9aa89a'
  let z = 0, inset = 0
  I.box(-4, -4, 0, wu + 4, wu + 4, 5, null, faceCols(RAMP.stone_cream[2]))
  z = 5
  for (let k = 0; k < 3; k++) {
    const h = 28 - k * 3, f = faceCols(mix(base, RAMP.foliage[3], 0.12 * k))
    I.box(inset, inset, z, wu - inset, wu - inset, z + h, null, f)
    for (const F of ['R', 'L']) {
      const a = (wu - 2 * inset) / 2 - 5 + inset
      const fq = (a0, a1, z0, z1, col) => F === 'R' ? I.fR(wu - inset, a0, a1, z0, z1, col) : I.fL(wu - inset, a0, a1, z0, z1, col)
      fq(a, a + 10, z + 4, z + h - 5, mix(INK, '#4a5a4a', 0.35)); fq(a - 1, a + 11, z + h - 5, z + h - 3, lite(base, 0.3))
    }
    I.box(inset - 1, inset - 1, z + h, wu - inset + 1, wu - inset + 1, z + h + 2, null, faceCols(lite(base, 0.15)))
    z += h + 2; inset += 4
  }
  hipRoof(I, inset - 2, inset - 2, wu - inset + 2, wu - inset + 2, z, 14, mix(RAMP.moss_shutter[1], INK, 0.2), RAMP.moss_shutter[2], RAMP.moss_shutter[1], RAMP.moss_shutter[0])
  I.post(wu / 2, wu / 2, z + 12, z + 22, 2, RAMP.sun_yellow[2])
  cv.outline(0.5)
}
