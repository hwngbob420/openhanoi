// ───────── lõi vẽ isometric 2:1 cho Hà Nội pixel game ─────────
// Đơn vị "u" = 1 pixel dọc trục lưới: đi 1u theo +x thì màn hình dịch (+1, +0.5).
// 1 ô lưới = 36u, ảnh ô = 72x36. Mặt PHẢI của khối là mặt x=const (+x), mặt TRÁI là y=const (+y).
// Ánh sáng ấm từ trái-trên: mặt trái sáng, mặt phải ngả xanh teal.
const TILE = 36, MARGIN = 2
const DRAW = {}, LAYOUT = {}

const hx = (s) => '#' + s
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
function rgb2hex(r, g, b) { const f = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b) }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t) }
const dark = (c, t = 0.3) => mix(c, '#1c1822', t)
const lite = (c, t = 0.25) => mix(c, '#fbf6e8', t)
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

const PAL = {
 "ochre_wall":   ["6b4423","9a6a2c","c9923f","e8b95a","f7dc8c"],
 "terracotta":   ["4a2420","7d3a2c","a85a3c","cc7f50","e8a678"],
 "moss_shutter": ["1f3a2e","2f5a45","4a7d5c","7aa57a","a9c795"],
 "foliage":      ["18382a","245a3a","3a8040","6aa84a","a8cf6a"],
 "asphalt":      ["262d3a","3a4556","566478","7d8a9a","a6b1bd"],
 "stone_cream":  ["6e5a48","9b856b","c4ae8e","e0d0b0","f4ead2"],
 "lake_teal":    ["1e4a5a","2f7080","52949a","8cbfba","c6e3d8"],
 "bougainvillea":["7a1f4a","b0366a","d9629a","f09ac0"],
 "flag_red":     ["6a1418","a3202a","d4382c","ef6a4c"],
 "sun_yellow":   ["b8801c","e0a52a","f2c23c","fbe08a"],
 "ink":          ["1c1822","2a3b4a","fbf6e8"]
}

const RAMP = {}
for (const k in PAL) RAMP[k] = PAL[k].map(hx)
const INK = '#1c1822'
const SHADOW_TEAL = '#2f7080'
// bộ ba mặt: đỉnh sáng, trái (sáng ấm), phải (bóng teal)
function faceCols(base) { return { top: lite(base, 0.28), left: base, right: mix(dark(base, 0.28), SHADOW_TEAL, 0.22) } }

class Cv {
  constructor(w, h) { this.w = w; this.h = h; this.b = new Array(w * h).fill(null) }
  set(x, y, col) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.b[y * this.w + x] = col }
  get(x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.b[y * this.w + x] : null }
  rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col) }
  // đa giác: điền các pixel có tâm nằm trong; pts = [[x,y],...]
  poly(pts, col) {
    let y0 = Infinity, y1 = -Infinity
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]) }
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = []
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length]
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]))
      }
      xs.sort((p, q) => p - q)
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.ceil(xs[k + 1] - 0.5) - 1; x++) this.set(x, y, col)
    }
  }
  line(x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
    let e = dx + dy
    for (;;) { this.set(x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx } if (e2 <= dx) { e += dx; y0 += sy } }
  }
  ell(cx, cy, rx, ry, col) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, col)
    }
  }
  circ(cx, cy, r, col) { this.ell(cx, cy, r, r, col) }
  // viền 1px quanh phần đã vẽ; màu viền = màu pixel kề, tối đi (viền "ấm", không đen tuyền)
  outline(strength = 0.5) {
    const o = []
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue
      let c = null
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const n = this.get(x + dx, y + dy); if (n) { c = n; break } }
      if (c) o.push([x, y, dark(c, strength)])
    }
    for (const [x, y, c] of o) this.set(x, y, c)
  }
  // đổ lên pxl: gộp các đoạn ngang cùng màu
  commit(c) {
    for (let y = 0; y < this.h; y++) {
      let x = 0
      while (x < this.w) {
        const col = this.b[y * this.w + x]
        if (!col) { x++; continue }
        let e = x + 1
        while (e < this.w && this.b[y * this.w + e] === col) e++
        c.rect(x, y, e - x, 1, col); x = e
      }
    }
  }
}

// Phép chiếu: (x,y,z) -> màn hình, gốc (ox,oy) là đỉnh trên (0,0,0) của ô
class Iso {
  constructor(cv, ox, oy) { this.cv = cv; this.ox = ox; this.oy = oy }
  P(x, y, z = 0) { return [Math.round(this.ox + x - y), Math.round(this.oy + (x + y) / 2 - z)] }
  quad(a, b, c, d, col) { this.cv.poly([this.P(...a), this.P(...b), this.P(...c), this.P(...d)], col) }
  line3(a, b, col) { const p = this.P(...a), q = this.P(...b); this.cv.line(p[0], p[1], q[0], q[1], col) }
  // mặt phải: mặt phẳng x=X, tọa độ ngang y
  fR(X, y0, y1, z0, z1, col) { this.quad([X, y1, z0], [X, y0, z0], [X, y0, z1], [X, y1, z1], col) }
  // mặt trái: mặt phẳng y=Y, tọa độ ngang x
  fL(Y, x0, x1, z0, z1, col) { this.quad([x0, Y, z0], [x1, Y, z0], [x1, Y, z1], [x0, Y, z1], col) }
  topq(x0, x1, y0, y1, z, col) { this.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], col) }
  box(x0, y0, z0, x1, y1, z1, base, cols) {
    const f = cols || faceCols(base)
    this.fL(y1, x0, x1, z0, z1, f.left)
    this.fR(x1, y0, y1, z0, z1, f.right)
    this.topq(x0, x1, y0, y1, z1, f.top)
  }
  // đường chân gờ sáng ở cạnh dọc giữa 2 mặt + mép trên
  edges(x0, y0, z0, x1, y1, z1, col) {
    this.line3([x1, y1, z0], [x1, y1, z1], col)
    this.line3([x0, y1, z1], [x1, y1, z1], lite(col, 0.2)); this.line3([x1, y1, z1], [x1, y0, z1], lite(col, 0.05))
  }
  // cột tròn nhỏ (trụ): hộp mảnh
  post(x, y, z0, z1, w, col) { this.box(x - w / 2, y - w / 2, z0, x + w / 2, y + w / 2, z1, col) }
  // mái dốc 2 mái, đường nóc song song trục x (ridge='x') hoặc y
  gable(x0, y0, x1, y1, z, rise, ridge, cols, tileLines = true) {
    const c = cols
    if (ridge === 'x') {
      const ym = (y0 + y1) / 2
      this.quad([x0, y0, z], [x1, y0, z], [x1, ym, z + rise], [x0, ym, z + rise], c.far)   // mái xa
      this.fR(x1, y0, y1, z, z, c.gable)
      this.cv.poly([this.P(x1, y0, z), this.P(x1, y1, z), this.P(x1, ym, z + rise)], c.gable)  // đầu hồi
      this.quad([x0, y1, z], [x1, y1, z], [x1, ym, z + rise], [x0, ym, z + rise], c.near)
      if (tileLines) for (let k = 1; k < 5; k++) { const t = k / 5; this.line3([x0, y1 + (ym - y1) * t, z + rise * t], [x1, y1 + (ym - y1) * t, z + rise * t], c.line) }
      this.line3([x0, ym, z + rise], [x1, ym, z + rise], c.ridge)
    } else {
      const xm = (x0 + x1) / 2
      this.quad([x0, y0, z], [x0, y1, z], [xm, y1, z + rise], [xm, y0, z + rise], c.far)
      this.cv.poly([this.P(x0, y1, z), this.P(x1, y1, z), this.P(xm, y1, z + rise)], c.gable)
      this.quad([x1, y0, z], [x1, y1, z], [xm, y1, z + rise], [xm, y0, z + rise], c.near)
      if (tileLines) for (let k = 1; k < 5; k++) { const t = k / 5; this.line3([x1 + (xm - x1) * t, y0, z + rise * t], [x1 + (xm - x1) * t, y1, z + rise * t], c.line) }
      this.line3([xm, y0, z + rise], [xm, y1, z + rise], c.ridge)
    }
  }
}

// Bố cục ảnh cho một khối chân đế wu x du (đơn vị u) cao hup (phía trên đỉnh lưới)
function blockLayout(wu, du, hup, extraL = 0, extraR = 0) {
  const M = MARGIN
  return { w: wu + du + 2 * M + extraL + extraR, h: Math.ceil(hup + (wu + du) / 2) + 2 * M, px: du + M + extraL, py: hup + M }
}
function newSprite(L) { const cv = new Cv(L.w, L.h); return { cv, I: new Iso(cv, L.px, L.py) } }

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
  else if (k === 'dirt') paintTile(cv, (u, v, x, y) => { const r = h2(x, y, 41); return r > 0.9 ? OC[3] : r < 0.15 ? OC[1] : OC[2] })
  else if (k === 'gravel') paintTile(cv, (u, v, x, y) => { const r = h2(x, y, 51); return r > 0.8 ? A[4] : r < 0.2 ? A[2] : A[3] })
}

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

// ───────── xe cộ & tàu hỏa ─────────
// Mỗi xe là một danh sách khối trong toạ độ cục bộ (l = dọc thân xe, w = ngang), được xoay theo trục x/y và chiều chạy.
function vehExtents(s) { return s.axis === 'x' ? [s.L, s.W] : [s.W, s.L] }
LAYOUT.vehicle = (s) => {
  const [ex, ey] = vehExtents(s)
  const L = blockLayout(ex, ey, s.H + 16)
  L.fp = [ex / TILE, ey / TILE]; return L
}
function partsDraw(I, parts) {                   // vẽ khối xa trước, gần sau
  parts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2])
  for (const p of parts) { const [x0, y0, z0, x1, y1, z1, col, cols] = p; I.box(x0, y0, z0, x1, y1, z1, col, cols) }
}
// tạo bộ vẽ cục bộ: B(l0,l1,w0,w1,z0,z1,màu) với l tính từ đuôi xe (0) tới đầu xe (L)
function vehBuilder(s) {
  const parts = [], L = s.L
  const B = (l0, l1, w0, w1, z0, z1, col, cols) => {
    if (s.dir < 0) { const a = L - l1, b = L - l0; l0 = a; l1 = b }
    const p = s.axis === 'x' ? [l0, w0, z0, l1, w1, z1] : [w0, l0, z0, w1, l1, z1]
    parts.push([...p, col, cols])
  }
  return { B, parts }
}
function glassCols(top = RAMP.lake_teal[3]) { const g = mix(RAMP.lake_teal[0], INK, 0.2); return { top: mix(top, g, 0.3), left: mix(RAMP.lake_teal[2], g, 0.35), right: mix(g, SHADOW_TEAL, 0.3) } }

DRAW.vehicle = (cv, s, I) => {
  const { B, parts } = vehBuilder(s), L = s.L, W = s.W, c = s.col
  const body = faceCols(c), roof = { top: lite(c, 0.42), left: lite(c, 0.12), right: mix(dark(c, 0.3), SHADOW_TEAL, 0.22) }
  const WHEEL = { top: '#3a4556', left: '#262d3a', right: '#1c1822' }
  const GL = glassCols(), HEAD = { top: '#fff6c0', left: '#fff6c0', right: '#e8d89a' }, TAIL = { top: '#e0463a', left: '#d4382c', right: '#a3202a' }
  const after = []
  const shadowC = (col) => mix(dark(col, 0.28), SHADOW_TEAL, 0.22)
  const sc = (col) => s.axis === 'x' ? col : shadowC(col)           // mặt hông nhìn thấy
  const ec = (col) => s.axis === 'x' ? shadowC(col) : col           // mặt đầu/đuôi nhìn thấy
  const frontVisible = s.dir > 0
  const sideQ = (f0, f1, z0, z1, col) => after.push(() => { let a = L * f0, b = L * f1; if (s.dir < 0) [a, b] = [L - b, L - a]; s.axis === 'x' ? I.fL(W - 1, a, b, z0, z1, sc(col)) : I.fR(W - 1, a, b, z0, z1, sc(col)) })
  const endQ = (w0, w1, z0, z1, col) => after.push(() => { s.axis === 'x' ? I.fR(L, w0, w1, z0, z1, ec(col)) : I.fL(L, w0, w1, z0, z1, ec(col)) })
  const GLC = mix(RAMP.lake_teal[0], INK, 0.15), GLH = mix(RAMP.lake_teal[3], GLC, 0.4), HEADC = '#fff6c0', TAILC = '#d4382c'
  const lights = (z0, z1, w) => { if (frontVisible) { endQ(2, 2 + w, z0, z1, HEADC); endQ(W - 2 - w, W - 2, z0, z1, HEADC) } else { endQ(2, 2 + w, z0, z1, TAILC); endQ(W - 2 - w, W - 2, z0, z1, TAILC) } }
  if (s.type === 'car') {
    const wy = (l) => l
    B(6, 14, 0, 2, 0, 6, null, WHEEL); B(L - 15, L - 7, 0, 2, 0, 6, null, WHEEL); B(6, 14, W - 2, W + 0.5, 0, 6, null, WHEEL); B(L - 15, L - 7, W - 2, W + 0.5, 0, 6, null, WHEEL)
    B(0, L, 1, W - 1, 3, 12, null, body)
    B(L * 0.22, L * 0.74, 3, W - 3, 12, 22, null, GL)
    B(L * 0.22 + 2, L * 0.74 - 2, 3, W - 3, 21, 23, null, roof)
    for (const [l0, l1] of [[0.3, 0.46], [0.5, 0.66]]) B(L * l0, L * l1, 2.6, W - 2.6, 13, 20.5, null, GL)
    B(L * 0.22 + 1, L * 0.74 - 1, 4, W - 4, 21, 23, null, roof)
    B(L - 1, L + 0.5, 3, 7, 6, 9, null, HEAD); B(L - 1, L + 0.5, W - 7, W - 3, 6, 9, null, HEAD)
    B(-0.5, 1, 3, 7, 6, 9, null, TAIL); B(-0.5, 1, W - 7, W - 3, 6, 9, null, TAIL)
  } else if (s.type === 'bus') {
    for (const l of [14, L - 26]) { B(l, l + 11, 0, 3, 0, 9, null, WHEEL); B(l, l + 11, W - 3, W + 0.5, 0, 9, null, WHEEL) }
    B(0, L, 1, W - 1, 6, 42, null, body)
    B(2, L - 2, 3, W - 3, 42, 44, null, roof)
    B(L * 0.3, L * 0.3 + 14, 7, W - 7, 44, 47, null, faceCols('#aeb4ba'))
    sideQ(0, 1, 6, 15, s.band); sideQ(0, 1, 15, 16, lite(s.band, 0.35))
    for (let f = 0.05; f < 0.93; f += 0.112) { sideQ(f, f + 0.088, 22, 36, GLC); sideQ(f, f + 0.088, 32, 36, GLH) }
    endQ(3, W - 3, 20, 38, GLC); endQ(3, W - 3, 32, 38, GLH); endQ(1, W - 1, 6, 10, '#3a4556'); lights(10, 14, 5)
    if (frontVisible) endQ(6, W - 6, 39, 42, '#fbe08a')
  } else if (s.type === 'moto') {
    B(2, 9, 4, 6, 0, 9, null, WHEEL); B(L - 8, L - 2, 4, 6, 0, 9, null, WHEEL)               // 2 bánh (mảnh)
    B(7, L - 8, 3, 7, 5, 10, null, faceCols(dark(c, 0.15)))                                   // sườn xe
    B(L - 12, L - 3, 2, 8, 9, 17, null, faceCols(c))                                          // đầu xe / bình xăng
    B(L - 5, L - 4, 0, 10, 16, 18, null, faceCols('#23252b'))                                 // tay lái
    B(5, 14, 3, 7, 10, 12, null, faceCols('#23252b'))                                         // yên
    B(-1, 2, 4, 6, 8, 10, null, TAIL)
    if (s.rider) {
      B(8, 15, 2, 8, 11, 17, null, faceCols(s.pants || '#3d4c7a'))                            // chân
      B(6, 13, 3, 7, 17, 27, null, faceCols(s.shirt))                                         // thân
      B(L - 13, L - 6, 1, 3, 17, 25, null, faceCols(s.shirt)); B(L - 13, L - 6, 7, 9, 17, 25, null, faceCols(s.shirt))  // tay
      B(6, 13, 2.5, 7.5, 27, 34, null, faceCols(s.helm))                                      // mũ bảo hiểm
      B(11, 13.2, 3, 7, 28, 31, null, faceCols('#f0c49a'))                                    // mặt
      if (s.pillion) { B(-1, 5, 3, 7, 11, 17, null, faceCols('#3d4c7a')); B(-2, 4, 3, 7, 17, 26, null, faceCols(s.pillion)); B(-2, 4, 2.5, 7.5, 26, 32, null, faceCols(s.helm2 || '#23252b')) }
    }
  } else if (s.type === 'loco') {
    for (const l of [10, L - 26]) { B(l, l + 16, 1, 5, 0, 8, null, WHEEL); B(l, l + 16, W - 5, W - 1, 0, 8, null, WHEEL) }
    B(0, L, 1, W - 1, 6, 36, null, body)
    B(4, L - 4, 5, W - 5, 36, 40, null, roof); B(L * 0.3, L * 0.55, 8, W - 8, 40, 43, null, faceCols('#8a929a'))
    sideQ(0, 1, 6, 12, dark(s.col, 0.35)); sideQ(0, 1, 14, 19, s.band)
    sideQ(0.08, 0.26, 22, 33, GLC); sideQ(0.08, 0.26, 29, 33, GLH); sideQ(0.58, 0.74, 22, 33, GLC); sideQ(0.58, 0.74, 29, 33, GLH)
    endQ(4, W - 4, 22, 34, GLC); endQ(4, W - 4, 30, 34, GLH); endQ(1, W - 1, 14, 19, s.band); lights(8, 12, 5)
    if (frontVisible) endQ(11, W - 11, 35, 36, HEADC)
  } else if (s.type === 'coach') {
    for (const l of [14, L - 30]) { B(l, l + 16, 1, 5, 0, 7, null, WHEEL); B(l, l + 16, W - 5, W - 1, 0, 7, null, WHEEL) }
    B(0, L, 1, W - 1, 5, 34, null, body)
    B(2, L - 2, 4, W - 4, 34, 37, null, roof)
    sideQ(0, 1, 5, 11, s.band); sideQ(0, 1, 17, 19, s.band)
    for (let f = 0.05; f < 0.92; f += 0.1) { sideQ(f, f + 0.07, 21, 31, GLC); sideQ(f, f + 0.07, 27, 31, GLH) }
    endQ(8, W - 8, 12, 30, dark(s.col, 0.25))
  }
  partsDraw(I, parts)
  for (const f of after) f()
  cv.outline(0.5)
}

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

sprite("g_asphalt", { w: 72, h: 36 }, (c) => { const s = {"name":"g_asphalt","kind":"tile","k":"asphalt"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_road_xa", { w: 72, h: 36 }, (c) => { const s = {"name":"g_road_xa","kind":"tile","k":"asphalt","line":"xa"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_road_xb", { w: 72, h: 36 }, (c) => { const s = {"name":"g_road_xb","kind":"tile","k":"asphalt","line":"xb"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_road_ya", { w: 72, h: 36 }, (c) => { const s = {"name":"g_road_ya","kind":"tile","k":"asphalt","line":"ya"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_road_yb", { w: 72, h: 36 }, (c) => { const s = {"name":"g_road_yb","kind":"tile","k":"asphalt","line":"yb"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_dash_x", { w: 72, h: 36 }, (c) => { const s = {"name":"g_dash_x","kind":"tile","k":"asphalt","dash":"x"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_dash_y", { w: 72, h: 36 }, (c) => { const s = {"name":"g_dash_y","kind":"tile","k":"asphalt","dash":"y"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_zebra_x", { w: 72, h: 36 }, (c) => { const s = {"name":"g_zebra_x","kind":"tile","k":"zebra","axis":"x"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_zebra_y", { w: 72, h: 36 }, (c) => { const s = {"name":"g_zebra_y","kind":"tile","k":"zebra","axis":"y"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m0","kind":"tile","k":"sidewalk","mask":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m1","kind":"tile","k":"sidewalk","mask":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m2", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m2","kind":"tile","k":"sidewalk","mask":2}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m3", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m3","kind":"tile","k":"sidewalk","mask":3}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m4", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m4","kind":"tile","k":"sidewalk","mask":4}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m5", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m5","kind":"tile","k":"sidewalk","mask":5}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m6", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m6","kind":"tile","k":"sidewalk","mask":6}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m7", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m7","kind":"tile","k":"sidewalk","mask":7}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m8", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m8","kind":"tile","k":"sidewalk","mask":8}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m9", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m9","kind":"tile","k":"sidewalk","mask":9}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m10", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m10","kind":"tile","k":"sidewalk","mask":10}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m11", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m11","kind":"tile","k":"sidewalk","mask":11}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m12", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m12","kind":"tile","k":"sidewalk","mask":12}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m13", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m13","kind":"tile","k":"sidewalk","mask":13}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m14", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m14","kind":"tile","k":"sidewalk","mask":14}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_m15", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_m15","kind":"tile","k":"sidewalk","mask":15}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_walk_a1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_walk_a1","kind":"tile","k":"sidewalk","alt":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_plaza_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_plaza_0","kind":"tile","k":"plaza","alt":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_plaza_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_plaza_1","kind":"tile","k":"plaza","alt":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_grass_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_grass_0","kind":"tile","k":"grass","alt":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_grass_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_grass_1","kind":"tile","k":"grass","alt":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m0_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m0_0","kind":"tile","k":"water","mask":0,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m0_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m0_1","kind":"tile","k":"water","mask":0,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m1_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m1_0","kind":"tile","k":"water","mask":1,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m1_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m1_1","kind":"tile","k":"water","mask":1,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m2_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m2_0","kind":"tile","k":"water","mask":2,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m2_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m2_1","kind":"tile","k":"water","mask":2,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m3_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m3_0","kind":"tile","k":"water","mask":3,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m3_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m3_1","kind":"tile","k":"water","mask":3,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m4_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m4_0","kind":"tile","k":"water","mask":4,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m4_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m4_1","kind":"tile","k":"water","mask":4,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m5_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m5_0","kind":"tile","k":"water","mask":5,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m5_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m5_1","kind":"tile","k":"water","mask":5,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m6_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m6_0","kind":"tile","k":"water","mask":6,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m6_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m6_1","kind":"tile","k":"water","mask":6,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m7_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m7_0","kind":"tile","k":"water","mask":7,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m7_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m7_1","kind":"tile","k":"water","mask":7,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m8_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m8_0","kind":"tile","k":"water","mask":8,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m8_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m8_1","kind":"tile","k":"water","mask":8,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m9_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m9_0","kind":"tile","k":"water","mask":9,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m9_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m9_1","kind":"tile","k":"water","mask":9,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m10_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m10_0","kind":"tile","k":"water","mask":10,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m10_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m10_1","kind":"tile","k":"water","mask":10,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m11_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m11_0","kind":"tile","k":"water","mask":11,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m11_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m11_1","kind":"tile","k":"water","mask":11,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m12_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m12_0","kind":"tile","k":"water","mask":12,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m12_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m12_1","kind":"tile","k":"water","mask":12,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m13_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m13_0","kind":"tile","k":"water","mask":13,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m13_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m13_1","kind":"tile","k":"water","mask":13,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m14_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m14_0","kind":"tile","k":"water","mask":14,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m14_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m14_1","kind":"tile","k":"water","mask":14,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m15_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m15_0","kind":"tile","k":"water","mask":15,"frame":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_water_m15_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_water_m15_1","kind":"tile","k":"water","mask":15,"frame":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_rail", { w: 72, h: 36 }, (c) => { const s = {"name":"g_rail","kind":"tile","k":"rail"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_railroad", { w: 72, h: 36 }, (c) => { const s = {"name":"g_railroad","kind":"tile","k":"railroad"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_market_0", { w: 72, h: 36 }, (c) => { const s = {"name":"g_market_0","kind":"tile","k":"market","alt":0}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_market_1", { w: 72, h: 36 }, (c) => { const s = {"name":"g_market_1","kind":"tile","k":"market","alt":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_dirt", { w: 72, h: 36 }, (c) => { const s = {"name":"g_dirt","kind":"tile","k":"dirt"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("g_gravel", { w: 72, h: 36 }, (c) => { const s = {"name":"g_gravel","kind":"tile","k":"gravel"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_ochre", { w: 148, h: 155 }, (c) => { const s = {"name":"h_R_1_2_ochre","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#ecc474","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_ochre_s", { w: 148, h: 155 }, (c) => { const s = {"name":"h_R_1_2_ochre_s","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#ecc474","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_lemon", { w: 148, h: 168 }, (c) => { const s = {"name":"h_R_1_2_lemon","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#f2e09a","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_lemon_s", { w: 148, h: 168 }, (c) => { const s = {"name":"h_R_1_2_lemon_s","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#f2e09a","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_mint", { w: 148, h: 155 }, (c) => { const s = {"name":"h_R_1_2_mint","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_mint_s", { w: 148, h: 155 }, (c) => { const s = {"name":"h_R_1_2_mint_s","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_salmon", { w: 148, h: 168 }, (c) => { const s = {"name":"h_R_1_2_salmon","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#eab08c","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_salmon_s", { w: 148, h: 168 }, (c) => { const s = {"name":"h_R_1_2_salmon_s","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#eab08c","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_sky", { w: 148, h: 155 }, (c) => { const s = {"name":"h_R_1_2_sky","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#aec8d8","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_sky_s", { w: 148, h: 155 }, (c) => { const s = {"name":"h_R_1_2_sky_s","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#aec8d8","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_cream", { w: 148, h: 168 }, (c) => { const s = {"name":"h_R_1_2_cream","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#eee3ca","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_2_cream_s", { w: 148, h: 168 }, (c) => { const s = {"name":"h_R_1_2_cream_s","kind":"house","group":"house_R","w":3,"d":1,"floors":2,"wall":"#eee3ca","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_ochre", { w: 148, h: 198 }, (c) => { const s = {"name":"h_R_1_3_ochre","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#ecc474","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_ochre_s", { w: 148, h: 198 }, (c) => { const s = {"name":"h_R_1_3_ochre_s","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#ecc474","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_lemon", { w: 148, h: 185 }, (c) => { const s = {"name":"h_R_1_3_lemon","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#f2e09a","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_lemon_s", { w: 148, h: 185 }, (c) => { const s = {"name":"h_R_1_3_lemon_s","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#f2e09a","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_mint", { w: 148, h: 198 }, (c) => { const s = {"name":"h_R_1_3_mint","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_mint_s", { w: 148, h: 198 }, (c) => { const s = {"name":"h_R_1_3_mint_s","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_salmon", { w: 148, h: 185 }, (c) => { const s = {"name":"h_R_1_3_salmon","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#eab08c","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_salmon_s", { w: 148, h: 185 }, (c) => { const s = {"name":"h_R_1_3_salmon_s","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#eab08c","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_sky", { w: 148, h: 198 }, (c) => { const s = {"name":"h_R_1_3_sky","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#aec8d8","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_sky_s", { w: 148, h: 198 }, (c) => { const s = {"name":"h_R_1_3_sky_s","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#aec8d8","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_cream", { w: 148, h: 185 }, (c) => { const s = {"name":"h_R_1_3_cream","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#eee3ca","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_3_cream_s", { w: 148, h: 185 }, (c) => { const s = {"name":"h_R_1_3_cream_s","kind":"house","group":"house_R","w":3,"d":1,"floors":3,"wall":"#eee3ca","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_ochre", { w: 148, h: 215 }, (c) => { const s = {"name":"h_R_1_4_ochre","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#ecc474","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_ochre_s", { w: 148, h: 215 }, (c) => { const s = {"name":"h_R_1_4_ochre_s","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#ecc474","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_lemon", { w: 148, h: 228 }, (c) => { const s = {"name":"h_R_1_4_lemon","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#f2e09a","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_lemon_s", { w: 148, h: 228 }, (c) => { const s = {"name":"h_R_1_4_lemon_s","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#f2e09a","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_mint", { w: 148, h: 215 }, (c) => { const s = {"name":"h_R_1_4_mint","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_mint_s", { w: 148, h: 215 }, (c) => { const s = {"name":"h_R_1_4_mint_s","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_salmon", { w: 148, h: 228 }, (c) => { const s = {"name":"h_R_1_4_salmon","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#eab08c","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_salmon_s", { w: 148, h: 228 }, (c) => { const s = {"name":"h_R_1_4_salmon_s","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#eab08c","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_sky", { w: 148, h: 215 }, (c) => { const s = {"name":"h_R_1_4_sky","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#aec8d8","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_sky_s", { w: 148, h: 215 }, (c) => { const s = {"name":"h_R_1_4_sky_s","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#aec8d8","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_cream", { w: 148, h: 228 }, (c) => { const s = {"name":"h_R_1_4_cream","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#eee3ca","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_1_4_cream_s", { w: 148, h: 228 }, (c) => { const s = {"name":"h_R_1_4_cream_s","kind":"house","group":"house_R","w":3,"d":1,"floors":4,"wall":"#eee3ca","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_ochre", { w: 184, h: 184 }, (c) => { const s = {"name":"h_R_2_2_ochre","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#ecc474","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_ochre_s", { w: 184, h: 184 }, (c) => { const s = {"name":"h_R_2_2_ochre_s","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#ecc474","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_lemon", { w: 184, h: 186 }, (c) => { const s = {"name":"h_R_2_2_lemon","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#f2e09a","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_lemon_s", { w: 184, h: 186 }, (c) => { const s = {"name":"h_R_2_2_lemon_s","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#f2e09a","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_mint", { w: 184, h: 184 }, (c) => { const s = {"name":"h_R_2_2_mint","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_mint_s", { w: 184, h: 184 }, (c) => { const s = {"name":"h_R_2_2_mint_s","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_salmon", { w: 184, h: 186 }, (c) => { const s = {"name":"h_R_2_2_salmon","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#eab08c","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_salmon_s", { w: 184, h: 186 }, (c) => { const s = {"name":"h_R_2_2_salmon_s","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#eab08c","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_sky", { w: 184, h: 184 }, (c) => { const s = {"name":"h_R_2_2_sky","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#aec8d8","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_sky_s", { w: 184, h: 184 }, (c) => { const s = {"name":"h_R_2_2_sky_s","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#aec8d8","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_cream", { w: 184, h: 186 }, (c) => { const s = {"name":"h_R_2_2_cream","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#eee3ca","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_2_cream_s", { w: 184, h: 186 }, (c) => { const s = {"name":"h_R_2_2_cream_s","kind":"house","group":"house_R","w":3,"d":2,"floors":2,"wall":"#eee3ca","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_ochre", { w: 184, h: 216 }, (c) => { const s = {"name":"h_R_2_3_ochre","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#ecc474","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_ochre_s", { w: 184, h: 216 }, (c) => { const s = {"name":"h_R_2_3_ochre_s","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#ecc474","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_lemon", { w: 184, h: 214 }, (c) => { const s = {"name":"h_R_2_3_lemon","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#f2e09a","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_lemon_s", { w: 184, h: 214 }, (c) => { const s = {"name":"h_R_2_3_lemon_s","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#f2e09a","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_mint", { w: 184, h: 216 }, (c) => { const s = {"name":"h_R_2_3_mint","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_mint_s", { w: 184, h: 216 }, (c) => { const s = {"name":"h_R_2_3_mint_s","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_salmon", { w: 184, h: 214 }, (c) => { const s = {"name":"h_R_2_3_salmon","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#eab08c","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_salmon_s", { w: 184, h: 214 }, (c) => { const s = {"name":"h_R_2_3_salmon_s","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#eab08c","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_sky", { w: 184, h: 216 }, (c) => { const s = {"name":"h_R_2_3_sky","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#aec8d8","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_sky_s", { w: 184, h: 216 }, (c) => { const s = {"name":"h_R_2_3_sky_s","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#aec8d8","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_cream", { w: 184, h: 214 }, (c) => { const s = {"name":"h_R_2_3_cream","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#eee3ca","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_3_cream_s", { w: 184, h: 214 }, (c) => { const s = {"name":"h_R_2_3_cream_s","kind":"house","group":"house_R","w":3,"d":2,"floors":3,"wall":"#eee3ca","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_ochre", { w: 184, h: 244 }, (c) => { const s = {"name":"h_R_2_4_ochre","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#ecc474","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_ochre_s", { w: 184, h: 244 }, (c) => { const s = {"name":"h_R_2_4_ochre_s","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#ecc474","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_lemon", { w: 184, h: 246 }, (c) => { const s = {"name":"h_R_2_4_lemon","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#f2e09a","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_lemon_s", { w: 184, h: 246 }, (c) => { const s = {"name":"h_R_2_4_lemon_s","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#f2e09a","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_mint", { w: 184, h: 244 }, (c) => { const s = {"name":"h_R_2_4_mint","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_mint_s", { w: 184, h: 244 }, (c) => { const s = {"name":"h_R_2_4_mint_s","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#b2cfa6","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_salmon", { w: 184, h: 246 }, (c) => { const s = {"name":"h_R_2_4_salmon","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#eab08c","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_salmon_s", { w: 184, h: 246 }, (c) => { const s = {"name":"h_R_2_4_salmon_s","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#eab08c","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_sky", { w: 184, h: 244 }, (c) => { const s = {"name":"h_R_2_4_sky","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#aec8d8","front":"R","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_sky_s", { w: 184, h: 244 }, (c) => { const s = {"name":"h_R_2_4_sky_s","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#aec8d8","front":"R","ridge":"x","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_cream", { w: 184, h: 246 }, (c) => { const s = {"name":"h_R_2_4_cream","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#eee3ca","front":"R","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_R_2_4_cream_s", { w: 184, h: 246 }, (c) => { const s = {"name":"h_R_2_4_cream_s","kind":"house","group":"house_R","w":3,"d":2,"floors":4,"wall":"#eee3ca","front":"R","ridge":"x","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_ochre", { w: 148, h: 155 }, (c) => { const s = {"name":"h_L_1_2_ochre","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#ecc474","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_ochre_s", { w: 148, h: 155 }, (c) => { const s = {"name":"h_L_1_2_ochre_s","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#ecc474","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_lemon", { w: 148, h: 168 }, (c) => { const s = {"name":"h_L_1_2_lemon","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#f2e09a","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_lemon_s", { w: 148, h: 168 }, (c) => { const s = {"name":"h_L_1_2_lemon_s","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#f2e09a","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_mint", { w: 148, h: 155 }, (c) => { const s = {"name":"h_L_1_2_mint","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_mint_s", { w: 148, h: 155 }, (c) => { const s = {"name":"h_L_1_2_mint_s","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_salmon", { w: 148, h: 168 }, (c) => { const s = {"name":"h_L_1_2_salmon","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#eab08c","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_salmon_s", { w: 148, h: 168 }, (c) => { const s = {"name":"h_L_1_2_salmon_s","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#eab08c","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_sky", { w: 148, h: 155 }, (c) => { const s = {"name":"h_L_1_2_sky","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#aec8d8","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_sky_s", { w: 148, h: 155 }, (c) => { const s = {"name":"h_L_1_2_sky_s","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#aec8d8","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_cream", { w: 148, h: 168 }, (c) => { const s = {"name":"h_L_1_2_cream","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#eee3ca","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_2_cream_s", { w: 148, h: 168 }, (c) => { const s = {"name":"h_L_1_2_cream_s","kind":"house","group":"house_L","w":1,"d":3,"floors":2,"wall":"#eee3ca","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_ochre", { w: 148, h: 198 }, (c) => { const s = {"name":"h_L_1_3_ochre","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#ecc474","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_ochre_s", { w: 148, h: 198 }, (c) => { const s = {"name":"h_L_1_3_ochre_s","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#ecc474","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_lemon", { w: 148, h: 185 }, (c) => { const s = {"name":"h_L_1_3_lemon","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#f2e09a","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_lemon_s", { w: 148, h: 185 }, (c) => { const s = {"name":"h_L_1_3_lemon_s","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#f2e09a","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_mint", { w: 148, h: 198 }, (c) => { const s = {"name":"h_L_1_3_mint","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_mint_s", { w: 148, h: 198 }, (c) => { const s = {"name":"h_L_1_3_mint_s","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_salmon", { w: 148, h: 185 }, (c) => { const s = {"name":"h_L_1_3_salmon","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#eab08c","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_salmon_s", { w: 148, h: 185 }, (c) => { const s = {"name":"h_L_1_3_salmon_s","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#eab08c","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_sky", { w: 148, h: 198 }, (c) => { const s = {"name":"h_L_1_3_sky","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#aec8d8","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_sky_s", { w: 148, h: 198 }, (c) => { const s = {"name":"h_L_1_3_sky_s","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#aec8d8","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_cream", { w: 148, h: 185 }, (c) => { const s = {"name":"h_L_1_3_cream","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#eee3ca","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_3_cream_s", { w: 148, h: 185 }, (c) => { const s = {"name":"h_L_1_3_cream_s","kind":"house","group":"house_L","w":1,"d":3,"floors":3,"wall":"#eee3ca","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_ochre", { w: 148, h: 215 }, (c) => { const s = {"name":"h_L_1_4_ochre","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#ecc474","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_ochre_s", { w: 148, h: 215 }, (c) => { const s = {"name":"h_L_1_4_ochre_s","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#ecc474","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_lemon", { w: 148, h: 228 }, (c) => { const s = {"name":"h_L_1_4_lemon","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#f2e09a","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_lemon_s", { w: 148, h: 228 }, (c) => { const s = {"name":"h_L_1_4_lemon_s","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#f2e09a","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_mint", { w: 148, h: 215 }, (c) => { const s = {"name":"h_L_1_4_mint","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_mint_s", { w: 148, h: 215 }, (c) => { const s = {"name":"h_L_1_4_mint_s","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_salmon", { w: 148, h: 228 }, (c) => { const s = {"name":"h_L_1_4_salmon","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#eab08c","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_salmon_s", { w: 148, h: 228 }, (c) => { const s = {"name":"h_L_1_4_salmon_s","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#eab08c","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_sky", { w: 148, h: 215 }, (c) => { const s = {"name":"h_L_1_4_sky","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#aec8d8","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_sky_s", { w: 148, h: 215 }, (c) => { const s = {"name":"h_L_1_4_sky_s","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#aec8d8","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_cream", { w: 148, h: 228 }, (c) => { const s = {"name":"h_L_1_4_cream","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#eee3ca","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_1_4_cream_s", { w: 148, h: 228 }, (c) => { const s = {"name":"h_L_1_4_cream_s","kind":"house","group":"house_L","w":1,"d":3,"floors":4,"wall":"#eee3ca","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_ochre", { w: 184, h: 184 }, (c) => { const s = {"name":"h_L_2_2_ochre","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#ecc474","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_ochre_s", { w: 184, h: 184 }, (c) => { const s = {"name":"h_L_2_2_ochre_s","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#ecc474","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_lemon", { w: 184, h: 186 }, (c) => { const s = {"name":"h_L_2_2_lemon","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#f2e09a","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_lemon_s", { w: 184, h: 186 }, (c) => { const s = {"name":"h_L_2_2_lemon_s","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#f2e09a","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_mint", { w: 184, h: 184 }, (c) => { const s = {"name":"h_L_2_2_mint","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_mint_s", { w: 184, h: 184 }, (c) => { const s = {"name":"h_L_2_2_mint_s","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_salmon", { w: 184, h: 186 }, (c) => { const s = {"name":"h_L_2_2_salmon","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#eab08c","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_salmon_s", { w: 184, h: 186 }, (c) => { const s = {"name":"h_L_2_2_salmon_s","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#eab08c","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_sky", { w: 184, h: 184 }, (c) => { const s = {"name":"h_L_2_2_sky","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#aec8d8","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_sky_s", { w: 184, h: 184 }, (c) => { const s = {"name":"h_L_2_2_sky_s","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#aec8d8","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_cream", { w: 184, h: 186 }, (c) => { const s = {"name":"h_L_2_2_cream","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#eee3ca","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_2_cream_s", { w: 184, h: 186 }, (c) => { const s = {"name":"h_L_2_2_cream_s","kind":"house","group":"house_L","w":2,"d":3,"floors":2,"wall":"#eee3ca","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_ochre", { w: 184, h: 216 }, (c) => { const s = {"name":"h_L_2_3_ochre","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#ecc474","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_ochre_s", { w: 184, h: 216 }, (c) => { const s = {"name":"h_L_2_3_ochre_s","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#ecc474","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_lemon", { w: 184, h: 214 }, (c) => { const s = {"name":"h_L_2_3_lemon","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#f2e09a","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_lemon_s", { w: 184, h: 214 }, (c) => { const s = {"name":"h_L_2_3_lemon_s","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#f2e09a","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_mint", { w: 184, h: 216 }, (c) => { const s = {"name":"h_L_2_3_mint","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_mint_s", { w: 184, h: 216 }, (c) => { const s = {"name":"h_L_2_3_mint_s","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_salmon", { w: 184, h: 214 }, (c) => { const s = {"name":"h_L_2_3_salmon","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#eab08c","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_salmon_s", { w: 184, h: 214 }, (c) => { const s = {"name":"h_L_2_3_salmon_s","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#eab08c","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_sky", { w: 184, h: 216 }, (c) => { const s = {"name":"h_L_2_3_sky","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#aec8d8","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_sky_s", { w: 184, h: 216 }, (c) => { const s = {"name":"h_L_2_3_sky_s","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#aec8d8","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_cream", { w: 184, h: 214 }, (c) => { const s = {"name":"h_L_2_3_cream","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#eee3ca","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_3_cream_s", { w: 184, h: 214 }, (c) => { const s = {"name":"h_L_2_3_cream_s","kind":"house","group":"house_L","w":2,"d":3,"floors":3,"wall":"#eee3ca","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_ochre", { w: 184, h: 244 }, (c) => { const s = {"name":"h_L_2_4_ochre","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#ecc474","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_ochre_s", { w: 184, h: 244 }, (c) => { const s = {"name":"h_L_2_4_ochre_s","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#ecc474","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_lemon", { w: 184, h: 246 }, (c) => { const s = {"name":"h_L_2_4_lemon","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#f2e09a","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_lemon_s", { w: 184, h: 246 }, (c) => { const s = {"name":"h_L_2_4_lemon_s","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#f2e09a","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_mint", { w: 184, h: 244 }, (c) => { const s = {"name":"h_L_2_4_mint","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_mint_s", { w: 184, h: 244 }, (c) => { const s = {"name":"h_L_2_4_mint_s","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#b2cfa6","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_salmon", { w: 184, h: 246 }, (c) => { const s = {"name":"h_L_2_4_salmon","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#eab08c","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_salmon_s", { w: 184, h: 246 }, (c) => { const s = {"name":"h_L_2_4_salmon_s","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#eab08c","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_sky", { w: 184, h: 244 }, (c) => { const s = {"name":"h_L_2_4_sky","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#aec8d8","front":"L","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_sky_s", { w: 184, h: 244 }, (c) => { const s = {"name":"h_L_2_4_sky_s","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#aec8d8","front":"L","ridge":"y","roof":"tile","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_cream", { w: 184, h: 246 }, (c) => { const s = {"name":"h_L_2_4_cream","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#eee3ca","front":"L","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_L_2_4_cream_s", { w: 184, h: 246 }, (c) => { const s = {"name":"h_L_2_4_cream_s","kind":"house","group":"house_L","w":2,"d":3,"floors":4,"wall":"#eee3ca","front":"L","ridge":"y","roof":"flat","shop":1,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_2_ochre", { w: 148, h: 155 }, (c) => { const s = {"name":"h_nR_1_2_ochre","kind":"house","group":"house_nR","w":3,"d":1,"floors":2,"wall":"#ecc474","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_2_lemon", { w: 148, h: 168 }, (c) => { const s = {"name":"h_nR_1_2_lemon","kind":"house","group":"house_nR","w":3,"d":1,"floors":2,"wall":"#f2e09a","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_2_mint", { w: 148, h: 155 }, (c) => { const s = {"name":"h_nR_1_2_mint","kind":"house","group":"house_nR","w":3,"d":1,"floors":2,"wall":"#b2cfa6","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_2_salmon", { w: 148, h: 168 }, (c) => { const s = {"name":"h_nR_1_2_salmon","kind":"house","group":"house_nR","w":3,"d":1,"floors":2,"wall":"#eab08c","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_2_sky", { w: 148, h: 155 }, (c) => { const s = {"name":"h_nR_1_2_sky","kind":"house","group":"house_nR","w":3,"d":1,"floors":2,"wall":"#aec8d8","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_2_cream", { w: 148, h: 168 }, (c) => { const s = {"name":"h_nR_1_2_cream","kind":"house","group":"house_nR","w":3,"d":1,"floors":2,"wall":"#eee3ca","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_3_ochre", { w: 148, h: 198 }, (c) => { const s = {"name":"h_nR_1_3_ochre","kind":"house","group":"house_nR","w":3,"d":1,"floors":3,"wall":"#ecc474","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_3_lemon", { w: 148, h: 185 }, (c) => { const s = {"name":"h_nR_1_3_lemon","kind":"house","group":"house_nR","w":3,"d":1,"floors":3,"wall":"#f2e09a","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_3_mint", { w: 148, h: 198 }, (c) => { const s = {"name":"h_nR_1_3_mint","kind":"house","group":"house_nR","w":3,"d":1,"floors":3,"wall":"#b2cfa6","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_3_salmon", { w: 148, h: 185 }, (c) => { const s = {"name":"h_nR_1_3_salmon","kind":"house","group":"house_nR","w":3,"d":1,"floors":3,"wall":"#eab08c","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_3_sky", { w: 148, h: 198 }, (c) => { const s = {"name":"h_nR_1_3_sky","kind":"house","group":"house_nR","w":3,"d":1,"floors":3,"wall":"#aec8d8","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_3_cream", { w: 148, h: 185 }, (c) => { const s = {"name":"h_nR_1_3_cream","kind":"house","group":"house_nR","w":3,"d":1,"floors":3,"wall":"#eee3ca","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_4_ochre", { w: 148, h: 215 }, (c) => { const s = {"name":"h_nR_1_4_ochre","kind":"house","group":"house_nR","w":3,"d":1,"floors":4,"wall":"#ecc474","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_4_lemon", { w: 148, h: 228 }, (c) => { const s = {"name":"h_nR_1_4_lemon","kind":"house","group":"house_nR","w":3,"d":1,"floors":4,"wall":"#f2e09a","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_4_mint", { w: 148, h: 215 }, (c) => { const s = {"name":"h_nR_1_4_mint","kind":"house","group":"house_nR","w":3,"d":1,"floors":4,"wall":"#b2cfa6","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_4_salmon", { w: 148, h: 228 }, (c) => { const s = {"name":"h_nR_1_4_salmon","kind":"house","group":"house_nR","w":3,"d":1,"floors":4,"wall":"#eab08c","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_4_sky", { w: 148, h: 215 }, (c) => { const s = {"name":"h_nR_1_4_sky","kind":"house","group":"house_nR","w":3,"d":1,"floors":4,"wall":"#aec8d8","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_1_4_cream", { w: 148, h: 228 }, (c) => { const s = {"name":"h_nR_1_4_cream","kind":"house","group":"house_nR","w":3,"d":1,"floors":4,"wall":"#eee3ca","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_2_ochre", { w: 184, h: 184 }, (c) => { const s = {"name":"h_nR_2_2_ochre","kind":"house","group":"house_nR","w":3,"d":2,"floors":2,"wall":"#ecc474","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_2_lemon", { w: 184, h: 186 }, (c) => { const s = {"name":"h_nR_2_2_lemon","kind":"house","group":"house_nR","w":3,"d":2,"floors":2,"wall":"#f2e09a","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_2_mint", { w: 184, h: 184 }, (c) => { const s = {"name":"h_nR_2_2_mint","kind":"house","group":"house_nR","w":3,"d":2,"floors":2,"wall":"#b2cfa6","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_2_salmon", { w: 184, h: 186 }, (c) => { const s = {"name":"h_nR_2_2_salmon","kind":"house","group":"house_nR","w":3,"d":2,"floors":2,"wall":"#eab08c","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_2_sky", { w: 184, h: 184 }, (c) => { const s = {"name":"h_nR_2_2_sky","kind":"house","group":"house_nR","w":3,"d":2,"floors":2,"wall":"#aec8d8","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_2_cream", { w: 184, h: 186 }, (c) => { const s = {"name":"h_nR_2_2_cream","kind":"house","group":"house_nR","w":3,"d":2,"floors":2,"wall":"#eee3ca","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_3_ochre", { w: 184, h: 216 }, (c) => { const s = {"name":"h_nR_2_3_ochre","kind":"house","group":"house_nR","w":3,"d":2,"floors":3,"wall":"#ecc474","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_3_lemon", { w: 184, h: 214 }, (c) => { const s = {"name":"h_nR_2_3_lemon","kind":"house","group":"house_nR","w":3,"d":2,"floors":3,"wall":"#f2e09a","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_3_mint", { w: 184, h: 216 }, (c) => { const s = {"name":"h_nR_2_3_mint","kind":"house","group":"house_nR","w":3,"d":2,"floors":3,"wall":"#b2cfa6","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_3_salmon", { w: 184, h: 214 }, (c) => { const s = {"name":"h_nR_2_3_salmon","kind":"house","group":"house_nR","w":3,"d":2,"floors":3,"wall":"#eab08c","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_3_sky", { w: 184, h: 216 }, (c) => { const s = {"name":"h_nR_2_3_sky","kind":"house","group":"house_nR","w":3,"d":2,"floors":3,"wall":"#aec8d8","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_3_cream", { w: 184, h: 214 }, (c) => { const s = {"name":"h_nR_2_3_cream","kind":"house","group":"house_nR","w":3,"d":2,"floors":3,"wall":"#eee3ca","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_4_ochre", { w: 184, h: 244 }, (c) => { const s = {"name":"h_nR_2_4_ochre","kind":"house","group":"house_nR","w":3,"d":2,"floors":4,"wall":"#ecc474","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_4_lemon", { w: 184, h: 246 }, (c) => { const s = {"name":"h_nR_2_4_lemon","kind":"house","group":"house_nR","w":3,"d":2,"floors":4,"wall":"#f2e09a","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_4_mint", { w: 184, h: 244 }, (c) => { const s = {"name":"h_nR_2_4_mint","kind":"house","group":"house_nR","w":3,"d":2,"floors":4,"wall":"#b2cfa6","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_4_salmon", { w: 184, h: 246 }, (c) => { const s = {"name":"h_nR_2_4_salmon","kind":"house","group":"house_nR","w":3,"d":2,"floors":4,"wall":"#eab08c","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_4_sky", { w: 184, h: 244 }, (c) => { const s = {"name":"h_nR_2_4_sky","kind":"house","group":"house_nR","w":3,"d":2,"floors":4,"wall":"#aec8d8","front":"N","ridge":"x","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nR_2_4_cream", { w: 184, h: 246 }, (c) => { const s = {"name":"h_nR_2_4_cream","kind":"house","group":"house_nR","w":3,"d":2,"floors":4,"wall":"#eee3ca","front":"N","ridge":"x","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_2_ochre", { w: 148, h: 155 }, (c) => { const s = {"name":"h_nL_1_2_ochre","kind":"house","group":"house_nL","w":1,"d":3,"floors":2,"wall":"#ecc474","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_2_lemon", { w: 148, h: 168 }, (c) => { const s = {"name":"h_nL_1_2_lemon","kind":"house","group":"house_nL","w":1,"d":3,"floors":2,"wall":"#f2e09a","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_2_mint", { w: 148, h: 155 }, (c) => { const s = {"name":"h_nL_1_2_mint","kind":"house","group":"house_nL","w":1,"d":3,"floors":2,"wall":"#b2cfa6","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_2_salmon", { w: 148, h: 168 }, (c) => { const s = {"name":"h_nL_1_2_salmon","kind":"house","group":"house_nL","w":1,"d":3,"floors":2,"wall":"#eab08c","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_2_sky", { w: 148, h: 155 }, (c) => { const s = {"name":"h_nL_1_2_sky","kind":"house","group":"house_nL","w":1,"d":3,"floors":2,"wall":"#aec8d8","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_2_cream", { w: 148, h: 168 }, (c) => { const s = {"name":"h_nL_1_2_cream","kind":"house","group":"house_nL","w":1,"d":3,"floors":2,"wall":"#eee3ca","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_3_ochre", { w: 148, h: 198 }, (c) => { const s = {"name":"h_nL_1_3_ochre","kind":"house","group":"house_nL","w":1,"d":3,"floors":3,"wall":"#ecc474","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_3_lemon", { w: 148, h: 185 }, (c) => { const s = {"name":"h_nL_1_3_lemon","kind":"house","group":"house_nL","w":1,"d":3,"floors":3,"wall":"#f2e09a","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_3_mint", { w: 148, h: 198 }, (c) => { const s = {"name":"h_nL_1_3_mint","kind":"house","group":"house_nL","w":1,"d":3,"floors":3,"wall":"#b2cfa6","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_3_salmon", { w: 148, h: 185 }, (c) => { const s = {"name":"h_nL_1_3_salmon","kind":"house","group":"house_nL","w":1,"d":3,"floors":3,"wall":"#eab08c","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_3_sky", { w: 148, h: 198 }, (c) => { const s = {"name":"h_nL_1_3_sky","kind":"house","group":"house_nL","w":1,"d":3,"floors":3,"wall":"#aec8d8","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_3_cream", { w: 148, h: 185 }, (c) => { const s = {"name":"h_nL_1_3_cream","kind":"house","group":"house_nL","w":1,"d":3,"floors":3,"wall":"#eee3ca","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_4_ochre", { w: 148, h: 215 }, (c) => { const s = {"name":"h_nL_1_4_ochre","kind":"house","group":"house_nL","w":1,"d":3,"floors":4,"wall":"#ecc474","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_4_lemon", { w: 148, h: 228 }, (c) => { const s = {"name":"h_nL_1_4_lemon","kind":"house","group":"house_nL","w":1,"d":3,"floors":4,"wall":"#f2e09a","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_4_mint", { w: 148, h: 215 }, (c) => { const s = {"name":"h_nL_1_4_mint","kind":"house","group":"house_nL","w":1,"d":3,"floors":4,"wall":"#b2cfa6","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_4_salmon", { w: 148, h: 228 }, (c) => { const s = {"name":"h_nL_1_4_salmon","kind":"house","group":"house_nL","w":1,"d":3,"floors":4,"wall":"#eab08c","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_4_sky", { w: 148, h: 215 }, (c) => { const s = {"name":"h_nL_1_4_sky","kind":"house","group":"house_nL","w":1,"d":3,"floors":4,"wall":"#aec8d8","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_1_4_cream", { w: 148, h: 228 }, (c) => { const s = {"name":"h_nL_1_4_cream","kind":"house","group":"house_nL","w":1,"d":3,"floors":4,"wall":"#eee3ca","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_2_ochre", { w: 184, h: 184 }, (c) => { const s = {"name":"h_nL_2_2_ochre","kind":"house","group":"house_nL","w":2,"d":3,"floors":2,"wall":"#ecc474","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_2_lemon", { w: 184, h: 186 }, (c) => { const s = {"name":"h_nL_2_2_lemon","kind":"house","group":"house_nL","w":2,"d":3,"floors":2,"wall":"#f2e09a","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_2_mint", { w: 184, h: 184 }, (c) => { const s = {"name":"h_nL_2_2_mint","kind":"house","group":"house_nL","w":2,"d":3,"floors":2,"wall":"#b2cfa6","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_2_salmon", { w: 184, h: 186 }, (c) => { const s = {"name":"h_nL_2_2_salmon","kind":"house","group":"house_nL","w":2,"d":3,"floors":2,"wall":"#eab08c","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_2_sky", { w: 184, h: 184 }, (c) => { const s = {"name":"h_nL_2_2_sky","kind":"house","group":"house_nL","w":2,"d":3,"floors":2,"wall":"#aec8d8","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_2_cream", { w: 184, h: 186 }, (c) => { const s = {"name":"h_nL_2_2_cream","kind":"house","group":"house_nL","w":2,"d":3,"floors":2,"wall":"#eee3ca","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_3_ochre", { w: 184, h: 216 }, (c) => { const s = {"name":"h_nL_2_3_ochre","kind":"house","group":"house_nL","w":2,"d":3,"floors":3,"wall":"#ecc474","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_3_lemon", { w: 184, h: 214 }, (c) => { const s = {"name":"h_nL_2_3_lemon","kind":"house","group":"house_nL","w":2,"d":3,"floors":3,"wall":"#f2e09a","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_3_mint", { w: 184, h: 216 }, (c) => { const s = {"name":"h_nL_2_3_mint","kind":"house","group":"house_nL","w":2,"d":3,"floors":3,"wall":"#b2cfa6","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_3_salmon", { w: 184, h: 214 }, (c) => { const s = {"name":"h_nL_2_3_salmon","kind":"house","group":"house_nL","w":2,"d":3,"floors":3,"wall":"#eab08c","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_3_sky", { w: 184, h: 216 }, (c) => { const s = {"name":"h_nL_2_3_sky","kind":"house","group":"house_nL","w":2,"d":3,"floors":3,"wall":"#aec8d8","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_3_cream", { w: 184, h: 214 }, (c) => { const s = {"name":"h_nL_2_3_cream","kind":"house","group":"house_nL","w":2,"d":3,"floors":3,"wall":"#eee3ca","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_4_ochre", { w: 184, h: 244 }, (c) => { const s = {"name":"h_nL_2_4_ochre","kind":"house","group":"house_nL","w":2,"d":3,"floors":4,"wall":"#ecc474","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_4_lemon", { w: 184, h: 246 }, (c) => { const s = {"name":"h_nL_2_4_lemon","kind":"house","group":"house_nL","w":2,"d":3,"floors":4,"wall":"#f2e09a","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_4_mint", { w: 184, h: 244 }, (c) => { const s = {"name":"h_nL_2_4_mint","kind":"house","group":"house_nL","w":2,"d":3,"floors":4,"wall":"#b2cfa6","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_4_salmon", { w: 184, h: 246 }, (c) => { const s = {"name":"h_nL_2_4_salmon","kind":"house","group":"house_nL","w":2,"d":3,"floors":4,"wall":"#eab08c","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_4_sky", { w: 184, h: 244 }, (c) => { const s = {"name":"h_nL_2_4_sky","kind":"house","group":"house_nL","w":2,"d":3,"floors":4,"wall":"#aec8d8","front":"N","ridge":"y","roof":"tile","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("h_nL_2_4_cream", { w: 184, h: 246 }, (c) => { const s = {"name":"h_nL_2_4_cream","kind":"house","group":"house_nL","w":2,"d":3,"floors":4,"wall":"#eee3ca","front":"N","ridge":"y","roof":"flat","shop":0,"style":"old","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("m_R_3_white", { w: 184, h: 216 }, (c) => { const s = {"name":"m_R_3_white","kind":"house","group":"modern_R","w":3,"d":2,"floors":3,"wall":"#e9edf0","front":"R","ridge":"x","roof":"flat","shop":0,"style":"modern","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("m_R_3_grey", { w: 184, h: 216 }, (c) => { const s = {"name":"m_R_3_grey","kind":"house","group":"modern_R","w":3,"d":2,"floors":3,"wall":"#c9d0d6","front":"R","ridge":"x","roof":"flat","shop":0,"style":"modern","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("m_R_4_white", { w: 184, h: 246 }, (c) => { const s = {"name":"m_R_4_white","kind":"house","group":"modern_R","w":3,"d":2,"floors":4,"wall":"#e9edf0","front":"R","ridge":"x","roof":"flat","shop":0,"style":"modern","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("m_R_4_grey", { w: 184, h: 246 }, (c) => { const s = {"name":"m_R_4_grey","kind":"house","group":"modern_R","w":3,"d":2,"floors":4,"wall":"#c9d0d6","front":"R","ridge":"x","roof":"flat","shop":0,"style":"modern","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("m_L_3_white", { w: 184, h: 216 }, (c) => { const s = {"name":"m_L_3_white","kind":"house","group":"modern_L","w":2,"d":3,"floors":3,"wall":"#e9edf0","front":"L","ridge":"y","roof":"flat","shop":0,"style":"modern","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("m_L_3_grey", { w: 184, h: 216 }, (c) => { const s = {"name":"m_L_3_grey","kind":"house","group":"modern_L","w":2,"d":3,"floors":3,"wall":"#c9d0d6","front":"L","ridge":"y","roof":"flat","shop":0,"style":"modern","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("m_L_4_white", { w: 184, h: 246 }, (c) => { const s = {"name":"m_L_4_white","kind":"house","group":"modern_L","w":2,"d":3,"floors":4,"wall":"#e9edf0","front":"L","ridge":"y","roof":"flat","shop":0,"style":"modern","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("m_L_4_grey", { w: 184, h: 246 }, (c) => { const s = {"name":"m_L_4_grey","kind":"house","group":"modern_L","w":2,"d":3,"floors":4,"wall":"#c9d0d6","front":"L","ridge":"y","roof":"flat","shop":0,"style":"modern","outline":0.45}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("tower_a", { w: 220, h: 452 }, (c) => { const s = {"name":"tower_a","kind":"tower","group":"tower","w":3,"d":3,"h":300,"outline":0.5}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("tower_b", { w: 184, h: 344 }, (c) => { const s = {"name":"tower_b","kind":"tower","group":"tower","w":2,"d":3,"h":210,"outline":0.5}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_bang_1", { w: 90, h: 122 }, (c) => { const s = {"name":"t_bang_1","kind":"tree","group":"tree_bang","type":"bang","r":30,"h":118,"w":86,"px":43,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_bang_2", { w: 94, h: 128 }, (c) => { const s = {"name":"t_bang_2","kind":"tree","group":"tree_bang","type":"bang","r":32,"h":124,"w":90,"px":45,"py":118}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_bang_3", { w: 98, h: 134 }, (c) => { const s = {"name":"t_bang_3","kind":"tree","group":"tree_bang","type":"bang","r":34,"h":130,"w":94,"px":47,"py":124}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_small_1", { w: 60, h: 76 }, (c) => { const s = {"name":"t_small_1","kind":"tree","group":"tree_small","type":"small","r":15,"h":72,"w":56,"px":28,"py":66}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_small_2", { w: 64, h: 81 }, (c) => { const s = {"name":"t_small_2","kind":"tree","group":"tree_small","type":"small","r":17,"h":77,"w":60,"px":30,"py":71}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_small_3", { w: 68, h: 86 }, (c) => { const s = {"name":"t_small_3","kind":"tree","group":"tree_small","type":"small","r":19,"h":82,"w":64,"px":32,"py":76}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_phuong_1", { w: 98, h: 122 }, (c) => { const s = {"name":"t_phuong_1","kind":"tree","group":"tree_phuong","type":"phuong","r":34,"h":118,"w":94,"px":47,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_phuong_2", { w: 102, h: 128 }, (c) => { const s = {"name":"t_phuong_2","kind":"tree","group":"tree_phuong","type":"phuong","r":36,"h":124,"w":98,"px":49,"py":118}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_lieu_1", { w: 82, h: 110 }, (c) => { const s = {"name":"t_lieu_1","kind":"tree","group":"tree_lieu","type":"lieu","r":26,"h":106,"w":78,"px":39,"py":100}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_lieu_2", { w: 86, h: 116 }, (c) => { const s = {"name":"t_lieu_2","kind":"tree","group":"tree_lieu","type":"lieu","r":28,"h":112,"w":82,"px":41,"py":106}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_bush_1", { w: 54, h: 40 }, (c) => { const s = {"name":"t_bush_1","kind":"tree","group":"tree_bush","type":"bush","r":12,"h":36,"w":50,"px":25,"py":30}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("t_bush_2", { w: 58, h: 44 }, (c) => { const s = {"name":"t_bush_2","kind":"tree","group":"tree_bush","type":"bush","r":14,"h":40,"w":54,"px":27,"py":34,"flower":1}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_0_px", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_0_px","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":"#c94a3a","axis":"x","dir":1,"L":30,"W":10,"H":36,"col":"#d93a2b","shirt":"#2f2f33","helm":"#e8e2d0","helm2":"#d9a53c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_0_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_0_nx","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":"#c94a3a","axis":"x","dir":-1,"L":30,"W":10,"H":36,"col":"#d93a2b","shirt":"#2f2f33","helm":"#e8e2d0","helm2":"#d9a53c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_0_py", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_0_py","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":"#c94a3a","axis":"y","dir":1,"L":30,"W":10,"H":36,"col":"#d93a2b","shirt":"#2f2f33","helm":"#e8e2d0","helm2":"#d9a53c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_0_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_0_ny","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":"#c94a3a","axis":"y","dir":-1,"L":30,"W":10,"H":36,"col":"#d93a2b","shirt":"#2f2f33","helm":"#e8e2d0","helm2":"#d9a53c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_1_px", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_1_px","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"x","dir":1,"L":30,"W":10,"H":36,"col":"#2f62c9","shirt":"#d9a53c","helm":"#23252b","helm2":"#3a6bb5"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_1_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_1_nx","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"x","dir":-1,"L":30,"W":10,"H":36,"col":"#2f62c9","shirt":"#d9a53c","helm":"#23252b","helm2":"#3a6bb5"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_1_py", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_1_py","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"y","dir":1,"L":30,"W":10,"H":36,"col":"#2f62c9","shirt":"#d9a53c","helm":"#23252b","helm2":"#3a6bb5"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_1_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_1_ny","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"y","dir":-1,"L":30,"W":10,"H":36,"col":"#2f62c9","shirt":"#d9a53c","helm":"#23252b","helm2":"#3a6bb5"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_2_px", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_2_px","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"x","dir":1,"L":30,"W":10,"H":36,"col":"#e8e2d0","shirt":"#5aa56a","helm":"#d9a53c","helm2":"#c94a3a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_2_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_2_nx","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"x","dir":-1,"L":30,"W":10,"H":36,"col":"#e8e2d0","shirt":"#5aa56a","helm":"#d9a53c","helm2":"#c94a3a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_2_py", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_2_py","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"y","dir":1,"L":30,"W":10,"H":36,"col":"#e8e2d0","shirt":"#5aa56a","helm":"#d9a53c","helm2":"#c94a3a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_2_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_2_ny","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"y","dir":-1,"L":30,"W":10,"H":36,"col":"#e8e2d0","shirt":"#5aa56a","helm":"#d9a53c","helm2":"#c94a3a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_3_px", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_3_px","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":"#5aa56a","axis":"x","dir":1,"L":30,"W":10,"H":36,"col":"#23252b","shirt":"#e8e2d0","helm":"#3a6bb5","helm2":"#4a9a5a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_3_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_3_nx","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":"#5aa56a","axis":"x","dir":-1,"L":30,"W":10,"H":36,"col":"#23252b","shirt":"#e8e2d0","helm":"#3a6bb5","helm2":"#4a9a5a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_3_py", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_3_py","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":"#5aa56a","axis":"y","dir":1,"L":30,"W":10,"H":36,"col":"#23252b","shirt":"#e8e2d0","helm":"#3a6bb5","helm2":"#4a9a5a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_3_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_3_ny","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":"#5aa56a","axis":"y","dir":-1,"L":30,"W":10,"H":36,"col":"#23252b","shirt":"#e8e2d0","helm":"#3a6bb5","helm2":"#4a9a5a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_4_px", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_4_px","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"x","dir":1,"L":30,"W":10,"H":36,"col":"#e3a82c","shirt":"#3a6bb5","helm":"#c94a3a","helm2":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_4_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_4_nx","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"x","dir":-1,"L":30,"W":10,"H":36,"col":"#e3a82c","shirt":"#3a6bb5","helm":"#c94a3a","helm2":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_4_py", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_4_py","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"y","dir":1,"L":30,"W":10,"H":36,"col":"#e3a82c","shirt":"#3a6bb5","helm":"#c94a3a","helm2":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_4_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_4_ny","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"y","dir":-1,"L":30,"W":10,"H":36,"col":"#e3a82c","shirt":"#3a6bb5","helm":"#c94a3a","helm2":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_5_px", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_5_px","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"x","dir":1,"L":30,"W":10,"H":36,"col":"#2f8f59","shirt":"#c94a3a","helm":"#4a9a5a","helm2":"#23252b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_5_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_5_nx","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"x","dir":-1,"L":30,"W":10,"H":36,"col":"#2f8f59","shirt":"#c94a3a","helm":"#4a9a5a","helm2":"#23252b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_5_py", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_5_py","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"y","dir":1,"L":30,"W":10,"H":36,"col":"#2f8f59","shirt":"#c94a3a","helm":"#4a9a5a","helm2":"#23252b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mo_5_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"mo_5_ny","kind":"vehicle","group":"moto","type":"moto","rider":1,"pillion":null,"axis":"y","dir":-1,"L":30,"W":10,"H":36,"col":"#2f8f59","shirt":"#c94a3a","helm":"#4a9a5a","helm2":"#23252b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_0_x", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_0_x","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"x","dir":1,"L":30,"W":10,"H":20,"col":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_0_y", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_0_y","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"y","dir":1,"L":30,"W":10,"H":20,"col":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_1_x", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_1_x","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"x","dir":1,"L":30,"W":10,"H":20,"col":"#2f62c9"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_1_y", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_1_y","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"y","dir":1,"L":30,"W":10,"H":20,"col":"#2f62c9"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_2_x", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_2_x","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"x","dir":1,"L":30,"W":10,"H":20,"col":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_2_y", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_2_y","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"y","dir":1,"L":30,"W":10,"H":20,"col":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_3_x", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_3_x","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"x","dir":1,"L":30,"W":10,"H":20,"col":"#23252b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_3_y", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_3_y","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"y","dir":1,"L":30,"W":10,"H":20,"col":"#23252b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_4_x", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_4_x","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"x","dir":1,"L":30,"W":10,"H":20,"col":"#e3a82c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_4_y", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_4_y","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"y","dir":1,"L":30,"W":10,"H":20,"col":"#e3a82c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_5_x", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_5_x","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"x","dir":1,"L":30,"W":10,"H":20,"col":"#2f8f59"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("mop_5_y", { w: 44, h: 60 }, (c) => { const s = {"name":"mop_5_y","kind":"vehicle","group":"moto_parked","type":"moto","rider":0,"axis":"y","dir":1,"L":30,"W":10,"H":20,"col":"#2f8f59"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_0_px", { w: 92, h: 90 }, (c) => { const s = {"name":"car_0_px","kind":"vehicle","group":"car","type":"car","axis":"x","dir":1,"L":62,"W":26,"H":26,"col":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_0_nx", { w: 92, h: 90 }, (c) => { const s = {"name":"car_0_nx","kind":"vehicle","group":"car","type":"car","axis":"x","dir":-1,"L":62,"W":26,"H":26,"col":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_0_py", { w: 92, h: 90 }, (c) => { const s = {"name":"car_0_py","kind":"vehicle","group":"car","type":"car","axis":"y","dir":1,"L":62,"W":26,"H":26,"col":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_0_ny", { w: 92, h: 90 }, (c) => { const s = {"name":"car_0_ny","kind":"vehicle","group":"car","type":"car","axis":"y","dir":-1,"L":62,"W":26,"H":26,"col":"#e8e2d0"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_1_px", { w: 92, h: 90 }, (c) => { const s = {"name":"car_1_px","kind":"vehicle","group":"car","type":"car","axis":"x","dir":1,"L":62,"W":26,"H":26,"col":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_1_nx", { w: 92, h: 90 }, (c) => { const s = {"name":"car_1_nx","kind":"vehicle","group":"car","type":"car","axis":"x","dir":-1,"L":62,"W":26,"H":26,"col":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_1_py", { w: 92, h: 90 }, (c) => { const s = {"name":"car_1_py","kind":"vehicle","group":"car","type":"car","axis":"y","dir":1,"L":62,"W":26,"H":26,"col":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_1_ny", { w: 92, h: 90 }, (c) => { const s = {"name":"car_1_ny","kind":"vehicle","group":"car","type":"car","axis":"y","dir":-1,"L":62,"W":26,"H":26,"col":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_2_px", { w: 92, h: 90 }, (c) => { const s = {"name":"car_2_px","kind":"vehicle","group":"car","type":"car","axis":"x","dir":1,"L":62,"W":26,"H":26,"col":"#2f62c9"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_2_nx", { w: 92, h: 90 }, (c) => { const s = {"name":"car_2_nx","kind":"vehicle","group":"car","type":"car","axis":"x","dir":-1,"L":62,"W":26,"H":26,"col":"#2f62c9"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_2_py", { w: 92, h: 90 }, (c) => { const s = {"name":"car_2_py","kind":"vehicle","group":"car","type":"car","axis":"y","dir":1,"L":62,"W":26,"H":26,"col":"#2f62c9"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_2_ny", { w: 92, h: 90 }, (c) => { const s = {"name":"car_2_ny","kind":"vehicle","group":"car","type":"car","axis":"y","dir":-1,"L":62,"W":26,"H":26,"col":"#2f62c9"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_3_px", { w: 92, h: 90 }, (c) => { const s = {"name":"car_3_px","kind":"vehicle","group":"car","type":"car","axis":"x","dir":1,"L":62,"W":26,"H":26,"col":"#e3a82c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_3_nx", { w: 92, h: 90 }, (c) => { const s = {"name":"car_3_nx","kind":"vehicle","group":"car","type":"car","axis":"x","dir":-1,"L":62,"W":26,"H":26,"col":"#e3a82c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_3_py", { w: 92, h: 90 }, (c) => { const s = {"name":"car_3_py","kind":"vehicle","group":"car","type":"car","axis":"y","dir":1,"L":62,"W":26,"H":26,"col":"#e3a82c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_3_ny", { w: 92, h: 90 }, (c) => { const s = {"name":"car_3_ny","kind":"vehicle","group":"car","type":"car","axis":"y","dir":-1,"L":62,"W":26,"H":26,"col":"#e3a82c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_4_px", { w: 92, h: 90 }, (c) => { const s = {"name":"car_4_px","kind":"vehicle","group":"car","type":"car","axis":"x","dir":1,"L":62,"W":26,"H":26,"col":"#4a7d5c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_4_nx", { w: 92, h: 90 }, (c) => { const s = {"name":"car_4_nx","kind":"vehicle","group":"car","type":"car","axis":"x","dir":-1,"L":62,"W":26,"H":26,"col":"#4a7d5c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_4_py", { w: 92, h: 90 }, (c) => { const s = {"name":"car_4_py","kind":"vehicle","group":"car","type":"car","axis":"y","dir":1,"L":62,"W":26,"H":26,"col":"#4a7d5c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("car_4_ny", { w: 92, h: 90 }, (c) => { const s = {"name":"car_4_ny","kind":"vehicle","group":"car","type":"car","axis":"y","dir":-1,"L":62,"W":26,"H":26,"col":"#4a7d5c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_a_px", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_a_px","kind":"vehicle","group":"bus","type":"bus","axis":"x","dir":1,"L":122,"W":32,"H":50,"col":"#efe6d2","band":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_a_nx", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_a_nx","kind":"vehicle","group":"bus","type":"bus","axis":"x","dir":-1,"L":122,"W":32,"H":50,"col":"#efe6d2","band":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_a_py", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_a_py","kind":"vehicle","group":"bus","type":"bus","axis":"y","dir":1,"L":122,"W":32,"H":50,"col":"#efe6d2","band":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_a_ny", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_a_ny","kind":"vehicle","group":"bus","type":"bus","axis":"y","dir":-1,"L":122,"W":32,"H":50,"col":"#efe6d2","band":"#d93a2b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_b_px", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_b_px","kind":"vehicle","group":"bus","type":"bus","axis":"x","dir":1,"L":122,"W":32,"H":50,"col":"#f2c23c","band":"#a3202a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_b_nx", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_b_nx","kind":"vehicle","group":"bus","type":"bus","axis":"x","dir":-1,"L":122,"W":32,"H":50,"col":"#f2c23c","band":"#a3202a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_b_py", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_b_py","kind":"vehicle","group":"bus","type":"bus","axis":"y","dir":1,"L":122,"W":32,"H":50,"col":"#f2c23c","band":"#a3202a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_b_ny", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_b_ny","kind":"vehicle","group":"bus","type":"bus","axis":"y","dir":-1,"L":122,"W":32,"H":50,"col":"#f2c23c","band":"#a3202a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_c_px", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_c_px","kind":"vehicle","group":"bus","type":"bus","axis":"x","dir":1,"L":122,"W":32,"H":50,"col":"#e8f0e0","band":"#2f7a58"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_c_nx", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_c_nx","kind":"vehicle","group":"bus","type":"bus","axis":"x","dir":-1,"L":122,"W":32,"H":50,"col":"#e8f0e0","band":"#2f7a58"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_c_py", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_c_py","kind":"vehicle","group":"bus","type":"bus","axis":"y","dir":1,"L":122,"W":32,"H":50,"col":"#e8f0e0","band":"#2f7a58"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("bus_c_ny", { w: 158, h: 147 }, (c) => { const s = {"name":"bus_c_ny","kind":"vehicle","group":"bus","type":"bus","axis":"y","dir":-1,"L":122,"W":32,"H":50,"col":"#e8f0e0","band":"#2f7a58"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("loco_px", { w: 154, h: 141 }, (c) => { const s = {"name":"loco_px","kind":"vehicle","group":"loco","type":"loco","axis":"x","dir":1,"L":118,"W":32,"H":46,"col":"#2f5fa8","band":"#f2c23c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("loco_nx", { w: 154, h: 141 }, (c) => { const s = {"name":"loco_nx","kind":"vehicle","group":"loco","type":"loco","axis":"x","dir":-1,"L":118,"W":32,"H":46,"col":"#2f5fa8","band":"#f2c23c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("coach_px", { w: 168, h: 142 }, (c) => { const s = {"name":"coach_px","kind":"vehicle","group":"coach","type":"coach","axis":"x","dir":1,"L":132,"W":32,"H":40,"col":"#ece7da","band":"#2f5fa8"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("lm_gate", { w: 292, h: 328 }, (c) => { const s = {"name":"lm_gate","kind":"gate","group":"landmark","w":1,"d":7,"hup":180}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("lm_bridge", { w: 112, h: 98 }, (c) => { const s = {"name":"lm_bridge","kind":"bridge","group":"landmark","w":1,"d":2,"z":9,"hup":40}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("lm_bridge_gate", { w: 154, h: 134 }, (c) => { const s = {"name":"lm_bridge_gate","kind":"bridge_gate","group":"landmark","w":150,"h":130,"px":92,"py":86}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("lm_temple", { w: 220, h: 252 }, (c) => { const s = {"name":"lm_temple","kind":"temple","group":"landmark","w":3,"d":3,"hup":140}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("lm_turtle", { w: 76, h: 190 }, (c) => { const s = {"name":"lm_turtle","kind":"turtle_tower","group":"landmark","w":1,"d":1,"hup":150}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_lamp", { w: 124, h: 122 }, (c) => { const s = {"name":"p_lamp","kind":"prop","group":"prop","type":"lamp","w":120,"h":118,"px":60,"py":90}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_pole", { w: 124, h: 144 }, (c) => { const s = {"name":"p_pole","kind":"prop","group":"prop","type":"pole","w":120,"h":140,"px":60,"py":122}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_bench_x", { w: 124, h: 144 }, (c) => { const s = {"name":"p_bench_x","kind":"prop","group":"prop","type":"bench","w":120,"h":140,"px":60,"py":112,"axis":"x"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_bench_y", { w: 124, h: 144 }, (c) => { const s = {"name":"p_bench_y","kind":"prop","group":"prop","type":"bench","w":120,"h":140,"px":60,"py":112,"axis":"y"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_bin", { w: 124, h: 144 }, (c) => { const s = {"name":"p_bin","kind":"prop","group":"prop","type":"bin","w":120,"h":140,"px":60,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_shelter_x", { w: 154, h: 144 }, (c) => { const s = {"name":"p_shelter_x","kind":"prop","group":"prop","type":"shelter","w":150,"h":140,"px":60,"py":112,"axis":"x"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_shelter_y", { w: 154, h: 144 }, (c) => { const s = {"name":"p_shelter_y","kind":"prop","group":"prop","type":"shelter","w":150,"h":140,"px":60,"py":112,"axis":"y"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_pho", { w: 124, h: 144 }, (c) => { const s = {"name":"p_pho","kind":"prop","group":"prop","type":"pho","w":120,"h":140,"px":60,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_banhmi", { w: 124, h: 144 }, (c) => { const s = {"name":"p_banhmi","kind":"prop","group":"prop","type":"banhmi","w":120,"h":140,"px":60,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_fruit", { w: 124, h: 144 }, (c) => { const s = {"name":"p_fruit","kind":"prop","group":"prop","type":"fruit","w":120,"h":140,"px":60,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_umb_red", { w: 124, h: 144 }, (c) => { const s = {"name":"p_umb_red","kind":"prop","group":"prop","type":"umbrella","w":120,"h":140,"px":60,"py":112,"cols":["#d4382c","#efe6d2"],"goods":["#e0a52a","#d4382c","#7aa57a"]}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_umb_yellow", { w: 124, h: 144 }, (c) => { const s = {"name":"p_umb_yellow","kind":"prop","group":"prop","type":"umbrella","w":120,"h":140,"px":60,"py":112,"cols":["#f2c23c","#fbf6e8"],"goods":["#d4382c","#7aa57a","#e08a2a"]}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_umb_teal", { w: 124, h: 144 }, (c) => { const s = {"name":"p_umb_teal","kind":"prop","group":"prop","type":"umbrella","w":120,"h":140,"px":60,"py":112,"cols":["#3f8f7b","#fbf6e8"],"goods":["#e0a52a","#d9629a","#7aa57a"]}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_umb_orange", { w: 124, h: 144 }, (c) => { const s = {"name":"p_umb_orange","kind":"prop","group":"prop","type":"umbrella","w":120,"h":140,"px":60,"py":112,"cols":["#e08a2a","#efe6d2"],"goods":["#7aa57a","#d4382c","#e0a52a"]}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_cafe_red", { w: 124, h: 144 }, (c) => { const s = {"name":"p_cafe_red","kind":"prop","group":"prop","type":"cafe","w":120,"h":140,"px":60,"py":112,"col":"#d4382c"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_cafe_green", { w: 124, h: 144 }, (c) => { const s = {"name":"p_cafe_green","kind":"prop","group":"prop","type":"cafe","w":120,"h":140,"px":60,"py":112,"col":"#2f7a58"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_stools", { w: 124, h: 144 }, (c) => { const s = {"name":"p_stools","kind":"prop","group":"prop","type":"stools","w":120,"h":140,"px":60,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_kiosk", { w: 124, h: 144 }, (c) => { const s = {"name":"p_kiosk","kind":"prop","group":"prop","type":"kiosk","w":120,"h":140,"px":60,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_cyclo", { w: 124, h: 144 }, (c) => { const s = {"name":"p_cyclo","kind":"prop","group":"prop","type":"cyclo","w":120,"h":140,"px":60,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_planter", { w: 124, h: 144 }, (c) => { const s = {"name":"p_planter","kind":"prop","group":"prop","type":"planter","w":120,"h":140,"px":60,"py":112}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_flagpole", { w: 124, h: 144 }, (c) => { const s = {"name":"p_flagpole","kind":"prop","group":"prop","type":"flagpole","w":120,"h":140,"px":60,"py":100}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_barrier_p_a", { w: 154, h: 132 }, (c) => { const s = {"name":"p_barrier_p_a","kind":"prop","group":"prop","type":"barrier","w":150,"h":128,"px":28,"py":82,"dir":1,"state":"a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_barrier_p_b", { w: 154, h: 132 }, (c) => { const s = {"name":"p_barrier_p_b","kind":"prop","group":"prop","type":"barrier","w":150,"h":128,"px":28,"py":82,"dir":1,"state":"b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_barrier_p_up", { w: 154, h: 132 }, (c) => { const s = {"name":"p_barrier_p_up","kind":"prop","group":"prop","type":"barrier","w":150,"h":128,"px":28,"py":82,"dir":1,"state":"up"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_barrier_n_a", { w: 154, h: 132 }, (c) => { const s = {"name":"p_barrier_n_a","kind":"prop","group":"prop","type":"barrier","w":150,"h":128,"px":122,"py":82,"dir":-1,"state":"a"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_barrier_n_b", { w: 154, h: 132 }, (c) => { const s = {"name":"p_barrier_n_b","kind":"prop","group":"prop","type":"barrier","w":150,"h":128,"px":122,"py":82,"dir":-1,"state":"b"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
sprite("p_barrier_n_up", { w: 154, h: 132 }, (c) => { const s = {"name":"p_barrier_n_up","kind":"prop","group":"prop","type":"barrier","w":150,"h":128,"px":122,"py":82,"dir":-1,"state":"up"}; const L = LAYOUT[s.kind](s); const { cv, I } = newSprite(L); DRAW[s.kind](cv, s, I, L); if (s.outline) cv.outline(s.outline); cv.commit(c) })
