// ───────── công trình mốc: Ô Quan Chưởng, cầu Thê Húc, đền Ngọc Sơn, Tháp Rùa ─────────
LAYOUT.struct = (s) => { const L = blockLayout(TILE * s.w, TILE * s.d, s.hup); L.fp = [s.w, s.d]; return L }

const TCR = RAMP.terracotta
function brickFace(I, F, a0, a1, z0, z1, base, rnd, wu, du) {
  const fq = (x0, x1, y0, y1, col) => F === 'R' ? I.fR(wu, x0, x1, y0, y1, col) : I.fL(du, x0, x1, y0, y1, col)
  fq(a0, a1, z0, z1, base)
  for (let z = z0 + 3; z < z1; z += 4) fq(a0, a1, z, z + 1, dark(base, 0.22))
  for (let z = z0; z < z1; z += 4) for (let a = a0 + ((z / 4) % 2) * 5; a < a1; a += 10) if (rnd() < 0.5) fq(a, Math.min(a + 9, a1), z + 1, z + 3, rnd() < 0.5 ? lite(base, 0.1) : dark(base, 0.08))
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

// ── Ô Quan Chưởng (Đông Hà Môn): tường gạch vồ, 3 cổng vòm cuốn (giữa to, 2 bên nhỏ), bảng "ĐÔNG HÀ MÔN" trên cổng giữa,
//    nóc có lan can và vọng lâu 4 mái thu nhỏ đặt ngay trên cổng chính. Cổng xuyên suốt: nền, trời và phố bên kia nhìn thấy qua lòng cổng. ──
DRAW.gate = (cv, s, I) => {
  const wu = TILE * s.w, du = TILE * s.d, rnd = rngOf(77), Hb = 108
  const f = faceCols(TCR[2]), PLAST = '#e4d8bc'
  I.fL(du, 0, wu, 0, Hb, f.left); I.fR(wu, 0, du, 0, Hb, f.right)
  I.topq(0, wu, 0, du, Hb, mix(TCR[3], RAMP.stone_cream[2], 0.3))
  brickFace(I, 'R', 0, du, 0, Hb, f.right, rnd, wu, du); brickFace(I, 'L', 0, wu, 0, Hb, f.left, rnd, wu, du)
  for (let k = 0; k < 14; k++) { const a0 = Math.floor(rnd() * (du - 30)), z0 = 8 + Math.floor(rnd() * 60); I.fR(wu, a0, a0 + 8 + Math.floor(rnd() * 20), z0, z0 + 4 + Math.floor(rnd() * 6), mix(f.right, PLAST, 0.35)) }   // mảng vữa bong tróc
  I.fR(wu, 0, du, 0, 6, dark(f.right, 0.22)); I.fL(du, 0, wu, 0, 6, dark(f.left, 0.18))                                     // chân đế
  I.fR(wu, 0, du, Hb - 7, Hb - 4, lite(f.right, 0.3)); I.fL(du, 0, wu, Hb - 7, Hb - 4, lite(f.left, 0.3))                  // gờ phào
  const arch = (yc, hw, zs, zt, col) => {
    const pts = [[wu, yc + hw, 0], [wu, yc + hw, zs]]
    for (let t = 0; t <= 14; t++) { const a = t / 14 * Math.PI; pts.push([wu, yc + hw * Math.cos(a), zs + (zt - zs) * Math.sin(a)]) }
    pts.push([wu, yc - hw, zs], [wu, yc - hw, 0]); cv.poly(pts.map((p) => I.P(...p)), col)
  }
  const OPEN = '#ff00ff', holes = [[du / 2, 22, 46, 84], [56, 17, 24, 46], [du - 56, 17, 24, 46]]
  for (const [yc, hw, zs, zt] of holes) arch(yc, hw + 5, zs, zt + 5, lite(f.right, 0.38))                                        // viền vòm cuốn
  for (const [yc, hw, zs, zt] of holes) arch(yc, hw, zs, zt, OPEN)
  // bảng "ĐÔNG HÀ MÔN" đắp nổi mảnh sứ xanh, ngay trên vòm cổng chính, dưới vọng lâu
  const pc = du / 2, tw = textLen('ĐÔNG HÀ MÔN')
  I.fR(wu, pc - 31, pc + 31, 92, 104, lite(PLAST, 0.1)); I.fR(wu, pc - 30, pc + 30, 93, 103, '#2f8f86'); I.fR(wu, pc - 29, pc + 29, 94, 102, PLAST)
  drawText(I, 'R', wu, pc + tw / 2, 95, 'ĐÔNG HÀ MÔN', '#2a7f78')
  // lan can nóc (ô hoa thị / tứ giác) + vọng lâu 4 mái thu nhỏ ngay trên cổng chính
  const rail = (F) => { for (let a = 2; a < (F === 'R' ? du : wu) - 2; a += 5) { if (F === 'R') I.box(wu - 3, a, Hb, wu - 1, a + 2.5, Hb + 8, null, faceCols(PLAST)); else I.box(a, du - 3, Hb, a + 2.5, du - 1, Hb + 8, null, faceCols(PLAST)) } }
  rail('R'); rail('L')
  I.box(wu - 3.5, 0, Hb + 8, wu - 0.5, du, Hb + 10, null, faceCols(lite(PLAST, 0.1))); I.box(0, du - 3.5, Hb + 8, wu, du - 0.5, Hb + 10, null, faceCols(lite(PLAST, 0.1)))
  const z1 = Hb + 2, bw = 34, by0 = pc - 28, by1 = pc + 28, wf = faceCols(PLAST)
  I.box((wu - bw) / 2, by0, z1, (wu + bw) / 2, by1, z1 + 26, null, wf)
  for (const a of [by0 + 8, pc - 6, by1 - 20]) { I.fR((wu + bw) / 2, a, a + 12, z1 + 4, z1 + 22, RAMP.moss_shutter[1]); I.fR((wu + bw) / 2, a + 2, a + 10, z1 + 6, z1 + 20, RAMP.moss_shutter[2]) }
  for (const a of [(wu - bw) / 2 + 8, wu / 2 - 4]) I.fL(by1, a, a + 9, z1 + 4, z1 + 22, RAMP.moss_shutter[2])
  const z2 = z1 + 26
  hipRoof(I, (wu - bw) / 2 - 7, by0 - 8, (wu + bw) / 2 + 7, by1 + 8, z2, 22, TCR[2], TCR[3], TCR[1], dark(TCR[3], 0.28))
  I.post(wu / 2, pc, z2 + 22, z2 + 34, 2, RAMP.sun_yellow[2])
  // lòng cổng trong suốt (thấy nền, phố, người phía sau); chỉ giữ một dải má cổng mỏng bên phải để thấy độ dày tường
  const wallCol = (k) => mix(dark(f.right, 0.35), INK, 0.25 + 0.1 * k)
  const hwAt = ([, hw, zs, zt], z) => z <= zs ? hw : z >= zt ? 0 : hw * Math.sqrt(1 - ((z - zs) / (zt - zs)) ** 2)
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    if (cv.get(x, y) !== OPEN) continue
    const Y = wu - (x - I.ox), z = (wu + Y) / 2 - (y - I.oy)
    const h = holes.reduce((best, q) => (Math.abs(Y - q[0]) < Math.abs(Y - best[0]) ? q : best))
    let hit = false
    for (let t = 1; t <= 9 && t <= z; t++) { if (Math.abs(Y - t - h[0]) > hwAt(h, z - t) + 0.01) { hit = true; break } }
    if (hit) cv.set(x, y, wallCol(Math.min(1, (wu - (Y - h[0] + h[1]) / 2) / wu))); else cv.set(x, y, null)
  }
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

// ── cổng chào phố đi bộ: hai trụ đỏ, băng rôn chữ vàng bắc ngang phố, đèn lồng ──
DRAW.arch = (cv, s, I) => {
  const wu = TILE * s.w, du = TILE * s.d, RED = RAMP.flag_red, Y = RAMP.sun_yellow, cx = wu / 2
  for (const y of [10, du - 10]) {
    I.box(cx - 9, y - 9, 0, cx + 9, y + 9, 8, null, faceCols(RAMP.stone_cream[2]))
    I.box(cx - 6, y - 6, 8, cx + 6, y + 6, 100, null, faceCols(RED[2]))
    for (const z of [30, 62]) I.box(cx - 7, y - 7, z, cx + 7, y + 7, z + 3, null, faceCols(Y[2]))
    I.box(cx - 8, y - 8, 100, cx + 8, y + 8, 105, null, faceCols(Y[2]))
  }
  const x1 = cx + 3
  I.box(cx - 3, 4, 70, x1, du - 4, 102, null, faceCols(RED[1]))
  I.fR(x1, 8, du - 8, 73, 74.5, Y[2]); I.fR(x1, 8, du - 8, 97, 98.5, Y[2])
  I.box(cx - 5, 2, 102, x1 + 2, du - 2, 106, null, faceCols(TCR[2]))
  const txt = s.text, tw = (textLen(txt)) * 2 * (s.sc || 2) / 2
  drawText(I, 'R', x1, du / 2 + tw / 2 * 1, 79, txt, '#ffe27a', s.sc || 2)
  for (const y of [34, du - 34]) { I.line3([cx, y, 70], [cx, y, 64], '#4a2a1c'); I.box(cx - 3, y - 3, 52, cx + 3, y + 3, 64, null, faceCols(RED[3])); I.box(cx - 2, y - 2, 50, cx + 2, y + 2, 52, null, faceCols(Y[2])) }
  cv.outline(0.5)
}
// ── Tháp Bút (bờ đông hồ, cạnh cổng cầu Thê Húc): trụ đá 5 tầng, đầu nhọn như ngòi bút, khắc "TẢ THANH THIÊN" ──
DRAW.pen_tower = (cv, s, I) => {
  const stone = '#b4b6ac', f = faceCols(stone), c = 18
  I.box(1, 1, 0, 35, 35, 5, null, faceCols(RAMP.stone_cream[2])); I.box(5, 5, 5, 31, 31, 11, null, faceCols(mix(stone, RAMP.stone_cream[2], 0.4)))
  I.box(9, 9, 11, 27, 27, 104, null, f)
  for (const z of [34, 58, 82]) I.box(8, 8, z, 28, 28, z + 3, null, faceCols(lite(stone, 0.15)))
  I.box(11, 11, 104, 25, 25, 128, null, faceCols(mix(stone, RAMP.foliage[3], 0.1))); I.box(10, 10, 128, 26, 26, 131, null, faceCols(lite(stone, 0.15)))
  const tip = [c, c, 164], top = (z, x0, x1, col, colR) => { const P = (x, y) => I.P(x, y, z); cv.poly([P(x1, x0), P(x1, x1), I.P(...tip)], colR); cv.poly([P(x0, x1), P(x1, x1), I.P(...tip)], col) }
  top(131, 12, 24, f.left, f.right)
  { const z = 150, w = 12 * (164 - z) / 33; const P = (x, y) => I.P(x, y, z); cv.poly([P(c + w, c - w), P(c + w, c + w), I.P(...tip)], '#34343a'); cv.poly([P(c - w, c + w), P(c + w, c + w), I.P(...tip)], '#4a4a52') }
  drawVText(I, 'R', 27, 19.5, 100, 'TẢTHANHTHIÊN', '#52564e')
  cv.outline(0.5)
}
// ── Đài Nghiên: bệ đá, nghiên mực bằng đá ──
DRAW.inkstone = (cv, s, I) => {
  I.box(4, 4, 0, 32, 32, 8, null, faceCols(RAMP.stone_cream[2])); I.box(9, 9, 8, 27, 27, 15, null, faceCols(mix('#b4b6ac', RAMP.stone_cream[2], 0.3)))
  const [cx, cy] = I.P(18, 18, 21); cv.ell(cx, cy + 1, 13, 6.5, '#6a6e68'); cv.ell(cx, cy, 13, 6.5, '#9a9e96'); cv.ell(cx, cy, 11, 5, '#26262c'); cv.ell(cx - 2, cy - 1, 5, 2, '#3c3c46')
  I.box(14, 14, 15, 22, 22, 20, null, faceCols('#8a8e86'))
  cv.outline(0.5)
}
