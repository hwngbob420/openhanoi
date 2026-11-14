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

// ───────── chữ pixel 3x5 (có dấu tiếng Việt) để viết biển hiệu ─────────
const FONT = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.', E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..',
  G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#', I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
  M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..', Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#',
  S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.', U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###', 'Đ': '##.|###|#.#|#.#|##.',
  0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.', 4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.',
  6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.', 8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.', '-': '...|...|###|...|...', '.': '...|...|...|...|.#.', '&': '.#.|#.#|.#.|#.#|.##', ' ': '...|...|...|...|...',
}
// tách thành cụm "chữ cái + dấu"
function glyphClusters(str) {
  const out = []
  for (const ch of str.normalize('NFD')) { if (/[̀-ͯ]/.test(ch)) { if (out.length) out[out.length - 1].m.push(ch) } else out.push({ c: ch.toUpperCase(), m: [] }) }
  return out
}
const textLen = (str) => glyphClusters(str).length * 4 - 1
// vẽ 1 chữ tại (a, z) trên mặt F ('R' mặt x=const, ngang theo y ngược chiều; 'L' mặt y=const, ngang theo x). sc = kích thước 1 điểm (u)
function drawGlyph(I, F, P, a, z, cl, col, sc) {
  const g = (FONT[cl.c] || FONT[' ']).split('|'), d = F === 'R' ? -1 : 1
  const px = (k, r) => { const a0 = a + d * k * sc, a1 = a0 + d * sc, z0 = z + r * sc; if (F === 'R') I.fR(P, a0, a1, z0, z0 + sc, col); else I.fL(P, a0, a1, z0, z0 + sc, col) }
  for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r][k] === '#') px(k, 4 - r)
  for (const m of cl.m) {                                   // dấu mũ/râu ở hàng 5, dấu thanh ở hàng 6, nặng ở dưới
    if (m === '̂') { px(0, 5); px(2, 5) } else if (m === '̆') { px(0, 5); px(1, 5); px(2, 5) } else if (m === '̛') { px(3, 3) }
    else if (m === '́') px(2, 6); else if (m === '̀') px(0, 6); else if (m === '̉') px(1, 6); else if (m === '̃') { px(0, 6); px(2, 6) } else if (m === '̣') px(1, -1)
  }
  if (cl.c === 'Đ') { /* gạch ngang đã có trong glyph */ }
}
// chữ ngang, aLeft = toạ độ (theo hệ mặt) của đầu TRÁI trên màn hình; z = chân chữ
function drawText(I, F, P, aLeft, z, str, col, sc = 1) {
  let a = aLeft; const d = F === 'R' ? -1 : 1
  for (const cl of glyphClusters(str)) { drawGlyph(I, F, P, a, z, cl, col, sc); a += d * 4 * sc }
}
// chữ dọc (biển dọc): mỗi chữ một hàng, từ trên xuống
function drawVText(I, F, P, a, zTop, str, col) {
  let z = zTop - 5
  for (const cl of glyphClusters(str.replace(/ /g, ''))) { drawGlyph(I, F, P, a, z, cl, col, 1); z -= cl.m.length ? 8 : 6 }
}
const SIGN_TEXTS = ['PHỞ BÒ', 'BÚN CHẢ', 'CÀ PHÊ', 'BÁNH MÌ', 'TẠP HÓA', 'THUỐC', 'ĐIỆN THOẠI', 'HOA TƯƠI', 'MAY ĐO', 'NHÀ HÀNG', 'CƠM PHỞ', 'CHÈ KEM', 'VÀNG BẠC', 'SÁCH', 'XE ĐẠP', 'TRÀ ĐÁ', 'SPA', 'NỘI THẤT', 'BÁNH CỐM', 'QUÀ TẶNG', 'ĐỒNG HỒ', 'MÌ VẰN THẮN', 'NEM RÁN', 'CHẢ CÁ']
const BLADE_TEXTS = ['PHỞ', 'CAFE', 'BÚN', 'SPA', 'THUỐC', 'LỘC', 'CƠM', 'TRÀ', 'KEM', 'HOA', 'BÁNH', 'MỲ']
const lumaOf = (c) => { const [r, g, b] = hex2rgb(c); return 0.3 * r + 0.59 * g + 0.11 * b }

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

// Thư viện vẽ người ngồi xe máy (paper-doll) bằng cùng lõi isometric của thế giới (core.js + vehicles.js nối trước file này).
// Mỗi sprite có CÙNG kích thước và tâm với mo_<màu>_<hướng> của thế giới (44x76, pivot như manifest) nên thay thế trực tiếp được.
// Lớp: back (thân xe phía sau người) -> legs -> torso (thân + tay) -> head (đầu, da) -> hair -> front (tay lái, đầu xe che trước).
// KHÔNG viền ở đây: viền (dark 0.5 màu kề) được vẽ lúc chạy trên ảnh đã ghép, để các lớp ăn khớp.
DRAW.seat = (cv, s, I) => {
  const { B, parts } = vehBuilder(s), L = s.L, c = s.col
  const WHEEL = { top: '#3a4556', left: '#262d3a', right: '#1c1822' }
  const TAIL = { top: '#e0463a', left: '#d4382c', right: '#a3202a' }
  const tagOf = new Map()
  const grp = (name, fn) => { const n = parts.length; fn(); for (let i = n; i < parts.length; i++) tagOf.set(parts[i], name) }
  grp('bike', () => {
    B(2, 9, 4, 6, 0, 9, null, WHEEL); B(L - 8, L - 2, 4, 6, 0, 9, null, WHEEL)
    B(7, L - 8, 3, 7, 5, 10, null, faceCols(dark(c, 0.15)))
    B(L - 12, L - 3, 2, 8, 9, 17, null, faceCols(c))
    B(L - 5, L - 4, 0, 10, 16, 18, null, faceCols('#23252b'))
    B(5, 14, 3, 7, 10, 12, null, faceCols('#23252b'))
    B(-1, 2, 4, 6, 8, 10, null, TAIL)
  })
  const pantsC = s.pants, topC = s.top, skin = '#f0c49a'
  grp('legs', () => B(8, 15, 2, 8, 11, 17, null, faceCols(pantsC)))
  grp('torso', () => {
    B(6, 13, 3, 7, 17, 27, null, faceCols(topC))
    if (s.long) { B(L - 13, L - 6, 1, 3, 17, 25, null, faceCols(topC)); B(L - 13, L - 6, 7, 9, 17, 25, null, faceCols(topC)) }
    else {
      B(L - 13, L - 6, 1, 3, 17, 22, null, faceCols(skin)); B(L - 13, L - 6, 7, 9, 17, 22, null, faceCols(skin))
      B(L - 13, L - 10, 1, 3, 22, 25, null, faceCols(topC)); B(L - 13, L - 10, 7, 9, 22, 25, null, faceCols(topC))
    }
    if (s.hood) B(6, 8.5, 3, 7, 27, 29, null, faceCols(dark(topC, 0.15)))
  })
  grp('head', () => {
    B(6, 13, 2.5, 7.5, 27, 33, null, faceCols(skin))
    B(12.6, 13.4, 3, 7, 28.5, 29.5, null, faceCols('#d4a07a'))                       // mũi/miệng mờ
    B(12.6, 13.4, 3.4, 4.2, 30, 31, null, faceCols('#1c1a1f')); B(12.6, 13.4, 5.8, 6.6, 30, 31, null, faceCols('#1c1a1f'))   // mắt
  })
  grp('hair', () => {
    B(5.5, 13.5, 2, 8, 33, 35.5, null, faceCols(s.hair))
    B(5.5, 9.5, 2, 8, 27, 33, null, faceCols(s.hair))
    B(9.5, 13.5, 2, 3, 30, 33, null, faceCols(s.hair)); B(9.5, 13.5, 7, 8, 30, 33, null, faceCols(s.hair))
    B(12, 13.7, 3, 7.5, 32.2, 33.5, null, faceCols(dark(s.hair, 0.12)))              // mái
  })
  // thứ tự vẽ chuẩn của thế giới
  const cmp = (a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]
  const torso = parts.find((p) => tagOf.get(p) === 'torso')
  const sorted = parts.slice().sort(cmp)
  const pick = (name) => {
    if (name === 'back') return sorted.filter((p) => tagOf.get(p) === 'bike' && cmp(p, torso) <= 0)
    if (name === 'front') return sorted.filter((p) => tagOf.get(p) === 'bike' && cmp(p, torso) > 0)
    return sorted.filter((p) => tagOf.get(p) === name)
  }
  const want = s.layer === 'all' ? ['back', 'legs', 'torso', 'head', 'hair', 'front'] : [s.layer]
  for (const w of want) for (const p of pick(w)) { const [x0, y0, z0, x1, y1, z1, col, cols] = p; I.box(x0, y0, z0, x1, y1, z1, col, cols) }
}

sprite("seat_bikeback_0_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_0_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_0_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_0_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_1_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_1_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f62c9","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_1_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_1_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f62c9","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_2_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_2_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#e8e2d0","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_2_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_2_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#e8e2d0","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_3_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_3_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#23252b","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_3_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_3_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#23252b","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_4_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_4_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#e3a82c","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_4_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_4_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#e3a82c","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_5_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_5_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f8f59","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_5_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_5_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f8f59","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_0_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_0_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#3d4c7a","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_1_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_1_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#363a42","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_2_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_2_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#b99d68","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_0_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_0_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#b8503a","long":0,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_1_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_1_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#ece6d6","long":1,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_2_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_2_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#3f6fb0","long":1,"hood":1,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_3_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_3_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#3a8f8a","long":0,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_head_0_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_head_0_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"head","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_0_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_0_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#2b2230"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_1_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_1_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#6e3d25"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_2_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_2_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#d5581f"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_3_px", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_3_px","kind":"vehicle","axis":"x","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#6f909c"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_0_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_0_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_0_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_0_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_1_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_1_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f62c9","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_1_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_1_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f62c9","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_2_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_2_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#e8e2d0","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_2_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_2_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#e8e2d0","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_3_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_3_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#23252b","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_3_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_3_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#23252b","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_4_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_4_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#e3a82c","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_4_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_4_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#e3a82c","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_5_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_5_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f8f59","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_5_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_5_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f8f59","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_0_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_0_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#3d4c7a","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_1_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_1_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#363a42","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_2_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_2_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#b99d68","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_0_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_0_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#b8503a","long":0,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_1_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_1_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#ece6d6","long":1,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_2_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_2_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#3f6fb0","long":1,"hood":1,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_3_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_3_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#3a8f8a","long":0,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_head_0_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_head_0_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"head","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_0_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_0_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#2b2230"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_1_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_1_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#6e3d25"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_2_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_2_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#d5581f"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_3_nx", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_3_nx","kind":"vehicle","axis":"x","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#6f909c"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_0_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_0_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_0_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_0_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_1_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_1_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f62c9","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_1_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_1_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f62c9","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_2_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_2_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#e8e2d0","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_2_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_2_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#e8e2d0","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_3_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_3_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#23252b","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_3_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_3_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#23252b","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_4_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_4_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#e3a82c","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_4_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_4_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#e3a82c","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_5_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_5_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f8f59","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_5_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_5_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f8f59","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_0_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_0_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#3d4c7a","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_1_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_1_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#363a42","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_2_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_2_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#b99d68","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_0_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_0_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#b8503a","long":0,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_1_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_1_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#ece6d6","long":1,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_2_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_2_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#3f6fb0","long":1,"hood":1,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_3_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_3_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#3a8f8a","long":0,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_head_0_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_head_0_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"head","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_0_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_0_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#2b2230"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_1_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_1_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#6e3d25"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_2_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_2_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#d5581f"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_3_py", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_3_py","kind":"vehicle","axis":"y","dir":1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#6f909c"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_0_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_0_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_0_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_0_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_1_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_1_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f62c9","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_1_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_1_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f62c9","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_2_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_2_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#e8e2d0","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_2_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_2_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#e8e2d0","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_3_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_3_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#23252b","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_3_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_3_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#23252b","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_4_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_4_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#e3a82c","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_4_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_4_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#e3a82c","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikeback_5_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikeback_5_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f8f59","layer":"back","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_bikefront_5_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_bikefront_5_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#2f8f59","layer":"front","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_0_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_0_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#3d4c7a","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_1_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_1_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#363a42","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_legs_2_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_legs_2_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"legs","pants":"#b99d68","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_0_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_0_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#b8503a","long":0,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_1_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_1_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#ece6d6","long":1,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_2_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_2_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#3f6fb0","long":1,"hood":1,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_torso_3_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_torso_3_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"torso","pants":"#000","top":"#3a8f8a","long":0,"hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_head_0_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_head_0_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"head","pants":"#000","top":"#000","hair":"#000"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_0_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_0_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#2b2230"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_1_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_1_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#6e3d25"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_2_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_2_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#d5581f"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
sprite("seat_hair_3_ny", { w: 44, h: 76 }, (c) => { const s = {"name":"seat_hair_3_ny","kind":"vehicle","axis":"y","dir":-1,"L":30,"W":10,"H":36,"rider":1,"col":"#d93a2b","layer":"hair","pants":"#000","top":"#000","hair":"#6f909c"}; const L = LAYOUT.vehicle(s); const { cv, I } = newSprite(L); DRAW.seat(cv, s, I); if (s.outlineAll) cv.outline(s.outlineAll); cv.commit(c) })
