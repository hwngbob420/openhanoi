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

const PAL = __PAL__
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
