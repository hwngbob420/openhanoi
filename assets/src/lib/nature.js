// ───────── cây cối: gốc cây nằm ở (px,py) trong ảnh ─────────
LAYOUT.free = (s) => ({ w: s.w + 2 * MARGIN, h: s.h + 2 * MARGIN, px: s.px + MARGIN, py: s.py + MARGIN, fp: s.fp || null })

// bóng đổ dạng ca-rô thưa (không dùng nửa trong suốt): ô chẵn lẻ
function groundShadow(cv, cx, cy, rx, ry, col = '#2a3b4a') {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry
    if (dx * dx + dy * dy <= 1 && ((x + y) & 1) === 0) cv.set(x, y, col)
  }
}
// tán lá: nhiều khối tròn, tối ở dưới-phải, sáng ở trên-trái, lấm tấm lá
function foliage(cv, cx, cy, r, rnd, ramp, opts = {}) {
  const lumps = opts.lumps || 5, spread = opts.spread || 0.55, sq = opts.squash || 0.8
  const L = []
  for (let i = 0; i < lumps; i++) { const a = i / lumps * 6.283 + rnd() * 0.6, d = (i === 0 ? 0 : spread) * r * (0.6 + rnd() * 0.5); L.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * sq, r * (0.55 + rnd() * 0.3)]) }
  L.sort((a, b) => a[1] - b[1])
  const shade = [ramp[0], ramp[1], ramp[2], ramp[3], ramp[4]]
  for (const [x, y, rr] of L) {
    cv.ell(x + 1, y + 1.5, rr, rr * sq, shade[0])
    cv.ell(x, y, rr * 0.96, rr * sq * 0.96, shade[1])
    cv.ell(x - rr * 0.12, y - rr * 0.14, rr * 0.8, rr * sq * 0.78, shade[2])
    cv.ell(x - rr * 0.25, y - rr * 0.3, rr * 0.5, rr * sq * 0.48, shade[3])
  }
  for (let i = 0; i < r * 2.2; i++) {            // lá sáng lấm tấm + lá tối lởm chởm viền
    const [x, y, rr] = L[Math.floor(rnd() * L.length)], a = rnd() * 6.283, d = rr * Math.sqrt(rnd()) * 0.85
    const px_ = Math.round(x + Math.cos(a) * d), py_ = Math.round(y + Math.sin(a) * d * sq)
    const c = cv.get(px_, py_); if (c && (py_ < y)) { cv.set(px_, py_, shade[4]); if (rnd() < 0.5) cv.set(px_ + 1, py_, shade[3]) }
  }
  return L
}
function trunk(cv, I, h, w, col) {
  I.box(-w / 2, -w / 2, 0, w / 2, w / 2, h, null, { top: lite(col, 0.2), left: lite(col, 0.1), right: mix(dark(col, 0.3), SHADOW_TEAL, 0.2) })
}
const TRUNK = '#6b4a32'
DRAW.tree = (cv, s, I) => {
  const rnd = rngOf(hashStr(s.name)), F = RAMP.foliage, [px, py] = [I.ox, I.oy]
  groundShadow(cv, px + 6, py + 2, s.r * 0.75, s.r * 0.3)
  if (s.type === 'bang') {                      // bàng: tầng lá bè, thân thẳng
    trunk(cv, I, s.h * 0.55, 5, TRUNK)
    for (const dy of [0.95, 0.62, 0.33]) foliage(cv, px, py - s.h * (1 - dy * 0.45) + 4, s.r * (0.55 + dy * 0.42), rnd, F, { lumps: 6, spread: 0.7, squash: 0.5 })
  } else if (s.type === 'small') {
    trunk(cv, I, s.h * 0.4, 3, TRUNK)
    foliage(cv, px, py - s.h * 0.68, s.r, rnd, F, { lumps: 5, spread: 0.45, squash: 0.9 })
  } else if (s.type === 'phuong') {             // phượng: tán dù rộng, đốm hoa đỏ
    trunk(cv, I, s.h * 0.5, 5, TRUNK)
    const L = foliage(cv, px, py - s.h * 0.72, s.r, rnd, F, { lumps: 7, spread: 0.75, squash: 0.55 })
    for (let i = 0; i < s.r * 3; i++) { const [x, y, rr] = L[Math.floor(rnd() * L.length)], a = rnd() * 6.283, d = rr * Math.sqrt(rnd()) * 0.9; const X = Math.round(x + Math.cos(a) * d), Y = Math.round(y + Math.sin(a) * d * 0.55); if (cv.get(X, Y)) { const c = rnd() < 0.5 ? RAMP.flag_red[3] : RAMP.flag_red[2]; cv.set(X, Y, c); if (rnd() < 0.6) cv.set(X + 1, Y, c); if (rnd() < 0.3) cv.set(X, Y + 1, RAMP.flag_red[1] ) } }
  } else if (s.type === 'lieu') {               // liễu rủ: tán nhẹ + dải lá buông xuống
    trunk(cv, I, s.h * 0.45, 4, '#7a5a3c')
    const cy = py - s.h * 0.72
    const L = foliage(cv, px, cy, s.r, rnd, [F[1], F[2], mix(F[3], RAMP.sun_yellow[3], 0.18), mix(F[4], RAMP.sun_yellow[3], 0.25), RAMP.sun_yellow[3]], { lumps: 6, spread: 0.6, squash: 0.7 })
    for (let i = 0; i < s.r * 2.4; i++) { const [x, y, rr] = L[Math.floor(rnd() * L.length)], a = rnd() * 6.283; const X = Math.round(x + Math.cos(a) * rr * 0.9), Y0 = Math.round(y + Math.sin(a) * rr * 0.55 * 0.9), len = 8 + Math.floor(rnd() * s.h * 0.35)
      for (let k = 0; k < len; k++) cv.set(X + Math.round(Math.sin(k / 4 + i) * 0.9), Y0 + k, k % 5 === 4 ? F[1] : (k % 2 ? F[2] : F[3])) }
  } else if (s.type === 'bush') {
    foliage(cv, px, py - s.r * 0.6, s.r, rnd, F, { lumps: 4, spread: 0.5, squash: 0.8 })
    if (s.flower) for (let i = 0; i < 9; i++) { const X = px + Math.round((rnd() - 0.5) * s.r * 1.6), Y = py - s.r * 0.6 + Math.round((rnd() - 0.6) * s.r); if (cv.get(X, Y)) cv.set(X, Y, RAMP.bougainvillea[1 + Math.floor(rnd() * 3)]) }
  }
  cv.outline(0.55)
}

LAYOUT.tree = LAYOUT.free
