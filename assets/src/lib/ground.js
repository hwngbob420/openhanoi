// ───────── ô nền 72x36 (hình thoi), ghép liền không khe ─────────
// mask cạnh: bit0 = cạnh -y (trên-phải), bit1 = +x (dưới-phải), bit2 = +y (dưới-trái), bit3 = -x (trên-trái)
LAYOUT.tile = () => ({ w: 72, h: 36, px: 36, py: 0, fp: [1, 1], bare: true })

function h2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }

function paintTile(cv, fn) {
  for (let y = 0; y < 36; y++) for (let x = 0; x < 72; x++) {
    const sx = (x + 0.5 - 36) / 36, sy = (y + 0.5) / 18
    if (Math.abs(sx) + Math.abs(sy - 1) > 1) continue
    const u = (sy + sx) / 2, v = (sy - sx) / 2        // toạ độ lưới trong ô, 0..1
    const c = fn(u, v, x, y)
    if (c) cv.set(x, y, c)
  }
}
// khoảng cách tới 4 cạnh (đơn vị ô)
const edgeD = (u, v) => [v, 1 - u, 1 - v, u]

const A = RAMP.asphalt, ST = RAMP.stone_cream, GR = RAMP.foliage, LK = RAMP.lake_teal, OC = RAMP.ochre_wall, TC = RAMP.terracotta

DRAW.tile = (cv, s) => {
  const k = s.k
  if (k === 'asphalt') paintTile(cv, (u, v, x, y) => {
    let c = A[1]; const r = h2(x, y, 1)
    if (r > 0.93) c = A[2]; else if (r < 0.04) c = A[0]
    if (s.line) {                       // vạch vàng giữa đường (ghép 2 ô cạnh nhau thành vạch đôi)
      const d = { xa: 1 - v, xb: v, ya: 1 - u, yb: u }[s.line]
      if (d < 0.07) c = RAMP.sun_yellow[2]
    }
    if (s.dash) {                       // vạch trắng đứt đoạn giữa làn
      const d = s.dash === 'x' ? Math.abs(v - 0.5) : Math.abs(u - 0.5), t = s.dash === 'x' ? u : v
      if (d < 0.035 && (t % 0.5) < 0.28) c = ST[4]
    }
    return c
  })
  else if (k === 'zebra') paintTile(cv, (u, v, x, y) => {      // vạch qua đường; sọc dọc theo chiều xe chạy
    let c = A[1]; const r = h2(x, y, 2); if (r > 0.94) c = A[2]
    const t = s.axis === 'x' ? v : u
    if ((t * 4) % 1 < 0.5 && t > 0.04 && t < 0.96) c = ST[4]
    return c
  })
  else if (k === 'sidewalk') paintTile(cv, (u, v, x, y) => {   // vỉa hè lát gạch, bó vỉa phía sát đường
    const ed = edgeD(u, v), m = s.mask || 0
    for (let i = 0; i < 4; i++) if (m & (1 << i)) {
      if (ed[i] < 0.07) return ST[4]
      if (ed[i] < 0.13) return ST[2]
    }
    const gu = Math.floor(u * 4), gv = Math.floor(v * 4)
    const fu = (u * 4) % 1, fv = (v * 4) % 1
    if (fu < 0.1 || fv < 0.1) return ST[1]
    const t = h2(gu, gv, 7 + (s.alt || 0)); return t > 0.7 ? ST[3] : t > 0.25 ? ST[2] : ST[3]
  })
  else if (k === 'plaza') paintTile(cv, (u, v, x, y) => {      // sân lát đá lớn, so le
    const gu = Math.floor(u * 2), gv = Math.floor(v * 2), fu = (u * 2) % 1, fv = (v * 2) % 1
    if (fu < 0.07 || fv < 0.07) return mix(TC[3], ST[2], 0.5)
    const t = h2(gu, gv, 9 + (s.alt || 0)); return t > 0.6 ? mix(TC[4], ST[4], 0.55) : ST[3]
  })
  else if (k === 'grass') paintTile(cv, (u, v, x, y) => {
    const r = h2(x, y, 3 + (s.alt || 0)); let c = GR[3]
    if (r > 0.9) c = GR[4]; else if (r < 0.14) c = GR[2]; else if (r < 0.2) c = GR[3]
    if (s.alt === 1 && h2(x >> 1, y >> 1, 5) > 0.985) c = RAMP.bougainvillea[3]
    return c
  })
  else if (k === 'water') paintTile(cv, (u, v, x, y) => {
    const ed = edgeD(u, v), m = s.mask || 0
    for (let i = 0; i < 4; i++) if (m & (1 << i)) { if (ed[i] < 0.07) return ST[2]; if (ed[i] < 0.12) return ST[1] }
    let c = LK[2]; const f = s.frame || 0
    const band = (y + f * 2 + Math.floor(x / 8) * 3) % 8
    if (band === 0 && h2(x >> 2, y, 11) > 0.45) c = LK[3]
    if (band === 4 && h2(x >> 1, y, 12 + f) > 0.82) c = LK[4]
    if (h2(x, y, 13) < 0.05) c = LK[1]
    return c
  })
  else if (k === 'rail') paintTile(cv, (u, v, x, y) => {       // ray dọc trục x; đá dăm + tà vẹt + 2 ray
    let c = A[3]; const r = h2(x, y, 21); if (r > 0.82) c = A[4]; else if (r < 0.2) c = A[2]
    if (v > 0.24 && v < 0.76 && (u * 8) % 1 < 0.42) c = '#5a3d2b'
    if (v > 0.24 && v < 0.76 && (u * 8) % 1 < 0.42 && h2(x, y, 22) > 0.8) c = '#7a5638'
    if (Math.abs(v - 0.36) < 0.04 || Math.abs(v - 0.64) < 0.04) c = '#d7dde4'
    if (Math.abs(v - 0.4) < 0.025 || Math.abs(v - 0.68) < 0.025) c = A[1]
    return c
  })
  else if (k === 'railroad') paintTile(cv, (u, v, x, y) => {   // ray đi qua đường nhựa (điểm giao cắt)
    let c = A[1]; const r = h2(x, y, 23); if (r > 0.93) c = A[2]
    if (Math.abs(v - 0.36) < 0.04 || Math.abs(v - 0.64) < 0.04) c = '#d7dde4'
    if (Math.abs(v - 0.4) < 0.025 || Math.abs(v - 0.68) < 0.025) c = A[0]
    if (v > 0.2 && v < 0.8 && (u < 0.06 || u > 0.94)) c = '#5a3d2b'
    return c
  })
  else if (k === 'market') paintTile(cv, (u, v, x, y) => {
    const gu = Math.floor(u * 3), gv = Math.floor(v * 3), fu = (u * 3) % 1, fv = (v * 3) % 1
    let c = h2(gu, gv, 31 + (s.alt || 0)) > 0.5 ? TC[3] : TC[2]
    if (fu < 0.07 || fv < 0.07) c = TC[1]
    if (h2(x, y, 32) > 0.92) c = TC[1]
    return c
  })
  else if (k === 'alley') paintTile(cv, (u, v, x, y) => {      // sân ngõ: alt0 bê tông đổ tấm, alt1 gạch đỏ lát nghiêng (sân chung), alt2 bê tông có nắp cống
    const ed = edgeD(u, v), a = s.alt || 0, r = h2(x, y, 61 + a)
    const gu = Math.floor(u * 2), gv = Math.floor(v * 2), fu = (u * 2) % 1, fv = (v * 2) % 1
    let c
    if (a === 1) {
      const bu = Math.floor(u * 6), bv = Math.floor(v * 6), fb = ((u + v) * 6) % 1
      c = h2(bu, bv, 66) > 0.55 ? TC[3] : TC[2]
      if (fb < 0.1) c = TC[1]
      if (r > 0.94) c = mix(c, GR[2], 0.4)
    } else {
      c = mix(ST[2], A[3], 0.42)
      if (r > 0.92) c = mix(ST[3], A[3], 0.3); else if (r < 0.16) c = mix(ST[1], A[2], 0.45)
      if (fu < 0.05 || fv < 0.05) c = mix(ST[1], A[2], 0.6)                                   // khe tấm bê tông
      if (Math.abs(v - 0.5) < 0.035 && h2(gu, 1, 67) > 0.5) c = mix(A[2], LK[1], 0.35)        // rãnh thoát nước ẩm giữa ngõ
    }
    for (let i = 0; i < 4; i++) if (ed[i] < 0.14 && h2(x >> 1, y, 68 + i) > 0.8) c = mix(c, GR[2], 0.55)   // rêu chân tường
    if (a === 2 && Math.hypot(u - 0.5, v - 0.5) < 0.17) c = Math.hypot(u - 0.5, v - 0.5) < 0.12 && ((x + y) & 1) ? A[1] : A[2]
    return c
  })
  else if (k === 'dirt') paintTile(cv, (u, v, x, y) => { const r = h2(x, y, 41); return r > 0.9 ? OC[3] : r < 0.15 ? OC[1] : OC[2] })
  else if (k === 'gravel') paintTile(cv, (u, v, x, y) => { const r = h2(x, y, 51); return r > 0.8 ? A[4] : r < 0.2 ? A[2] : A[3] })
}
