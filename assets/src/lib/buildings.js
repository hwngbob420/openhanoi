// ───────── nhà ống, nhà mặt phố, cao ốc ─────────
const FH = 30, GH = 36       // cao 1 tầng / tầng trệt (u)
const SIGN_COLS = ['#d4382c', '#2f7a58', '#2f62c9', '#e0a52a', '#a3202a', '#7a1f4a', '#3f8f7b']
const roofRise = (s) => { const span = s.ridge === 'x' ? TILE * s.d : TILE * s.w; return Math.round(span / 2 * 0.62) }
const houseH = (s) => GH + (s.floors - 1) * FH

LAYOUT.house = (s) => {
  const wu = TILE * s.w, du = TILE * s.d
  const extra = s.roof === 'tile' ? roofRise(s) + 2 : 26
  const L = blockLayout(wu, du, houseH(s) + extra)
  L.fp = [s.w, s.d]; return L
}

DRAW.house = (cv, s, I) => {
  const wu = TILE * s.w, du = TILE * s.d, Hb = houseH(s), rnd = rngOf(hashStr(s.name))
  const wall = s.wall, f = faceCols(wall)
  I.box(0, 0, 0, wu, du, Hb, null, f)
  const fq = (F, a0, a1, z0, z1, col) => F === 'R' ? I.fR(wu, a0, a1, z0, z1, col) : I.fL(du, a0, a1, z0, z1, col)
  const faceCol = (F) => F === 'R' ? f.right : f.left
  const GLASS = mix(RAMP.lake_teal[0], INK, 0.35), GREEN = RAMP.moss_shutter[2], GREEN_D = RAMP.moss_shutter[1]
  // chân tường
  fq('R', 0, du, 0, 3, dark(f.right, 0.25)); fq('L', 0, wu, 0, 3, dark(f.left, 0.2))
  for (const F of ['R', 'L']) {
    const span = F === 'R' ? du : wu, isFront = s.front === F, col = faceCol(F)
    // đường gờ sàn
    for (let k = 1; k < s.floors; k++) fq(F, 0, span, GH + (k - 1) * FH - 1, GH + (k - 1) * FH, dark(col, 0.16))
    if (s.style === 'modern') {
      for (let k = 0; k < s.floors; k++) { const z0 = (k === 0 ? 6 : GH + (k - 1) * FH + 6); fq(F, 3, span - 3, z0, z0 + (k === 0 ? 24 : 18), GLASS); fq(F, 3, span - 3, z0 + (k === 0 ? 21 : 15), z0 + (k === 0 ? 24 : 18), mix(RAMP.lake_teal[3], GLASS, 0.3)) }
      for (let a = 3; a < span - 3; a += 12) fq(F, a, a + 1, 6, houseH(s) - 6, dark(col, 0.2))
      continue
    }
    const n = Math.max(1, Math.round(span / 18)), pitch = span / n
    // cửa sổ các tầng trên
    for (let k = 1; k < s.floors; k++) {
      const z0 = GH + (k - 1) * FH + 8
      for (let i = 0; i < n; i++) {
        const c = pitch * (i + 0.5), a0 = Math.round(c - 5), a1 = a0 + 10
        if (rnd() < 0.06) { fq(F, a0, a1, z0, z0 + 15, mix(RAMP.bougainvillea[2], col, 0.4)); continue }
        fq(F, a0, a1, z0, z0 + 15, GREEN)                     // cánh chớp xanh
        fq(F, a0 + 2, a1 - 2, z0, z0 + 15, GLASS)
        fq(F, a0 + 2, a1 - 2, z0 + 11, z0 + 15, mix(RAMP.lake_teal[2], GLASS, 0.45))
        fq(F, a0 - 1, a1 + 1, z0 - 1, z0, lite(col, 0.45))     // bậu cửa
        fq(F, a0, a0 + 1, z0, z0 + 15, GREEN_D)
        if (isFront && k >= 2 && rnd() < 0.55) {              // ban công: lan can sắt xanh
          fq(F, a0 - 3, a1 + 3, z0 - 3, z0 - 2, lite(col, 0.3))
          for (let a = a0 - 3; a <= a1 + 2; a += 2) fq(F, a, a + 1, z0 - 2, z0 + 4, GREEN_D)
          fq(F, a0 - 3, a1 + 3, z0 + 4, z0 + 5, GREEN_D)
          if (rnd() < 0.5) { const pa = a0 - 1 + Math.floor(rnd() * 8); fq(F, pa, pa + 3, z0 + 5, z0 + 8, RAMP.foliage[2]); fq(F, pa + 1, pa + 2, z0 + 8, z0 + 9, RAMP.bougainvillea[2]) }   // chậu cây
        }
      }
    }
    // tầng trệt
    if (isFront) {
      if (s.shop) {
        const ow = Math.round(span * 0.74), a0 = Math.round((span - ow) / 2), a1 = a0 + ow
        fq(F, a0, a1, 2, 25, mix(INK, wall, 0.18))
        for (let z = 3; z < 25; z += 4) fq(F, a0, a1, z, z + 1, mix(INK, wall, 0.38))             // cửa cuốn / kệ hàng
        for (let a = a0 + 2; a < a1 - 2; a += 5) { const gc = [RAMP.flag_red[2], RAMP.sun_yellow[2], RAMP.foliage[3], RAMP.bougainvillea[2]][Math.floor(rnd() * 4)]; fq(F, a, a + 3, 2, 2 + 3 + Math.floor(rnd() * 5), gc) }
        const sc = s.sign || SIGN_COLS[Math.floor(rnd() * SIGN_COLS.length)]
        const sa0 = Math.max(1, a0 - 4), sa1 = Math.min(span - 1, a1 + 4)
        fq(F, sa0, sa1, 26, 34, sc); fq(F, sa0, sa1, 33, 34, lite(sc, 0.35)); fq(F, sa0, sa1, 26, 27, dark(sc, 0.35))
        for (let a = sa0 + 3; a < sa1 - 4; a += 5) fq(F, a, a + 3, 29, 31, lite(sc, 0.8))        // "chữ" biển
        if (rnd() < 0.5) { const aw = [RAMP.flag_red[2], RAMP.sun_yellow[2], RAMP.moss_shutter[3]][Math.floor(rnd() * 3)]; fq(F, a0 - 1, a1 + 1, 21, 25, aw) }
      } else {
        const da = Math.round(span / 2 - 5)
        fq(F, da, da + 10, 3, 26, RAMP.terracotta[1]); fq(F, da + 1, da + 9, 4, 25, RAMP.terracotta[2]); fq(F, da + 8, da + 9, 12, 14, RAMP.sun_yellow[2])
        for (let i = 0; i < n; i++) { const c = pitch * (i + 0.5); if (Math.abs(c - span / 2) < 12) continue; const a0 = Math.round(c - 5); fq(F, a0, a0 + 10, 10, 25, GREEN); fq(F, a0 + 2, a0 + 8, 10, 25, GLASS) }
      }
    } else {
      for (let i = 0; i < n; i++) { const c = pitch * (i + 0.5), a0 = Math.round(c - 4); if (rnd() < 0.3) continue; fq(F, a0, a0 + 8, 11, 25, GREEN); fq(F, a0 + 2, a0 + 6, 11, 25, GLASS) }
    }
    // máy lạnh + đồ phơi trên mặt không phải mặt tiền
    if (!isFront) for (let q = 0; q < 1 + Math.floor(rnd() * 3); q++) {
      const k = 1 + Math.floor(rnd() * Math.max(1, s.floors - 1)), a = 3 + Math.floor(rnd() * Math.max(1, span - 14)), z = GH + (k - 1) * FH + 22
      if (z > Hb - 3) continue
      fq(F, a, a + 8, z, z + 6, '#b9bec4'); fq(F, a, a + 8, z, z + 1, '#7d8a9a'); fq(F, a + 2, a + 6, z + 2, z + 4, '#7d8a9a')
    }
  }
  // viền cạnh nhà
  I.line3([wu, du, 0], [wu, du, Hb], lite(wall, 0.25))
  I.line3([0, du, Hb], [wu, du, Hb], lite(wall, 0.45)); I.line3([wu, du, Hb], [wu, 0, Hb], lite(wall, 0.2))
  // mái
  if (s.roof === 'tile') {
    const rise = roofRise(s), T = RAMP.terracotta
    const near = s.ridge === 'x' ? T[3] : T[2], far = s.ridge === 'x' ? T[2] : T[1]
    const gableCol = s.ridge === 'x' ? f.right : f.left
    I.gable(0, 0, wu, du, Hb, rise, s.ridge, { near, far, gable: gableCol, line: dark(near, 0.28), ridge: T[4] })
    for (let i = 0; i < 6; i++) { const p = I.P(rnd() * wu, du - 1 - rnd() * 2, Hb + 1); if (cv.get(p[0], p[1])) cv.set(p[0], p[1], RAMP.moss_shutter[3]) }
  } else {
    const rf = mix(RAMP.stone_cream[2], wall, 0.25)
    I.topq(0, wu, 0, du, Hb, mix(rf, RAMP.asphalt[3], 0.18))
    I.topq(3, wu - 3, 3, du - 3, Hb, rf)
    // bồn nước inox, chuồng mái tôn xanh, dàn cây
    const tx = 6 + Math.floor(rnd() * Math.max(1, wu - 22)), ty = 6 + Math.floor(rnd() * Math.max(1, du - 22))
    if (s.style !== 'modern') {
      I.box(tx, ty, Hb, tx + 11, ty + 11, Hb + 4, null, faceCols('#8a929a'))
      I.box(tx + 1, ty + 1, Hb + 4, tx + 10, ty + 10, Hb + 17, null, { top: '#e6ecf0', left: '#c3ccd4', right: '#8a97a3' })
      I.topq(tx + 1, tx + 10, ty + 1, ty + 10, Hb + 17, '#eef3f6')
      if (rnd() < 0.6) { const sx = wu - 18, sy = du - 18; if (sx > tx + 12 || sy > ty + 12) I.box(Math.max(3, sx), Math.max(3, sy), Hb, Math.max(3, sx) + 13, Math.max(3, sy) + 12, Hb + 11, null, faceCols(RAMP.lake_teal[2])) }
    } else { I.box(wu / 2 - 8, du / 2 - 8, Hb, wu / 2 + 8, du / 2 + 8, Hb + 10, null, faceCols('#9aa5ae')) }
  }
}

// ───────── cao ốc kính ─────────
LAYOUT.tower = (s) => { const L = blockLayout(TILE * s.w, TILE * s.d, s.h + 40); L.fp = [s.w, s.d]; return L }
DRAW.tower = (cv, s, I) => {
  const wu = TILE * s.w, du = TILE * s.d, H = s.h, rnd = rngOf(hashStr(s.name))
  const glass = (z) => mix(RAMP.lake_teal[1], RAMP.lake_teal[3], Math.min(1, z / H * 1.1))
  const POD = 40
  // thân kính: dải cửa kính + khung đứng, màu chuyển dần theo độ cao
  for (const F of ['R', 'L']) {
    const span = F === 'R' ? du : wu
    const fq = (a0, a1, z0, z1, col) => F === 'R' ? I.fR(wu, a0, a1, z0, z1, col) : I.fL(du, a0, a1, z0, z1, col)
    const sh = (c) => F === 'R' ? mix(dark(c, 0.3), SHADOW_TEAL, 0.25) : c
    fq(0, span, 0, H, sh(RAMP.lake_teal[1]))
    for (let z = POD; z < H - 6; z += 10) { fq(2, span - 2, z, z + 7, sh(glass(z))); fq(2, span - 2, z + 5, z + 7, sh(lite(glass(z), 0.28))) }
    for (let a = 0; a <= span; a += 12) fq(a, a + 1, POD - 2, H, sh(RAMP.asphalt[1]))
    // phản chiếu mây / hoàng hôn
    for (let q = 0; q < 6; q++) { const a = 4 + Math.floor(rnd() * (span - 14)), z = POD + 10 * Math.floor(rnd() * ((H - POD) / 10 - 1)); fq(a, a + 8, z + 2, z + 6, sh(mix(RAMP.sun_yellow[3], glass(z), 0.45))) }
  }
  I.topq(0, wu, 0, du, H, RAMP.asphalt[3]); I.topq(4, wu - 4, 4, du - 4, H, lite(RAMP.asphalt[3], 0.15))
  I.box(wu / 2 - 14, du / 2 - 14, H, wu / 2 + 14, du / 2 + 14, H + 10, null, faceCols('#9aa5ae'))
  I.line3([wu / 2, du / 2, H + 10], [wu / 2, du / 2, H + 34], RAMP.asphalt[4])
  // bục đế đá + cửa vào
  const pf = faceCols(RAMP.stone_cream[3])
  I.fL(du, 0, wu, 0, POD, pf.left); I.fR(wu, 0, du, 0, POD, pf.right)
  for (const F of ['R', 'L']) { const span = F === 'R' ? du : wu; const fq = (a0, a1, z0, z1, col) => F === 'R' ? I.fR(wu, a0, a1, z0, z1, col) : I.fL(du, a0, a1, z0, z1, col)
    const gc = F === 'R' ? mix(RAMP.lake_teal[1], INK, 0.3) : RAMP.lake_teal[2]
    fq(6, span - 6, 4, 32, gc); for (let a = 6; a < span - 6; a += 9) fq(a, a + 1, 4, 32, RAMP.stone_cream[1]); fq(4, span - 4, 32, 36, RAMP.flag_red[2]) }
}
